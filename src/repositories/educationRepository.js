const prisma = require('../config/prisma');
const {
  EDUCATION_ARTICLE_STATUSES,
  EDUCATION_ARTICLE_VISIBILITIES,
  EDUCATION_REVISION_STATUSES,
  EDUCATION_COMMENT_STATUSES,
  EDUCATION_IMAGE_KINDS,
  EDUCATION_AUTHOR_BADGES,
} = require('../constants/educationEnums');
const { slugify } = require('../utils/slug');

const ROLE_PRIORITY = {
  admin: 3,
  doctor: 2,
  patient: 1,
};

function resolveRoles(userRoles) {
  return Array.from(
    new Set(
      (userRoles || [])
        .map((item) => item?.role?.code)
        .filter(Boolean)
        .sort((left, right) => (ROLE_PRIORITY[right] || 0) - (ROLE_PRIORITY[left] || 0))
    )
  );
}

function mapAuthorSummary(user) {
  if (!user) {
    return null;
  }

  const roles = resolveRoles(user.userRoles);
  const role = roles[0] || 'patient';
  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.username || user.email;

  return {
    userId: user.userId,
    username: user.username,
    role,
    displayName,
    badge:
      role === 'doctor'
        ? EDUCATION_AUTHOR_BADGES.DOCTOR
        : role === 'admin'
          ? EDUCATION_AUTHOR_BADGES.ADMIN
          : null,
    avatarPhoto: user.avatarPhoto || null,
  };
}

function mapCategory(category) {
  if (!category) {
    return null;
  }

  return {
    categoryId: category.categoryId,
    slug: category.slug,
    name: category.name,
    description: category.description || null,
    sortOrder: category.sortOrder,
    isActive: Boolean(category.isActive),
  };
}

function mapTag(tag) {
  const source = tag?.tag || tag;
  if (!source) {
    return null;
  }

  return {
    tagId: source.tagId,
    slug: source.slug,
    name: source.name,
  };
}

function mapRevision(revision) {
  if (!revision) {
    return null;
  }

  return {
    revisionId: revision.revisionId,
    articleId: revision.articleId,
    authorUserId: revision.authorUserId,
    category: mapCategory(revision.category),
    slug: revision.slug,
    title: revision.title,
    excerpt: revision.excerpt || null,
    contentMarkdown: revision.contentMarkdown,
    coverImageUrl: revision.coverImageUrl || null,
    coverImagePublicId: revision.coverImagePublicId || null,
    tagSlugs: Array.isArray(revision.tagSlugs) ? revision.tagSlugs : [],
    status: revision.status,
    submittedAt: revision.submittedAt || null,
    reviewedBy: revision.reviewedBy || null,
    reviewedAt: revision.reviewedAt || null,
    rejectionReason: revision.rejectionReason || null,
    createdAt: revision.createdAt,
    updatedAt: revision.updatedAt,
    author: mapAuthorSummary(revision.authorUser),
  };
}

function mapImage(image) {
  if (!image) {
    return null;
  }

  return {
    imageId: image.imageId,
    articleId: image.articleId || null,
    uploadedByUserId: image.uploadedByUserId || null,
    imageUrl: image.imageUrl,
    publicId: image.publicId,
    kind: image.kind,
    createdAt: image.createdAt,
  };
}

function mapComment(comment, actorUserId = null) {
  if (!comment) {
    return null;
  }

  return {
    commentId: comment.commentId,
    articleId: comment.articleId,
    userId: comment.userId,
    parentCommentId: comment.parentCommentId || null,
    content: comment.status === EDUCATION_COMMENT_STATUSES.DELETED ? null : comment.content,
    status: comment.status,
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
    hiddenAt: comment.hiddenAt || null,
    author: mapAuthorSummary(comment.user),
    canEdit: actorUserId ? actorUserId === comment.userId : false,
    canDelete: actorUserId ? actorUserId === comment.userId : false,
    replies: Array.isArray(comment.replies)
      ? comment.replies
          .filter((reply) => reply.status !== EDUCATION_COMMENT_STATUSES.HIDDEN)
          .map((reply) => mapComment(reply, actorUserId))
      : [],
  };
}

