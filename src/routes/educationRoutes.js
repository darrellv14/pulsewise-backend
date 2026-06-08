const express = require('express');
const authenticate = require('../middlewares/authenticate');
const validateRequest = require('../middlewares/validateRequest');
const educationController = require('../controllers/educationController');
const {
  articleIdParamSchema,
  revisionIdParamSchema,
  commentIdParamSchema,
  slugParamSchema,
  paginationQuerySchema,
  feedQuerySchema,
  uploadSignatureQuerySchema,
  articleUpsertBodySchema,
  emptyBodySchema,
  rejectBodySchema,
  featureBodySchema,
  myArticlesQuerySchema,
  adminArticlesQuerySchema,
  commentCursorQuerySchema,
  commentCreateBodySchema,
  commentUpdateBodySchema,
} = require('../validators/educationValidator');

const router = express.Router();

router.get(
  '/education/categories',
  authenticate,
  educationController.listCategories
);
router.get(
  '/education/tags',
  authenticate,
  educationController.listTags
);
router.get(
  '/education/upload-signature',
  authenticate,
  validateRequest(uploadSignatureQuerySchema, 'query'),
  educationController.getUploadSignature
);
router.get(
  '/education/articles',
  authenticate,
  validateRequest(feedQuerySchema, 'query'),
  educationController.listPublishedArticles
);
router.get(
  '/education/articles/:slug',
  authenticate,
  validateRequest(slugParamSchema, 'params'),
  educationController.getPublishedArticleDetail
);
router.post(
  '/education/articles',
  authenticate,
  validateRequest(articleUpsertBodySchema),
  educationController.createArticle
);
router.get(
  '/education/me/articles',
  authenticate,
  validateRequest(myArticlesQuerySchema, 'query'),
  educationController.listMyArticles
);
router.get(
  '/education/me/articles/:articleId',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  educationController.getMyArticleDetail
);
router.put(
  '/education/articles/:articleId',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(articleUpsertBodySchema),
  educationController.updateArticle
);
router.post(
  '/education/articles/:articleId/submit-review',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(emptyBodySchema),
  educationController.submitArticleReview
);
router.post(
  '/education/articles/:articleId/likes',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(emptyBodySchema),
  educationController.likeArticle
);
router.delete(
  '/education/articles/:articleId/likes',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  educationController.unlikeArticle
);
router.get(
  '/education/articles/:articleId/comments',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(commentCursorQuerySchema, 'query'),
  educationController.listComments
);
router.post(
  '/education/articles/:articleId/comments',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(commentCreateBodySchema),
  educationController.createComment
);
router.post(
  '/education/comments/:commentId/replies',
  authenticate,
  validateRequest(commentIdParamSchema, 'params'),
  validateRequest(commentCreateBodySchema),
  educationController.createReply
);
router.put(
  '/education/comments/:commentId',
  authenticate,
  validateRequest(commentIdParamSchema, 'params'),
  validateRequest(commentUpdateBodySchema),
  educationController.updateComment
);
router.delete(
  '/education/comments/:commentId',
  authenticate,
  validateRequest(commentIdParamSchema, 'params'),
  educationController.deleteComment
);

router.get(
  '/admin/education/articles',
  authenticate,
  validateRequest(adminArticlesQuerySchema, 'query'),
  educationController.listAdminArticles
);
router.get(
  '/admin/education/articles/pending',
  authenticate,
  validateRequest(paginationQuerySchema, 'query'),
  educationController.listPendingArticles
);
router.get(
  '/admin/education/articles/revisions/pending',
  authenticate,
  validateRequest(paginationQuerySchema, 'query'),
  educationController.listPendingRevisions
);
router.get(
  '/admin/education/articles/:articleId',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  educationController.getAdminArticleDetail
);
router.post(
  '/admin/education/articles/:articleId/approve',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(emptyBodySchema),
  educationController.approveArticle
);
router.post(
  '/admin/education/articles/:articleId/reject',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(rejectBodySchema),
  educationController.rejectArticle
);
router.post(
  '/admin/education/revisions/:revisionId/approve',
  authenticate,
  validateRequest(revisionIdParamSchema, 'params'),
  validateRequest(emptyBodySchema),
  educationController.approveRevision
);
router.post(
  '/admin/education/revisions/:revisionId/reject',
  authenticate,
  validateRequest(revisionIdParamSchema, 'params'),
  validateRequest(rejectBodySchema),
  educationController.rejectRevision
);
router.post(
  '/admin/education/articles/:articleId/feature',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  validateRequest(featureBodySchema),
  educationController.featureArticle
);
router.delete(
  '/admin/education/articles/:articleId',
  authenticate,
  validateRequest(articleIdParamSchema, 'params'),
  educationController.deleteArticle
);
router.post(
  '/admin/education/comments/:commentId/hide',
  authenticate,
  validateRequest(commentIdParamSchema, 'params'),
  validateRequest(emptyBodySchema),
  educationController.hideComment
);

module.exports = router;
