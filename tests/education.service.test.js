jest.mock('../src/repositories/educationRepository', () => ({
  listActiveCategories: jest.fn(),
  listTags: jest.fn(),
  findCategoryBySlug: jest.fn(),
  findCategoryById: jest.fn(),
  findArticleById: jest.fn(),
  createArticleDraft: jest.fn(),
  updateOwnArticleDraft: jest.fn(),
  createOrReplacePendingRevision: jest.fn(),
  submitArticleForReview: jest.fn(),
  listMyArticles: jest.fn(),
  listPublishedArticles: jest.fn(),
  findPublishedArticleBySlug: jest.fn(),
  incrementArticleView: jest.fn(),
  likeArticle: jest.fn(),
  unlikeArticle: jest.fn(),
  listArticleComments: jest.fn(),
  createComment: jest.fn(),
  findCommentById: jest.fn(),
  updateCommentContent: jest.fn(),
  markCommentDeleted: jest.fn(),
  listPendingArticles: jest.fn(),
  listPendingRevisions: jest.fn(),
  findRevisionById: jest.fn(),
  approveArticle: jest.fn(),
  rejectArticle: jest.fn(),
  approveRevision: jest.fn(),
  rejectRevision: jest.fn(),
  setArticleFeatured: jest.fn(),
  deleteArticleHard: jest.fn(),
  hideComment: jest.fn(),
}));

jest.mock('../src/services/educationUploadService', () => ({
  createEducationUploadSignature: jest.fn(),
}));

const educationRepository = require('../src/repositories/educationRepository');
const { createEducationUploadSignature } = require('../src/services/educationUploadService');
const educationService = require('../src/services/educationService');

describe('educationService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('createArticle resolves categorySlug and delegates to draft creation', async () => {
    educationRepository.findCategoryBySlug.mockResolvedValue({
      categoryId: '11111111-1111-4111-8111-111111111111',
      isActive: true,
    });
    educationRepository.createArticleDraft.mockResolvedValue({
      articleId: 'article-1',
      status: 'draft',
    });

    const result = await educationService.createArticle({
      actor: { userId: 'user-1', role: 'patient' },
      payload: {
        categorySlug: 'nutrisi-pola-makan',
        title: 'Artikel baru',
        excerpt: 'Ringkas',
        contentMarkdown: 'Konten markdown yang cukup panjang untuk lolos validasi service.',
        tags: ['nutrisi'],
      },
    });

    expect(educationRepository.createArticleDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        authorUserId: 'user-1',
        categoryId: '11111111-1111-4111-8111-111111111111',
      })
    );
    expect(result.articleId).toBe('article-1');
  });

  test('updateArticle on published article creates pending revision flow', async () => {
    educationRepository.findArticleById.mockResolvedValueOnce({
      articleId: 'article-2',
      authorUserId: 'user-1',
      status: 'published',
    });
    educationRepository.findCategoryBySlug.mockResolvedValue({
      categoryId: '22222222-2222-4222-8222-222222222222',
      isActive: true,
    });
    educationRepository.createOrReplacePendingRevision.mockResolvedValue({
      articleId: 'article-2',
      pendingRevision: { revisionId: 'revision-1' },
    });

    const result = await educationService.updateArticle({
      actor: { userId: 'user-1', role: 'patient' },
      articleId: 'article-2',
      payload: {
        categorySlug: 'gaya-hidup-aktivitas',
        title: 'Judul revisi',
        excerpt: 'Ringkas',
        contentMarkdown: 'Konten markdown yang cukup panjang untuk lolos validasi service.',
      },
    });

    expect(educationRepository.createOrReplacePendingRevision).toHaveBeenCalled();
    expect(educationRepository.updateOwnArticleDraft).not.toHaveBeenCalled();
    expect(result.pendingRevision).toMatchObject({ revisionId: 'revision-1' });
  });

  test('admin can update published article authored by another user', async () => {
    educationRepository.findArticleById.mockResolvedValueOnce({
      articleId: 'article-3',
      authorUserId: 'user-author',
      status: 'published',
    });
    educationRepository.findCategoryBySlug.mockResolvedValue({
      categoryId: '33333333-3333-4333-8333-333333333333',
      isActive: true,
    });
    educationRepository.createOrReplacePendingRevision.mockResolvedValue({
      articleId: 'article-3',
      pendingRevision: { revisionId: 'revision-admin-1' },
    });

    await educationService.updateArticle({
      actor: { userId: 'admin-1', role: 'admin' },
      articleId: 'article-3',
      payload: {
        categorySlug: 'gaya-hidup-aktivitas',
        title: 'Judul admin',
        excerpt: 'Ringkas',
        contentMarkdown: 'Konten markdown yang cukup panjang untuk lolos validasi service.',
      },
    });

    expect(educationRepository.createOrReplacePendingRevision).toHaveBeenCalledWith(
      expect.objectContaining({
        articleId: 'article-3',
        authorUserId: 'user-author',
      })
    );
  });

  test('listPublishedArticles rejects malformed cursor', async () => {
    await expect(
      educationService.listPublishedArticles({
        actor: { userId: 'user-1', role: 'patient' },
        query: {
          cursor: 'bukan-cursor-valid',
        },
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Cursor tidak valid',
    });
  });

  test('createReply rejects nested replies deeper than one level', async () => {
    educationRepository.findCommentById.mockResolvedValue({
      commentId: 'comment-2',
      articleId: 'article-1',
      parentCommentId: 'comment-1',
      status: 'visible',
    });

    await expect(
      educationService.createReply({
        actor: { userId: 'user-1', role: 'patient' },
        commentId: 'comment-2',
        content: 'balasan baru',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Balasan hanya diizinkan satu tingkat',
    });
  });

  test('upload signature delegates to upload service', async () => {
    createEducationUploadSignature.mockReturnValue({
      kind: 'cover',
      uploadUrl: 'https://example.com',
    });

    const result = await educationService.getUploadSignature({
      actor: { userId: 'user-1', role: 'patient' },
      query: { kind: 'cover' },
    });

    expect(createEducationUploadSignature).toHaveBeenCalledWith('cover');
    expect(result.uploadUrl).toBe('https://example.com');
  });

  test('admin can hard delete any article', async () => {
    educationRepository.findArticleById.mockResolvedValue({
      articleId: 'article-delete-1',
      authorUserId: 'user-author',
      status: 'published',
    });
    educationRepository.deleteArticleHard.mockResolvedValue({
      articleId: 'article-delete-1',
      deleted: true,
    });

    const result = await educationService.deleteArticle({
      actor: { userId: 'admin-1', role: 'admin' },
      articleId: 'article-delete-1',
    });

    expect(educationRepository.deleteArticleHard).toHaveBeenCalledWith('article-delete-1');
    expect(result).toMatchObject({
      articleId: 'article-delete-1',
      deleted: true,
    });
  });
});