function mapArticle(article, actorUserId = null, options = {}) {
  if (!article) {
    return null;
  }

  const latestRevision =
    Array.isArray(article.revisions) && article.revisions.length > 0
      ? mapRevision(article.revisions[0])
      : null;
  const pendingRevision =
    Array.isArray(article.revisions) &&
    article.revisions.find((item) => item.status === EDUCATION_REVISION_STATUSES.PENDING_REVIEW);

  return {
    articleId: article.articleId,
    authorUserId: article.authorUserId,
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt || null,
    contentMarkdown: options.includeContent === false ? undefined : article.contentMarkdown,
    coverImageUrl: article.coverImageUrl || null,
    coverImagePublicId: article.coverImagePublicId || null,
    status: article.status,
    visibility: article.visibility,
    category: mapCategory(article.category),
    author: mapAuthorSummary(article.authorUser),
    tags: Array.isArray(article.tags) ? article.tags.map(mapTag).filter(Boolean) : [],
    likeCount: Number(article.likeCount || 0),
    commentCount: Number(article.commentCount || 0),
    viewCount: Number(article.viewCount || 0),
    likedByMe: Array.isArray(article.likes) ? article.likes.length > 0 : false,
    approvedBy: article.approvedBy || null,
    approvedAt: article.approvedAt || null,
    lastReviewedBy: article.lastReviewedBy || null,
    lastReviewedAt: article.lastReviewedAt || null,
    rejectionReason: article.rejectionReason || null,
    publishedAt: article.publishedAt || null,
    createdAt: article.createdAt,
    updatedAt: article.updatedAt,
    latestRevision,
    pendingRevision: pendingRevision ? mapRevision(pendingRevision) : null,
  };
}

function buildAuthorInclude() {
  return {
    select: {
      userId: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarPhoto: true,
      userRoles: {
        include: {
          role: true,
        },
      },
    },
  };
}

