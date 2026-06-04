CREATE TABLE IF NOT EXISTS education_categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_categories_active_sort
ON education_categories (is_active, sort_order);

CREATE TABLE IF NOT EXISTS education_articles (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id UUID REFERENCES education_categories(category_id) ON DELETE SET NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  title VARCHAR(200) NOT NULL,
  excerpt VARCHAR(500),
  content_markdown TEXT NOT NULL,
  cover_image_url TEXT,
  cover_image_public_id VARCHAR(255),
  tag_slugs JSONB,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  visibility VARCHAR(32) NOT NULL DEFAULT 'logged_in',
  approved_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ(6),
  last_reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  last_reviewed_at TIMESTAMPTZ(6),
  rejection_reason TEXT,
  published_at TIMESTAMPTZ(6),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  featured_order INTEGER,
  like_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_articles_author_created
ON education_articles (author_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_education_articles_status_published
ON education_articles (status, published_at DESC, article_id DESC);

CREATE INDEX IF NOT EXISTS idx_education_articles_category_published
ON education_articles (category_id, published_at DESC, article_id DESC);

CREATE INDEX IF NOT EXISTS idx_education_articles_featured
ON education_articles (is_featured, featured_order);

CREATE TABLE IF NOT EXISTS education_article_revisions (
  revision_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES education_articles(article_id) ON DELETE CASCADE,
  author_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  category_id UUID REFERENCES education_categories(category_id) ON DELETE SET NULL,
  slug VARCHAR(200) NOT NULL,
  title VARCHAR(200) NOT NULL,
  excerpt VARCHAR(500),
  content_markdown TEXT NOT NULL,
  cover_image_url TEXT,
  cover_image_public_id VARCHAR(255),
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ(6),
  reviewed_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ(6),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_article_revisions_article_created
ON education_article_revisions (article_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_education_article_revisions_status_submitted
ON education_article_revisions (status, submitted_at DESC);

CREATE TABLE IF NOT EXISTS education_article_images (
  image_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID REFERENCES education_articles(article_id) ON DELETE CASCADE,
  uploaded_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  kind VARCHAR(16) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_article_images_article_kind
ON education_article_images (article_id, kind);

CREATE INDEX IF NOT EXISTS idx_education_article_images_uploaded_by
ON education_article_images (uploaded_by_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS education_tags (
  tag_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS education_article_tags (
  article_id UUID NOT NULL REFERENCES education_articles(article_id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES education_tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (article_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_education_article_tags_tag
ON education_article_tags (tag_id);

CREATE TABLE IF NOT EXISTS education_article_likes (
  article_id UUID NOT NULL REFERENCES education_articles(article_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY (article_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_education_article_likes_user_created
ON education_article_likes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS education_article_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES education_articles(article_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES education_article_comments(comment_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'visible',
  hidden_by UUID REFERENCES users(user_id) ON DELETE SET NULL,
  hidden_at TIMESTAMPTZ(6),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_education_article_comments_article_created
ON education_article_comments (article_id, created_at DESC, comment_id DESC);

CREATE INDEX IF NOT EXISTS idx_education_article_comments_parent_created
ON education_article_comments (parent_comment_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_education_article_comments_user_created
ON education_article_comments (user_id, created_at DESC);

INSERT INTO education_categories (slug, name, description, sort_order)
VALUES
  ('gaya-hidup-aktivitas', 'Gaya Hidup & Aktivitas', 'Aktivitas harian, gerak aman, dan kebiasaan sehat untuk pasien jantung.', 1),
  ('nutrisi-pola-makan', 'Nutrisi & Pola Makan', 'Pola makan sehat jantung, pembatasan garam, dan pilihan menu yang lebih aman.', 2),
  ('gejala-tanda-bahaya', 'Gejala & Tanda Bahaya', 'Mengenali gejala awal, peringatan bahaya, dan kapan harus mencari bantuan medis.', 3),
  ('penyakit-jantung-kondisi-terkait', 'Penyakit Jantung & Kondisi Terkait', 'Edukasi penyakit jantung, hipertensi, gagal jantung, dan kondisi terkait lainnya.', 4),
  ('obat-kepatuhan-terapi', 'Obat & Kepatuhan Terapi', 'Cara minum obat yang benar, kepatuhan terapi, dan hal-hal yang perlu diperhatikan.', 5),
  ('pemantauan-kesehatan', 'Pemantauan Kesehatan', 'Cara memantau tekanan darah, denyut jantung, gejala, dan kebiasaan pencatatan rutin.', 6),
  ('edukasi-klinik-pencegahan', 'Edukasi Klinik & Pencegahan', 'Pencegahan, pemeriksaan lanjutan, dan pengetahuan klinis dasar yang mudah dipahami.', 7)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  sort_order = EXCLUDED.sort_order,
  is_active = TRUE,
  updated_at = NOW();
