const EDUCATION_ARTICLE_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  REJECTED: 'rejected',
  ARCHIVED: 'archived',
  UNPUBLISHED: 'unpublished',
});

const EDUCATION_ARTICLE_VISIBILITIES = Object.freeze({
  LOGGED_IN: 'logged_in',
});

const EDUCATION_REVISION_STATUSES = Object.freeze({
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
});

const EDUCATION_COMMENT_STATUSES = Object.freeze({
  VISIBLE: 'visible',
  HIDDEN: 'hidden',
  DELETED: 'deleted',
});

const EDUCATION_IMAGE_KINDS = Object.freeze({
  COVER: 'cover',
  INLINE: 'inline',
});

const EDUCATION_SORTS = Object.freeze({
  LATEST: 'latest',
  POPULAR: 'popular',
});

const EDUCATION_AUTHOR_BADGES = Object.freeze({
  DOCTOR: 'Ditulis Dokter',
  ADMIN: 'Ditulis Admin',
});

module.exports = {
  EDUCATION_ARTICLE_STATUSES,
  EDUCATION_ARTICLE_VISIBILITIES,
  EDUCATION_REVISION_STATUSES,
  EDUCATION_COMMENT_STATUSES,
  EDUCATION_IMAGE_KINDS,
  EDUCATION_SORTS,
  EDUCATION_AUTHOR_BADGES,
};