function buildArticleInclude(actorUserId = null, options = {}) {
  const include = {
    authorUser: buildAuthorInclude(),
    category: true,
    tags: {
      include: {
        tag: true,
      },
      orderBy: {
        tag: {
          name: 'asc',
        },
      },
    },
  };

  if (actorUserId) {
    include.likes = {
      where: {
        userId: actorUserId,
      },
      select: {
        userId: true,
      },
      take: 1,
    };
  }

  if (options.includeRevisions !== false) {
    include.revisions = {
      include: {
        authorUser: buildAuthorInclude(),
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options.revisionTake || 3,
    };
  }

  return include;
}

function normalizeTagInput(inputTags) {
  const seen = new Set();
  const tags = [];

  for (const value of inputTags || []) {
    const raw = String(value || '').trim();
    if (!raw) {
      continue;
    }

    const slug = slugify(raw);
    if (!slug || seen.has(slug)) {
      continue;
    }

    seen.add(slug);
    tags.push({
      slug,
      name: raw.length > 120 ? raw.slice(0, 120) : raw,
    });
  }

  return tags;
}

async function ensureUniqueArticleSlug(title, tx, excludeArticleId = null) {
  const base = slugify(title) || 'artikel';
  let candidate = base;
  let suffix = 2;
  let isAvailable = false;

  while (!isAvailable) {
    const existing = await tx.educationArticle.findFirst({
      where: {
        slug: candidate,
        ...(excludeArticleId
          ? {
              NOT: {
                articleId: excludeArticleId,
              },
            }
          : {}),
      },
      select: {
        articleId: true,
      },
    });

    if (!existing) {
      isAvailable = true;
      continue;
    }

    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function syncArticleTags(tx, articleId, inputTags) {
  const tags = normalizeTagInput(inputTags);

  await tx.educationArticleTag.deleteMany({
    where: {
      articleId,
    },
  });

  if (!tags.length) {
    return [];
  }

  for (const tag of tags) {
    await tx.educationTag.upsert({
      where: {
        slug: tag.slug,
      },
      update: {
        name: tag.name,
        updatedAt: new Date(),
      },
      create: {
        slug: tag.slug,
        name: tag.name,
      },
    });
  }

  const tagRows = await tx.educationTag.findMany({
    where: {
      slug: {
        in: tags.map((item) => item.slug),
      },
    },
  });

  if (tagRows.length) {
    await tx.educationArticleTag.createMany({
      data: tagRows.map((tag) => ({
        articleId,
        tagId: tag.tagId,
      })),
      skipDuplicates: true,
    });
  }

  return tagRows.map(mapTag);
}

async function syncArticleCoverImage(tx, articleId, coverImageUrl, coverImagePublicId) {
  await tx.educationArticleImage.deleteMany({
    where: {
      articleId,
      kind: EDUCATION_IMAGE_KINDS.COVER,
    },
  });

  if (!coverImageUrl || !coverImagePublicId) {
    return null;
  }

  return tx.educationArticleImage.create({
    data: {
      articleId,
      imageUrl: coverImageUrl,
      publicId: coverImagePublicId,
      kind: EDUCATION_IMAGE_KINDS.COVER,
    },
  });
}

async function listActiveCategories() {
  const categories = await prisma.educationCategory.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return categories.map(mapCategory);
}

async function listTags() {
  const tags = await prisma.educationTag.findMany({
    orderBy: {
      name: 'asc',
    },
  });

  return tags.map(mapTag);
}

async function findCategoryBySlug(slug) {
  if (!slug) {
    return null;
  }

  const category = await prisma.educationCategory.findUnique({
    where: {
      slug,
    },
  });

  return category ? mapCategory(category) : null;
}

async function findCategoryById(categoryId) {
  if (!categoryId) {
    return null;
  }

  const category = await prisma.educationCategory.findUnique({
    where: {
      categoryId,
    },
  });

  return category ? mapCategory(category) : null;
}

async function findArticleById(articleId, actorUserId = null) {
  const article = await prisma.educationArticle.findUnique({
    where: {
      articleId,
    },
    include: buildArticleInclude(actorUserId),
  });

  return mapArticle(article, actorUserId);
}

async function createArticleDraft({
  authorUserId,
  categoryId,
  title,
  excerpt,
  contentMarkdown,
  coverImageUrl,
  coverImagePublicId,
  tagLabels,
}) {
  const created = await prisma.$transaction(async (tx) => {
    const slug = await ensureUniqueArticleSlug(title, tx);
    const article = await tx.educationArticle.create({
      data: {
        authorUserId,
        categoryId,
        slug,
        title,
        excerpt,
        contentMarkdown,
        coverImageUrl,
        coverImagePublicId,
        status: EDUCATION_ARTICLE_STATUSES.DRAFT,
        visibility: EDUCATION_ARTICLE_VISIBILITIES.LOGGED_IN,
      },
    });

    await tx.educationArticleRevision.create({
      data: {
        articleId: article.articleId,
        authorUserId,
        categoryId,
        slug,
        title,
        excerpt,
        contentMarkdown,
        coverImageUrl,
        coverImagePublicId,
        tagSlugs: normalizeTagInput(tagLabels).map((item) => item.slug),
        status: EDUCATION_REVISION_STATUSES.DRAFT,
      },
    });

    await syncArticleTags(tx, article.articleId, tagLabels);
    await syncArticleCoverImage(tx, article.articleId, coverImageUrl, coverImagePublicId);

    return tx.educationArticle.findUnique({
      where: {
        articleId: article.articleId,
      },
      include: buildArticleInclude(authorUserId),
    });
  });

  return mapArticle(created, authorUserId);
}

async function updateOwnArticleDraft({
  articleId,
  authorUserId,
  categoryId,
  title,
  excerpt,
  contentMarkdown,
  coverImageUrl,
  coverImagePublicId,
  tagLabels,
}) {
  const updated = await prisma.$transaction(async (tx) => {
    const existing = await tx.educationArticle.findUnique({
      where: {
        articleId,
      },
    });

    if (!existing) {
      return null;
    }

    const slug =
      title && title !== existing.title
        ? await ensureUniqueArticleSlug(title, tx, articleId)
        : existing.slug;
    const isPendingArticle = existing.status === EDUCATION_ARTICLE_STATUSES.PENDING_REVIEW;
    const nextArticleStatus = isPendingArticle
      ? EDUCATION_ARTICLE_STATUSES.PENDING_REVIEW
      : EDUCATION_ARTICLE_STATUSES.DRAFT;
    const nextRevisionStatus = isPendingArticle
      ? EDUCATION_REVISION_STATUSES.PENDING_REVIEW
      : EDUCATION_REVISION_STATUSES.DRAFT;
    const now = new Date();

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        categoryId,
        slug,
        title,
        excerpt,
        contentMarkdown,
        coverImageUrl,
        coverImagePublicId,
        status: nextArticleStatus,
        rejectionReason: null,
        lastReviewedBy: null,
        lastReviewedAt: null,
        updatedAt: now,
      },
    });

    const revisionPayload = {
      articleId,
      authorUserId,
      categoryId,
      slug,
      title,
      excerpt,
      contentMarkdown,
      coverImageUrl,
      coverImagePublicId,
      tagSlugs: normalizeTagInput(tagLabels).map((item) => item.slug),
      status: nextRevisionStatus,
      submittedAt: isPendingArticle ? now : null,
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: now,
    };

    const existingRevision = await tx.educationArticleRevision.findFirst({
      where: {
        articleId,
        status: nextRevisionStatus,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    if (existingRevision) {
      await tx.educationArticleRevision.update({
        where: {
          revisionId: existingRevision.revisionId,
        },
        data: revisionPayload,
      });
    } else {
      await tx.educationArticleRevision.create({
        data: revisionPayload,
      });
    }

    await syncArticleTags(tx, articleId, tagLabels);
    await syncArticleCoverImage(tx, articleId, coverImageUrl, coverImagePublicId);

    return tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: buildArticleInclude(authorUserId),
    });
  });

  return mapArticle(updated, authorUserId);
}

async function createOrReplacePendingRevision({
  articleId,
  authorUserId,
  categoryId,
  title,
  excerpt,
  contentMarkdown,
  coverImageUrl,
  coverImagePublicId,
  tagLabels,
}) {
  const updated = await prisma.$transaction(async (tx) => {
    const existingPending = await tx.educationArticleRevision.findFirst({
      where: {
        articleId,
        status: EDUCATION_REVISION_STATUSES.PENDING_REVIEW,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const liveArticle = await tx.educationArticle.findUnique({
      where: {
        articleId,
      },
    });

    if (!liveArticle) {
      return null;
    }

    const slug =
      title && title !== liveArticle.title
        ? await ensureUniqueArticleSlug(title, tx, articleId)
        : liveArticle.slug;

    const revisionPayload = {
      articleId,
      authorUserId,
      categoryId,
      slug,
      title,
      excerpt,
      contentMarkdown,
      coverImageUrl,
      coverImagePublicId,
      tagSlugs: normalizeTagInput(tagLabels).map((item) => item.slug),
      status: EDUCATION_REVISION_STATUSES.PENDING_REVIEW,
      submittedAt: new Date(),
      rejectionReason: null,
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: new Date(),
    };

    if (existingPending) {
      await tx.educationArticleRevision.update({
        where: {
          revisionId: existingPending.revisionId,
        },
        data: revisionPayload,
      });
    } else {
      await tx.educationArticleRevision.create({
        data: revisionPayload,
      });
    }

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        lastReviewedBy: null,
        lastReviewedAt: null,
        updatedAt: new Date(),
      },
    });

    return tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: buildArticleInclude(authorUserId),
    });
  });

  return mapArticle(updated, authorUserId);
}

