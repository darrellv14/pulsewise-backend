const { buildPagination } = require('../src/utils/pagination');

describe('pagination utility', () => {
  test('clamps page metadata to total pages when request exceeds available pages', () => {
    expect(
      buildPagination({
        page: 3,
        limit: 20,
        totalItems: 0,
      })
    ).toEqual({
      page: 1,
      limit: 20,
      totalItems: 0,
      totalPages: 1,
    });
  });

  test('preserves valid page metadata within available pages', () => {
    expect(
      buildPagination({
        page: 2,
        limit: 20,
        totalItems: 30,
      })
    ).toEqual({
      page: 2,
      limit: 20,
      totalItems: 30,
      totalPages: 2,
    });
  });
});
