const educationRepository = require('../repositories/educationRepository');
const { createEducationUploadSignature } = require('./educationUploadService');
const { createHttpError } = require('../utils/httpError');
const { buildPagination, normalizePaginationInput } = require('../utils/pagination');
const { decodeCursor, encodeCursor } = require('../utils/cursor');
const { assertAdminScope } = require('./shared/guards');
const {
  EDUCATION_ARTICLE_STATUSES,
  EDUCATION_REVISION_STATUSES,
  EDUCATION_COMMENT_STATUSES,
  EDUCATION_SORTS,
} = require('../constants/educationEnums');

function assertAuthenticatedActor(actor) {
  if (!actor?.userId) {
    throw createHttpError('Token tidak valid', 401);
  }
}

async function resolveCategoryId(input) {
  if (input.categoryId) {
    const category = await educationRepository.findCategoryById(input.categoryId);
    if (!category || !category.isActive) {
      throw createHttpError('Kategori artikel tidak ditemukan', 404);
    }
    return category.categoryId;
  }

  if (input.categorySlug) {
    const category = await educationRepository.findCategoryBySlug(input.categorySlug);
    if (!category || !category.isActive) {
      throw createHttpError('Kategori artikel tidak ditemukan', 404);
    }
    return category.categoryId;
  }

  throw createHttpError('Kategori artikel wajib dipilih', 400);
}

function buildFeedCursor(sort, row) {
  if (!row) {
    return null;
  }

  if (sort === EDUCATION_SORTS.POPULAR) {
    return encodeCursor({
      likeCount: Number(row.likeCount || 0),
      publishedAt: row.publishedAt,
      articleId: row.articleId,
    });
  }

  return encodeCursor({
    publishedAt: row.publishedAt,
    articleId: row.articleId,
  });
}

function buildCommentCursor(row) {
  if (!row) {
    return null;
  }

  return encodeCursor({
    createdAt: row.createdAt,
    commentId: row.commentId,
  });
}

function ensureOwnArticleAccess(article, actor) {
  if (!article) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }

  if (article.authorUserId !== actor.userId) {
    throw createHttpError('Akses artikel ditolak', 403);
  }
}

function canAdminManageArticle(actor) {
  return actor?.role === 'admin';
}

function ensureManageArticleAccess(article, actor) {
  if (!article) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }

  if (canAdminManageArticle(actor)) {
    return;
  }

  ensureOwnArticleAccess(article, actor);
}

function ensurePublishedArticle(article) {
  if (!article || article.status !== EDUCATION_ARTICLE_STATUSES.PUBLISHED) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }
}

function ensureValidFeedCursor(cursor, sort) {
  if (!cursor) {
    return null;
  }

  const decoded = decodeCursor(cursor);
  if (!decoded) {
    throw createHttpError('Cursor tidak valid', 400);
  }

  if (sort === EDUCATION_SORTS.POPULAR) {
    if (
      decoded.likeCount === undefined ||
      decoded.likeCount === null ||
      !decoded.publishedAt ||
      !decoded.articleId
    ) {
      throw createHttpError('Cursor tidak valid', 400);
    }
  } else if (!decoded.publishedAt || !decoded.articleId) {
    throw createHttpError('Cursor tidak valid', 400);
  }

  return decoded;
}

async function listCategories() {
  return educationRepository.listActiveCategories();
}

async function listTags() {
  return educationRepository.listTags();
}

async function getUploadSignature({ actor, query }) {
  assertAuthenticatedActor(actor);
  return createEducationUploadSignature(query.kind);
}

async function createArticle({ actor, payload }) {
  assertAuthenticatedActor(actor);
  const categoryId = await resolveCategoryId(payload);

  return educationRepository.createArticleDraft({
    authorUserId: actor.userId,
    categoryId,
    title: payload.title,
    excerpt: payload.excerpt || null,
    contentMarkdown: payload.contentMarkdown,
    coverImageUrl: payload.coverImageUrl || null,
    coverImagePublicId: payload.coverImagePublicId || null,
    tagLabels: payload.tags || [],
  });
}

async function getMyArticleDetail({ actor, articleId }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  ensureOwnArticleAccess(article, actor);
  return article;
}

async function updateArticle({ actor, articleId, payload }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  ensureManageArticleAccess(article, actor);
  const categoryId = await resolveCategoryId(payload);
  const authorUserId = article.authorUserId;

  if (article.status === EDUCATION_ARTICLE_STATUSES.PUBLISHED) {
    return educationRepository.createOrReplacePendingRevision({
      articleId,
      authorUserId,
      categoryId,
      title: payload.title,
      excerpt: payload.excerpt || null,
      contentMarkdown: payload.contentMarkdown,
      coverImageUrl: payload.coverImageUrl || null,
      coverImagePublicId: payload.coverImagePublicId || null,
      tagLabels: payload.tags || [],
    });
  }

  return educationRepository.updateOwnArticleDraft({
    articleId,
    authorUserId,
    categoryId,
    title: payload.title,
    excerpt: payload.excerpt || null,
    contentMarkdown: payload.contentMarkdown,
    coverImageUrl: payload.coverImageUrl || null,
    coverImagePublicId: payload.coverImagePublicId || null,
    tagLabels: payload.tags || [],
  });
}