async function submitArticleForReview({ articleId, authorUserId }) {
  const article = await prisma.$transaction(async (tx) => {
    const existing = await tx.educationArticle.findUnique({
      where: {
        articleId,
      },
    });

    if (!existing) {
      return null;
    }

    let latestRevision = await tx.educationArticleRevision.findFirst({
      where: {
        articleId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!latestRevision) {
      latestRevision = await tx.educationArticleRevision.create({
        data: {
          articleId,
          authorUserId,
          categoryId: existing.categoryId,
          slug: existing.slug,
          title: existing.title,
          excerpt: existing.excerpt,
          contentMarkdown: existing.contentMarkdown,
          coverImageUrl: existing.coverImageUrl,
          coverImagePublicId: existing.coverImagePublicId,
          tagSlugs: [],
          status: EDUCATION_REVISION_STATUSES.DRAFT,
        },
      });
    }

    await tx.educationArticleRevision.update({
      where: {
        revisionId: latestRevision.revisionId,
      },
      data: {
        status: EDUCATION_REVISION_STATUSES.PENDING_REVIEW,
        submittedAt: new Date(),
        rejectionReason: null,
        reviewedBy: null,
        reviewedAt: null,
        updatedAt: new Date(),
      },
    });

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        status: EDUCATION_ARTICLE_STATUSES.PENDING_REVIEW,
        rejectionReason: null,
        lastReviewedBy: null,
        lastReviewedAt: null,
        updatedAt: new Date(),
      },
    });

    return tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: buildArticleInclude(authorUserId),
    });
  });

  return mapArticle(article, authorUserId);
}

