function expectObjectKeys(actual, expectedKeys) {
  expect(Object.keys(actual).sort()).toEqual([...expectedKeys].sort());
}

function expectSuccessEnvelope(response, message) {
  expect(response.body).toEqual(
    expect.objectContaining({
      success: true,
      message,
    })
  );
  expect(response.body).toHaveProperty('data');
}

function expectFailureEnvelope(response, status, message) {
  expect(response.status).toBe(status);
  expect(response.body).toEqual(
    expect.objectContaining({
      success: false,
      message,
    })
  );
}

module.exports = {
  expectObjectKeys,
  expectSuccessEnvelope,
  expectFailureEnvelope,
};
