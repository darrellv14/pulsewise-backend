function buildPagination({ page, limit, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    page,
    limit,
    totalItems,
    totalPages,
  };
}

function toPositiveInt(value, fallback) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

function normalizePaginationInput(query, defaults = {}) {
  const defaultPage = toPositiveInt(defaults.page, 1);
  const defaultLimit = toPositiveInt(defaults.limit, 20);

  return {
    page: toPositiveInt(query?.page, defaultPage),
    limit: toPositiveInt(query?.limit, defaultLimit),
  };
}

module.exports = {
  buildPagination,
  normalizePaginationInput,
};