async function listMyArticles({ authorUserId, page, limit, status }) {
  const where = {
    authorUserId,
    ...(status ? { status } : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.educationArticle.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { articleId: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: buildArticleInclude(authorUserId, { revisionTake: 5 }),
    }),
    prisma.educationArticle.count({ where }),
  ]);

  return {
    items: items.map((item) => mapArticle(item, authorUserId)),
    totalItems,
  };
}

async function listAdminArticles({ page, limit, status, q }) {
  const where = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            {
              title: {
                contains: q,
                mode: 'insensitive',
              },
            },
            {
              excerpt: {
                contains: q,
                mode: 'insensitive',
              },
            },
            {
              authorUser: {
                OR: [
                  {
                    firstName: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                  {
                    lastName: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                  {
                    username: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                  {
                    email: {
                      contains: q,
                      mode: 'insensitive',
                    },
                  },
                ],
              },
            },
          ],
        }
      : {}),
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.educationArticle.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { articleId: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: buildArticleInclude(null, { revisionTake: 5 }),
    }),
    prisma.educationArticle.count({ where }),
  ]);

  return {
    items: items.map((item) => mapArticle(item)),
    totalItems,
  };
}

async function listPendingArticles({ page, limit }) {
  const where = {
    status: EDUCATION_ARTICLE_STATUSES.PENDING_REVIEW,
    publishedAt: null,
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.educationArticle.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { articleId: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: buildArticleInclude(null, { revisionTake: 5 }),
    }),
    prisma.educationArticle.count({ where }),
  ]);

  return {
    items: items.map((item) => mapArticle(item)),
    totalItems,
  };
}