async function submitArticleReview({ actor, articleId }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  ensureOwnArticleAccess(article, actor);

  if (article.status === EDUCATION_ARTICLE_STATUSES.PUBLISHED) {
    throw createHttpError(
      'Artikel yang sudah published menggunakan alur revisi, bukan submit review draft',
      409
    );
  }

  return educationRepository.submitArticleForReview({
    articleId,
    authorUserId: actor.userId,
  });
}

async function listMyArticles({ actor, query }) {
  assertAuthenticatedActor(actor);
  const pagination = normalizePaginationInput(query, { page: 1, limit: 10 });
  const result = await educationRepository.listMyArticles({
    authorUserId: actor.userId,
    page: pagination.page,
    limit: pagination.limit,
    status: query.status || null,
  });

  return {
    items: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function listAdminArticles({ actor, query }) {
  assertAdminScope({ actor });
  const pagination = normalizePaginationInput(query, { page: 1, limit: 20 });
  const result = await educationRepository.listAdminArticles({
    page: pagination.page,
    limit: pagination.limit,
    status: query.status || null,
    q: query.q || null,
  });

  return {
    items: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function listPublishedArticles({ actor, query }) {
  assertAuthenticatedActor(actor);
  const sort =
    query.sort && Object.values(EDUCATION_SORTS).includes(query.sort)
      ? query.sort
      : EDUCATION_SORTS.LATEST;
  const limit = Math.min(50, Math.max(1, Number(query.limit || 10)));
  const cursor = ensureValidFeedCursor(query.cursor, sort);
  const result = await educationRepository.listPublishedArticles({
    actorUserId: actor.userId,
    categorySlug: query.category || null,
    tagSlug: query.tag || null,
    q: query.q || null,
    sort,
    cursor,
    limit,
  });

  return {
    items: result.items,
    pagination: {
      limit,
      hasMore: result.hasMore,
      nextCursor: buildFeedCursor(sort, result.next),
    },
  };
}

async function getPublishedArticleDetail({ actor, slug }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findPublishedArticleBySlug(slug, actor.userId);
  if (!article) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }

  await educationRepository.incrementArticleView(article.articleId);
  return {
    ...article,
    viewCount: Number(article.viewCount || 0) + 1,
  };
}

async function likeArticle({ actor, articleId }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  ensurePublishedArticle(article);
  await educationRepository.likeArticle({
    articleId,
    userId: actor.userId,
  });

  return {
    articleId,
    liked: true,
  };
}

async function unlikeArticle({ actor, articleId }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  ensurePublishedArticle(article);
  await educationRepository.unlikeArticle({
    articleId,
    userId: actor.userId,
  });

  return {
    articleId,
    liked: false,
  };
}

async function listComments({ actor, articleId, query }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  ensurePublishedArticle(article);
  const limit = Math.min(50, Math.max(1, Number(query.limit || 20)));
  const cursor = query.cursor ? decodeCursor(query.cursor) : null;
  if (query.cursor && (!cursor || !cursor.createdAt || !cursor.commentId)) {
    throw createHttpError('Cursor komentar tidak valid', 400);
  }

  const result = await educationRepository.listArticleComments({
    articleId,
    actorUserId: actor.userId,
    cursor,
    limit,
  });

  return {
    items: result.items,
    pagination: {
      limit,
      hasMore: result.hasMore,
      nextCursor: buildCommentCursor(result.next),
    },
  };
}

async function createComment({ actor, articleId, content }) {
  assertAuthenticatedActor(actor);
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  ensurePublishedArticle(article);

  return educationRepository.createComment({
    articleId,
    userId: actor.userId,
    content,
  });
}

async function createReply({ actor, commentId, content }) {
  assertAuthenticatedActor(actor);
  const parent = await educationRepository.findCommentById(commentId);
  if (!parent || parent.status !== EDUCATION_COMMENT_STATUSES.VISIBLE) {
    throw createHttpError('Komentar induk tidak ditemukan', 404);
  }

  if (parent.parentCommentId) {
    throw createHttpError('Balasan hanya diizinkan satu tingkat', 400);
  }

  const article = await educationRepository.findArticleById(parent.articleId, actor.userId);
  ensurePublishedArticle(article);

  return educationRepository.createComment({
    articleId: parent.articleId,
    userId: actor.userId,
    parentCommentId: parent.commentId,
    content,
  });
}

async function updateComment({ actor, commentId, content }) {
  assertAuthenticatedActor(actor);
  const comment = await educationRepository.findCommentById(commentId);
  if (!comment || comment.status === EDUCATION_COMMENT_STATUSES.DELETED) {
    throw createHttpError('Komentar tidak ditemukan', 404);
  }

  if (comment.userId !== actor.userId) {
    throw createHttpError('Akses komentar ditolak', 403);
  }

  return educationRepository.updateCommentContent(commentId, content);
}

async function deleteComment({ actor, commentId }) {
  assertAuthenticatedActor(actor);
  const comment = await educationRepository.findCommentById(commentId);
  if (!comment) {
    throw createHttpError('Komentar tidak ditemukan', 404);
  }

  if (actor.role !== 'admin' && comment.userId !== actor.userId) {
    throw createHttpError('Akses komentar ditolak', 403);
  }

  await educationRepository.markCommentDeleted(commentId);
  return {
    commentId,
    deleted: true,
  };
}

async function listPendingArticles({ actor, query }) {
  assertAdminScope({ actor });
  const pagination = normalizePaginationInput(query, { page: 1, limit: 20 });
  const result = await educationRepository.listPendingArticles({
    page: pagination.page,
    limit: pagination.limit,
  });

  return {
    items: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function getAdminArticleDetail({ actor, articleId }) {
  assertAdminScope({ actor });
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  if (!article) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }
  return article;
}

async function approveArticle({ actor, articleId }) {
  assertAdminScope({ actor });
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  if (!article) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }
  if (article.status !== EDUCATION_ARTICLE_STATUSES.PENDING_REVIEW || article.publishedAt) {
    throw createHttpError('Artikel ini bukan draft pending review', 409);
  }

  return educationRepository.approveArticle({
    articleId,
    adminId: actor.userId,
  });
}

async function rejectArticle({ actor, articleId, rejectionReason }) {
  assertAdminScope({ actor });
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  if (!article) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }
  if (article.status !== EDUCATION_ARTICLE_STATUSES.PENDING_REVIEW || article.publishedAt) {
    throw createHttpError('Artikel ini bukan draft pending review', 409);
  }

  return educationRepository.rejectArticle({
    articleId,
    adminId: actor.userId,
    rejectionReason,
  });
}

async function listPendingRevisions({ actor, query }) {
  assertAdminScope({ actor });
  const pagination = normalizePaginationInput(query, { page: 1, limit: 20 });
  const result = await educationRepository.listPendingRevisions({
    page: pagination.page,
    limit: pagination.limit,
  });

  return {
    items: result.items,
    pagination: buildPagination({
      page: pagination.page,
      limit: pagination.limit,
      totalItems: result.totalItems,
    }),
  };
}

async function approveRevision({ actor, revisionId }) {
  assertAdminScope({ actor });
  const revision = await educationRepository.findRevisionById(revisionId);
  if (!revision) {
    throw createHttpError('Revisi tidak ditemukan', 404);
  }
  if (revision.status !== EDUCATION_REVISION_STATUSES.PENDING_REVIEW) {
    throw createHttpError('Revisi ini tidak sedang menunggu review', 409);
  }

  return educationRepository.approveRevision({
    revisionId,
    adminId: actor.userId,
  });
}

async function rejectRevision({ actor, revisionId, rejectionReason }) {
  assertAdminScope({ actor });
  const revision = await educationRepository.findRevisionById(revisionId);
  if (!revision) {
    throw createHttpError('Revisi tidak ditemukan', 404);
  }
  if (revision.status !== EDUCATION_REVISION_STATUSES.PENDING_REVIEW) {
    throw createHttpError('Revisi ini tidak sedang menunggu review', 409);
  }

  return educationRepository.rejectRevision({
    revisionId,
    adminId: actor.userId,
    rejectionReason,
  });
}

async function deleteArticle({ actor, articleId }) {
  assertAdminScope({ actor });
  const article = await educationRepository.findArticleById(articleId, actor.userId);
  if (!article) {
    throw createHttpError('Artikel tidak ditemukan', 404);
  }

  return educationRepository.deleteArticleHard(articleId);
}

async function hideComment({ actor, commentId }) {
  assertAdminScope({ actor });
  const comment = await educationRepository.findCommentById(commentId);
  if (!comment) {
    throw createHttpError('Komentar tidak ditemukan', 404);
  }

  await educationRepository.hideComment({
    commentId,
    adminId: actor.userId,
  });

  return {
    commentId,
    hidden: true,
  };
}

module.exports = {
  listCategories,
  listTags,
  getUploadSignature,
  createArticle,
  getMyArticleDetail,
  updateArticle,
  submitArticleReview,
  listMyArticles,
  listAdminArticles,
  listPublishedArticles,
  getPublishedArticleDetail,
  likeArticle,
  unlikeArticle,
  listComments,
  createComment,
  createReply,
  updateComment,
  deleteComment,
  listPendingArticles,
  getAdminArticleDetail,
  approveArticle,
  rejectArticle,
  listPendingRevisions,
  approveRevision,
  rejectRevision,
  deleteArticle,
  hideComment,
};
