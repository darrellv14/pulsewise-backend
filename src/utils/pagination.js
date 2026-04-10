function buildPagination({ page, limit, totalItems }) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  return {
    page,
    limit,
    totalItems,
    totalPages,
  };
}

module.exports = {
  buildPagination,
};