async function listPendingRevisions({ page, limit }) {
  const where = {
    status: EDUCATION_REVISION_STATUSES.PENDING_REVIEW,
    article: {
      publishedAt: {
        not: null,
      },
    },
  };

  const [items, totalItems] = await prisma.$transaction([
    prisma.educationArticleRevision.findMany({
      where,
      orderBy: [{ submittedAt: 'desc' }, { revisionId: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        article: {
          include: buildArticleInclude(),
        },
        authorUser: buildAuthorInclude(),
        category: true,
      },
    }),
    prisma.educationArticleRevision.count({ where }),
  ]);

  return {
    items: items.map((item) => ({
      ...mapRevision(item),
      article: mapArticle(item.article),
    })),
    totalItems,
  };
}

async function findRevisionById(revisionId) {
  const revision = await prisma.educationArticleRevision.findUnique({
    where: {
      revisionId,
    },
    include: {
      article: {
        include: buildArticleInclude(),
      },
      authorUser: buildAuthorInclude(),
      category: true,
    },
  });

  return revision
    ? {
        ...mapRevision(revision),
        article: mapArticle(revision.article),
      }
    : null;
}

function buildPublishedFeedWhere({ categorySlug, tagSlug, q }) {
  return {
    status: EDUCATION_ARTICLE_STATUSES.PUBLISHED,
    visibility: EDUCATION_ARTICLE_VISIBILITIES.LOGGED_IN,
    ...(categorySlug
      ? {
          category: {
            slug: categorySlug,
          },
        }
      : {}),
    ...(tagSlug
      ? {
          tags: {
            some: {
              tag: {
                slug: tagSlug,
              },
            },
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            {
              title: {
                contains: q,
                mode: 'insensitive',
              },
            },
            {
              excerpt: {
                contains: q,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };
}

function buildLatestCursorWhere(cursor) {
  if (!cursor?.publishedAt || !cursor?.articleId) {
    return {};
  }

  return {
    OR: [
      {
        publishedAt: {
          lt: new Date(cursor.publishedAt),
        },
      },
      {
        publishedAt: new Date(cursor.publishedAt),
        articleId: {
          lt: cursor.articleId,
        },
      },
    ],
  };
}

function buildPopularCursorWhere(cursor) {
  if (
    cursor?.likeCount === undefined ||
    cursor?.likeCount === null ||
    !cursor?.publishedAt ||
    !cursor?.articleId
  ) {
    return {};
  }

  return {
    OR: [
      {
        likeCount: {
          lt: Number(cursor.likeCount),
        },
      },
      {
        likeCount: Number(cursor.likeCount),
        publishedAt: {
          lt: new Date(cursor.publishedAt),
        },
      },
      {
        likeCount: Number(cursor.likeCount),
        publishedAt: new Date(cursor.publishedAt),
        articleId: {
          lt: cursor.articleId,
        },
      },
    ],
  };
}

async function listPublishedArticles({
  actorUserId,
  categorySlug,
  tagSlug,
  q,
  sort,
  cursor,
  limit,
}) {
  const where = {
    ...buildPublishedFeedWhere({ categorySlug, tagSlug, q }),
    ...(sort === 'popular' ? buildPopularCursorWhere(cursor) : buildLatestCursorWhere(cursor)),
  };

  const orderBy =
    sort === 'popular'
      ? [{ likeCount: 'desc' }, { publishedAt: 'desc' }, { articleId: 'desc' }]
      : [{ publishedAt: 'desc' }, { articleId: 'desc' }];

  const rows = await prisma.educationArticle.findMany({
    where,
    orderBy,
    take: limit + 1,
    include: buildArticleInclude(actorUserId, { includeRevisions: false }),
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);

  return {
    items: items.map((item) => mapArticle(item, actorUserId)),
    hasMore,
    next: hasMore ? rows[limit - 1] : null,
  };
}

async function findPublishedArticleBySlug(slug, actorUserId = null) {
  const article = await prisma.educationArticle.findFirst({
    where: {
      slug,
      status: EDUCATION_ARTICLE_STATUSES.PUBLISHED,
      visibility: EDUCATION_ARTICLE_VISIBILITIES.LOGGED_IN,
    },
    include: buildArticleInclude(actorUserId, { revisionTake: 5 }),
  });

  return mapArticle(article, actorUserId);
}

async function incrementArticleView(articleId) {
  await prisma.educationArticle.updateMany({
    where: {
      articleId,
      status: EDUCATION_ARTICLE_STATUSES.PUBLISHED,
    },
    data: {
      viewCount: {
        increment: 1,
      },
      updatedAt: new Date(),
    },
  });
}

async function approveArticle({ articleId, adminId }) {
  const updated = await prisma.$transaction(async (tx) => {
    const article = await tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: {
        revisions: {
          where: {
            status: EDUCATION_REVISION_STATUSES.PENDING_REVIEW,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!article) {
      return null;
    }

    if (article.revisions[0]) {
      await tx.educationArticleRevision.update({
        where: {
          revisionId: article.revisions[0].revisionId,
        },
        data: {
          status: EDUCATION_REVISION_STATUSES.APPROVED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason: null,
        },
      });
    }

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        status: EDUCATION_ARTICLE_STATUSES.PUBLISHED,
        approvedBy: adminId,
        approvedAt: new Date(),
        lastReviewedBy: adminId,
        lastReviewedAt: new Date(),
        rejectionReason: null,
        publishedAt: article.publishedAt || new Date(),
        updatedAt: new Date(),
      },
    });

    return tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: buildArticleInclude(),
    });
  });

  return mapArticle(updated);
}

async function rejectArticle({ articleId, adminId, rejectionReason }) {
  const updated = await prisma.$transaction(async (tx) => {
    const article = await tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: {
        revisions: {
          where: {
            status: EDUCATION_REVISION_STATUSES.PENDING_REVIEW,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!article) {
      return null;
    }

    if (article.revisions[0]) {
      await tx.educationArticleRevision.update({
        where: {
          revisionId: article.revisions[0].revisionId,
        },
        data: {
          status: EDUCATION_REVISION_STATUSES.REJECTED,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          rejectionReason,
        },
      });
    }

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        status: EDUCATION_ARTICLE_STATUSES.REJECTED,
        rejectionReason,
        lastReviewedBy: adminId,
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: buildArticleInclude(),
    });
  });

  return mapArticle(updated);
}

async function approveRevision({ revisionId, adminId }) {
  const updated = await prisma.$transaction(async (tx) => {
    const revision = await tx.educationArticleRevision.findUnique({
      where: {
        revisionId,
      },
      include: {
        article: true,
      },
    });

    if (!revision) {
      return null;
    }

    const articleId = revision.articleId;
    const slug = await ensureUniqueArticleSlug(revision.title, tx, articleId);

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        categoryId: revision.categoryId,
        slug,
        title: revision.title,
        excerpt: revision.excerpt,
        contentMarkdown: revision.contentMarkdown,
        coverImageUrl: revision.coverImageUrl,
        coverImagePublicId: revision.coverImagePublicId,
        status: EDUCATION_ARTICLE_STATUSES.PUBLISHED,
        approvedBy: adminId,
        approvedAt: new Date(),
        lastReviewedBy: adminId,
        lastReviewedAt: new Date(),
        rejectionReason: null,
        publishedAt: revision.article.publishedAt || new Date(),
        updatedAt: new Date(),
      },
    });

    await tx.educationArticleRevision.update({
      where: {
        revisionId,
      },
      data: {
        slug,
        status: EDUCATION_REVISION_STATUSES.APPROVED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });

    await syncArticleTags(tx, articleId, Array.isArray(revision.tagSlugs) ? revision.tagSlugs : []);
    await syncArticleCoverImage(tx, articleId, revision.coverImageUrl, revision.coverImagePublicId);

    return tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: buildArticleInclude(),
    });
  });

  return mapArticle(updated);
}

