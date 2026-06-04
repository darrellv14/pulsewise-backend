const {
  articleUpsertBodySchema,
  feedQuerySchema,
  uploadSignatureQuerySchema,
} = require('../src/validators/educationValidator');

describe('education validators', () => {
  test('article upsert accepts categorySlug and tags', () => {
    const result = articleUpsertBodySchema.safeParse({
      categorySlug: 'nutrisi-pola-makan',
      title: 'Menu rendah garam untuk lansia',
      excerpt: 'Ringkas dan jelas',
      contentMarkdown: 'Ini adalah konten markdown yang cukup panjang untuk lolos validasi.',
      tags: ['rendah garam', 'lansia'],
    });

    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual(['rendah garam', 'lansia']);
  });

  test('article upsert requires category selector', () => {
    const result = articleUpsertBodySchema.safeParse({
      title: 'Tanpa kategori',
      contentMarkdown: 'Ini adalah konten markdown yang cukup panjang untuk lolos validasi.',
    });

    expect(result.success).toBe(false);
  });

  test('feed query defaults to latest with limit 10', () => {
    const result = feedQuerySchema.parse({});

    expect(result).toMatchObject({
      sort: 'latest',
      limit: 10,
    });
  });

  test('article upsert preserves mdxeditor markdown source verbatim', () => {
    const source = '\n# Judul\n\n```js\nconsole.log("halo")\n```\n';
    const result = articleUpsertBodySchema.parse({
      categorySlug: 'nutrisi-pola-makan',
      title: 'Konten MDXEditor',
      excerpt: 'Ringkas',
      contentMarkdown: source + '\nParagraf penutup yang cukup panjang.',
      tags: [],
    });

    expect(result.contentMarkdown.startsWith('\n# Judul')).toBe(true);
    expect(result.contentMarkdown).toContain('```js');
  });

  test('upload signature query supports inline kind', () => {
    const result = uploadSignatureQuerySchema.parse({
      kind: 'inline',
    });

    expect(result.kind).toBe('inline');
  });
});
