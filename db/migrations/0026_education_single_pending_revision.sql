-- Keep only the newest pending revision per article, then enforce that invariant.
WITH ranked_pending_revisions AS (
  SELECT
    revision_id,
    ROW_NUMBER() OVER (
      PARTITION BY article_id
      ORDER BY updated_at DESC, submitted_at DESC NULLS LAST, created_at DESC, revision_id DESC
    ) AS row_number
  FROM education_article_revisions
  WHERE status = 'pending_review'
)
UPDATE education_article_revisions
SET
  status = 'draft',
  submitted_at = NULL,
  reviewed_by = NULL,
  reviewed_at = NULL,
  rejection_reason = NULL,
  updated_at = NOW()
WHERE revision_id IN (
  SELECT revision_id
  FROM ranked_pending_revisions
  WHERE row_number > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_education_article_revisions_one_pending_per_article
  ON education_article_revisions(article_id)
  WHERE status = 'pending_review';