async function rejectRevision({ revisionId, adminId, rejectionReason }) {
  const updated = await prisma.$transaction(async (tx) => {
    const revision = await tx.educationArticleRevision.findUnique({
      where: {
        revisionId,
      },
    });

    if (!revision) {
      return null;
    }

    await tx.educationArticleRevision.update({
      where: {
        revisionId,
      },
      data: {
        status: EDUCATION_REVISION_STATUSES.REJECTED,
        reviewedBy: adminId,
        reviewedAt: new Date(),
        rejectionReason,
      },
    });

    await tx.educationArticle.update({
      where: {
        articleId: revision.articleId,
      },
      data: {
        lastReviewedBy: adminId,
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return tx.educationArticleRevision.findUnique({
      where: {
        revisionId,
      },
      include: {
        authorUser: buildAuthorInclude(),
        category: true,
        article: {
          include: buildArticleInclude(),
        },
      },
    });
  });

  return updated
    ? {
        ...mapRevision(updated),
        article: mapArticle(updated.article),
      }
    : null;
}

async function deleteArticleHard(articleId) {
  return prisma.$transaction(async (tx) => {
    const article = await tx.educationArticle.findUnique({
      where: {
        articleId,
      },
      include: buildArticleInclude(),
    });

    if (!article) {
      return null;
    }

    await tx.educationArticleLike.deleteMany({
      where: {
        articleId,
      },
    });

    await tx.educationArticleComment.deleteMany({
      where: {
        articleId,
      },
    });

    await tx.educationArticleTag.deleteMany({
      where: {
        articleId,
      },
    });

    await tx.educationArticleImage.deleteMany({
      where: {
        articleId,
      },
    });

    await tx.educationArticleRevision.deleteMany({
      where: {
        articleId,
      },
    });

    await tx.educationArticle.delete({
      where: {
        articleId,
      },
    });

    return {
      articleId: article.articleId,
      title: article.title,
      deleted: true,
    };
  });
}

async function likeArticle({ articleId, userId }) {
  await prisma.$transaction(async (tx) => {
    await tx.educationArticleLike.upsert({
      where: {
        articleId_userId: {
          articleId,
          userId,
        },
      },
      update: {},
      create: {
        articleId,
        userId,
      },
    });

    const likeCount = await tx.educationArticleLike.count({
      where: {
        articleId,
      },
    });

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        likeCount,
        updatedAt: new Date(),
      },
    });
  });
}

async function unlikeArticle({ articleId, userId }) {
  await prisma.$transaction(async (tx) => {
    await tx.educationArticleLike.deleteMany({
      where: {
        articleId,
        userId,
      },
    });

    const likeCount = await tx.educationArticleLike.count({
      where: {
        articleId,
      },
    });

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        likeCount,
        updatedAt: new Date(),
      },
    });
  });
}

async function createComment({ articleId, userId, parentCommentId = null, content }) {
  const created = await prisma.$transaction(async (tx) => {
    const comment = await tx.educationArticleComment.create({
      data: {
        articleId,
        userId,
        parentCommentId,
        content,
      },
      include: {
        user: buildAuthorInclude(),
        replies: {
          include: {
            user: buildAuthorInclude(),
          },
        },
      },
    });

    const commentCount = await tx.educationArticleComment.count({
      where: {
        articleId,
        status: EDUCATION_COMMENT_STATUSES.VISIBLE,
      },
    });

    await tx.educationArticle.update({
      where: {
        articleId,
      },
      data: {
        commentCount,
        updatedAt: new Date(),
      },
    });

    return comment;
  });

  return mapComment(created, userId);
}

