const { success } = require('../src/utils/response');

describe('response utils', () => {
  test('success serializes nested BigInt values safely', () => {
    const json = jest.fn();
    const res = {
      status: jest.fn().mockReturnValue({ json }),
    };

    success(
      res,
      'ok',
      {
        readingId: 1484n,
        items: [{ logId: 99n }],
      },
      201
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(json).toHaveBeenCalledWith({
      success: true,
      message: 'ok',
      data: {
        readingId: '1484',
        items: [{ logId: '99' }],
      },
    });
  });
});
