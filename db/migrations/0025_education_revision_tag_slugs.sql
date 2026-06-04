ALTER TABLE education_article_revisions
ADD COLUMN IF NOT EXISTS tag_slugs JSONB;
