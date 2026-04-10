const { confirmEmailVerificationSchema } = require('../src/validators/authValidator');

describe('confirmEmailVerificationSchema', () => {
  test('normalizes OTP before validation', () => {
    const result = confirmEmailVerificationSchema.parse({
      email: 'patient@example.com',
      otp: '１２\u200b ３\u00a0４５６',
    });

    expect(result.otp).toBe('123456');
  });
});