async function findCommentById(commentId) {
  return prisma.educationArticleComment.findUnique({
    where: {
      commentId,
    },
    include: {
      user: buildAuthorInclude(),
      replies: {
        include: {
          user: buildAuthorInclude(),
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      article: true,
      parentComment: true,
    },
  });
}

async function updateCommentContent(commentId, content) {
  const updated = await prisma.educationArticleComment.update({
    where: {
      commentId,
    },
    data: {
      content,
      updatedAt: new Date(),
    },
    include: {
      user: buildAuthorInclude(),
      replies: {
        include: {
          user: buildAuthorInclude(),
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  return mapComment(updated, updated.userId);
}

async function markCommentDeleted(commentId) {
  const updated = await prisma.educationArticleComment.update({
    where: {
      commentId,
    },
    data: {
      status: EDUCATION_COMMENT_STATUSES.DELETED,
      content: '',
      updatedAt: new Date(),
    },
  });

  const commentCount = await prisma.educationArticleComment.count({
    where: {
      articleId: updated.articleId,
      status: EDUCATION_COMMENT_STATUSES.VISIBLE,
    },
  });

  await prisma.educationArticle.update({
    where: {
      articleId: updated.articleId,
    },
    data: {
      commentCount,
      updatedAt: new Date(),
    },
  });

  return updated;
}

async function hideComment({ commentId, adminId }) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.educationArticleComment.update({
      where: {
        commentId,
      },
      data: {
        status: EDUCATION_COMMENT_STATUSES.HIDDEN,
        hiddenBy: adminId,
        hiddenAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const commentCount = await tx.educationArticleComment.count({
      where: {
        articleId: updated.articleId,
        status: EDUCATION_COMMENT_STATUSES.VISIBLE,
      },
    });

    await tx.educationArticle.update({
      where: {
        articleId: updated.articleId,
      },
      data: {
        commentCount,
        updatedAt: new Date(),
      },
    });

    return updated;
  });
}

async function listArticleComments({ articleId, actorUserId, cursor, limit }) {
  const where = {
    articleId,
    parentCommentId: null,
    status: EDUCATION_COMMENT_STATUSES.VISIBLE,
    ...(cursor?.createdAt && cursor?.commentId
      ? {
          OR: [
            {
              createdAt: {
                lt: new Date(cursor.createdAt),
              },
            },
            {
              createdAt: new Date(cursor.createdAt),
              commentId: {
                lt: cursor.commentId,
              },
            },
          ],
        }
      : {}),
  };

  const rows = await prisma.educationArticleComment.findMany({
    where,
    orderBy: [{ createdAt: 'desc' }, { commentId: 'desc' }],
    take: limit + 1,
    include: {
      user: buildAuthorInclude(),
      replies: {
        where: {
          status: EDUCATION_COMMENT_STATUSES.VISIBLE,
        },
        include: {
          user: buildAuthorInclude(),
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);

  return {
    items: items.map((item) => mapComment(item, actorUserId)),
    hasMore,
    next: hasMore ? rows[limit - 1] : null,
  };
}

module.exports = {
  normalizeTagInput,
  listActiveCategories,
  listTags,
  findCategoryBySlug,
  findCategoryById,
  findArticleById,
  createArticleDraft,
  updateOwnArticleDraft,
  createOrReplacePendingRevision,
  submitArticleForReview,
  listMyArticles,
  listAdminArticles,
  listPendingArticles,
  listPendingRevisions,
  findRevisionById,
  listPublishedArticles,
  findPublishedArticleBySlug,
  incrementArticleView,
  approveArticle,
  rejectArticle,
  approveRevision,
  rejectRevision,
  deleteArticleHard,
  likeArticle,
  unlikeArticle,
  createComment,
  findCommentById,
  updateCommentContent,
  markCommentDeleted,
  hideComment,
  listArticleComments,
  mapArticle,
  mapRevision,
  mapComment,
  mapCategory,
  mapTag,
  mapImage,
};
