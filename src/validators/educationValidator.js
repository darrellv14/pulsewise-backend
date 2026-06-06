const { z } = require('zod');
const {
  EDUCATION_ARTICLE_STATUSES,
  EDUCATION_IMAGE_KINDS,
  EDUCATION_SORTS,
} = require('../constants/educationEnums');

const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uuidV4Schema = z.string().uuid().regex(uuidV4Regex, 'Harus UUID v4 yang valid');

const articleIdParamSchema = z.object({
  articleId: uuidV4Schema,
});

const revisionIdParamSchema = z.object({
  revisionId: uuidV4Schema,
});

const commentIdParamSchema = z.object({
  commentId: uuidV4Schema,
});

const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const feedQuerySchema = z.object({
  category: z.string().trim().min(1).max(120).optional(),
  tag: z.string().trim().min(1).max(120).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  sort: z.enum([EDUCATION_SORTS.LATEST, EDUCATION_SORTS.POPULAR]).optional().default('latest'),
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});

const uploadSignatureQuerySchema = z.object({
  kind: z.enum([EDUCATION_IMAGE_KINDS.COVER, EDUCATION_IMAGE_KINDS.INLINE]).optional().default('cover'),
});

const articleStatusFilterSchema = z
  .enum([
    EDUCATION_ARTICLE_STATUSES.DRAFT,
    EDUCATION_ARTICLE_STATUSES.PENDING_REVIEW,
    EDUCATION_ARTICLE_STATUSES.PUBLISHED,
    EDUCATION_ARTICLE_STATUSES.REJECTED,
    EDUCATION_ARTICLE_STATUSES.ARCHIVED,
    EDUCATION_ARTICLE_STATUSES.UNPUBLISHED,
  ])
  .optional();

const commentCursorQuerySchema = z.object({
  cursor: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

const tagsSchema = z.array(z.string().trim().min(1).max(120)).max(20).optional().default([]);

const contentMarkdownSchema = z
  .string()
  .min(20, 'contentMarkdown minimal 20 karakter')
  .refine((value) => value.trim().length >= 20, {
    message: 'contentMarkdown minimal 20 karakter non-whitespace',
  });

const articleUpsertBodySchema = z
  .object({
    categoryId: uuidV4Schema.optional(),
    categorySlug: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(3).max(200),
    excerpt: z.string().trim().min(1).max(500).nullable().optional(),
    contentMarkdown: contentMarkdownSchema,
    coverImageUrl: z.string().trim().url().nullable().optional(),
    coverImagePublicId: z.string().trim().min(1).max(255).nullable().optional(),
    tags: tagsSchema,
  })
  .refine((value) => Boolean(value.categoryId || value.categorySlug), {
    message: 'Pilih categoryId atau categorySlug',
    path: ['categoryId'],
  });

const emptyBodySchema = z.object({}).strict();

const rejectBodySchema = z.object({
  rejectionReason: z.string().trim().min(3).max(1000),
});

const featureBodySchema = z.object({
  isFeatured: z.coerce.boolean().optional().default(true),
  featuredOrder: z.coerce.number().int().min(0).max(9999).nullable().optional(),
});

const commentCreateBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

const commentUpdateBodySchema = z.object({
  content: z.string().trim().min(1).max(2000),
});

const myArticlesQuerySchema = paginationQuerySchema.extend({
  status: articleStatusFilterSchema,
});

const adminArticlesQuerySchema = paginationQuerySchema.extend({
  status: articleStatusFilterSchema,
  q: z.string().trim().min(1).max(120).optional(),
});

module.exports = {
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
};
