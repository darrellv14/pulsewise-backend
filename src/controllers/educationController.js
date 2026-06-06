const educationService = require('../services/educationService');
const { success } = require('../utils/response');

async function listCategories(req, res, next) {
  try {
    const data = await educationService.listCategories();
    return success(res, 'Daftar kategori edukasi berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listTags(req, res, next) {
  try {
    const data = await educationService.listTags();
    return success(res, 'Daftar tag edukasi berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getUploadSignature(req, res, next) {
  try {
    const data = await educationService.getUploadSignature({
      actor: req.user,
      query: req.query,
    });
    return success(res, 'Signature upload edukasi berhasil dibuat', data);
  } catch (error) {
    return next(error);
  }
}

async function listPublishedArticles(req, res, next) {
  try {
    const data = await educationService.listPublishedArticles({
      actor: req.user,
      query: req.query,
    });
    return success(res, 'Daftar artikel edukasi berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getPublishedArticleDetail(req, res, next) {
  try {
    const data = await educationService.getPublishedArticleDetail({
      actor: req.user,
      slug: req.params.slug,
    });
    return success(res, 'Detail artikel edukasi berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createArticle(req, res, next) {
  try {
    const data = await educationService.createArticle({
      actor: req.user,
      payload: req.body,
    });
    return success(res, 'Draft artikel edukasi berhasil dibuat', data, 201);
  } catch (error) {
    return next(error);
  }
}

async function getMyArticleDetail(req, res, next) {
  try {
    const data = await educationService.getMyArticleDetail({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Detail artikel saya berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function updateArticle(req, res, next) {
  try {
    const data = await educationService.updateArticle({
      actor: req.user,
      articleId: req.params.articleId,
      payload: req.body,
    });
    return success(res, 'Artikel edukasi berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function submitArticleReview(req, res, next) {
  try {
    const data = await educationService.submitArticleReview({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Artikel edukasi berhasil diajukan untuk review', data);
  } catch (error) {
    return next(error);
  }
}

async function listMyArticles(req, res, next) {
  try {
    const data = await educationService.listMyArticles({
      actor: req.user,
      query: req.query,
    });
    return success(res, 'Daftar artikel saya berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function listAdminArticles(req, res, next) {
  try {
    const data = await educationService.listAdminArticles({
      actor: req.user,
      query: req.query,
    });
    return success(res, 'Daftar semua artikel edukasi admin berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function likeArticle(req, res, next) {
  try {
    const data = await educationService.likeArticle({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Artikel edukasi berhasil disukai', data);
  } catch (error) {
    return next(error);
  }
}

async function unlikeArticle(req, res, next) {
  try {
    const data = await educationService.unlikeArticle({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Like artikel edukasi berhasil dibatalkan', data);
  } catch (error) {
    return next(error);
  }
}

async function listComments(req, res, next) {
  try {
    const data = await educationService.listComments({
      actor: req.user,
      articleId: req.params.articleId,
      query: req.query,
    });
    return success(res, 'Daftar komentar artikel edukasi berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function createComment(req, res, next) {
  try {
    const data = await educationService.createComment({
      actor: req.user,
      articleId: req.params.articleId,
      content: req.body.content,
    });
    return success(res, 'Komentar artikel edukasi berhasil dibuat', data, 201);
  } catch (error) {
    return next(error);
  }
}

async function createReply(req, res, next) {
  try {
    const data = await educationService.createReply({
      actor: req.user,
      commentId: req.params.commentId,
      content: req.body.content,
    });
    return success(res, 'Balasan komentar berhasil dibuat', data, 201);
  } catch (error) {
    return next(error);
  }
}

async function updateComment(req, res, next) {
  try {
    const data = await educationService.updateComment({
      actor: req.user,
      commentId: req.params.commentId,
      content: req.body.content,
    });
    return success(res, 'Komentar artikel edukasi berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function deleteComment(req, res, next) {
  try {
    const data = await educationService.deleteComment({
      actor: req.user,
      commentId: req.params.commentId,
    });
    return success(res, 'Komentar artikel edukasi berhasil dihapus', data);
  } catch (error) {
    return next(error);
  }
}

async function listPendingArticles(req, res, next) {
  try {
    const data = await educationService.listPendingArticles({
      actor: req.user,
      query: req.query,
    });
    return success(res, 'Daftar artikel edukasi pending review berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function getAdminArticleDetail(req, res, next) {
  try {
    const data = await educationService.getAdminArticleDetail({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Detail artikel edukasi admin berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function approveArticle(req, res, next) {
  try {
    const data = await educationService.approveArticle({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Artikel edukasi berhasil di-approve', data);
  } catch (error) {
    return next(error);
  }
}

async function rejectArticle(req, res, next) {
  try {
    const data = await educationService.rejectArticle({
      actor: req.user,
      articleId: req.params.articleId,
      rejectionReason: req.body.rejectionReason,
    });
    return success(res, 'Artikel edukasi berhasil ditolak', data);
  } catch (error) {
    return next(error);
  }
}

async function listPendingRevisions(req, res, next) {
  try {
    const data = await educationService.listPendingRevisions({
      actor: req.user,
      query: req.query,
    });
    return success(res, 'Daftar revisi artikel edukasi pending review berhasil diambil', data);
  } catch (error) {
    return next(error);
  }
}

async function approveRevision(req, res, next) {
  try {
    const data = await educationService.approveRevision({
      actor: req.user,
      revisionId: req.params.revisionId,
    });
    return success(res, 'Revisi artikel edukasi berhasil di-approve', data);
  } catch (error) {
    return next(error);
  }
}

async function rejectRevision(req, res, next) {
  try {
    const data = await educationService.rejectRevision({
      actor: req.user,
      revisionId: req.params.revisionId,
      rejectionReason: req.body.rejectionReason,
    });
    return success(res, 'Revisi artikel edukasi berhasil ditolak', data);
  } catch (error) {
    return next(error);
  }
}

async function featureArticle(req, res, next) {
  try {
    const data = await educationService.featureArticle({
      actor: req.user,
      articleId: req.params.articleId,
      payload: req.body,
    });
    return success(res, 'Pengaturan featured artikel edukasi berhasil diperbarui', data);
  } catch (error) {
    return next(error);
  }
}

async function archiveArticle(req, res, next) {
  try {
    const data = await educationService.archiveArticle({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Artikel edukasi berhasil diarsipkan', data);
  } catch (error) {
    return next(error);
  }
}

async function unpublishArticle(req, res, next) {
  try {
    const data = await educationService.unpublishArticle({
      actor: req.user,
      articleId: req.params.articleId,
    });
    return success(res, 'Artikel edukasi berhasil di-unpublish', data);
  } catch (error) {
    return next(error);
  }
}

async function hideComment(req, res, next) {
  try {
    const data = await educationService.hideComment({
      actor: req.user,
      commentId: req.params.commentId,
    });
    return success(res, 'Komentar artikel edukasi berhasil disembunyikan', data);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listCategories,
  listTags,
  getUploadSignature,
  listPublishedArticles,
  getPublishedArticleDetail,
  createArticle,
  getMyArticleDetail,
  updateArticle,
  submitArticleReview,
  listMyArticles,
  listAdminArticles,
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
  featureArticle,
  archiveArticle,
  unpublishArticle,
  hideComment,
};
