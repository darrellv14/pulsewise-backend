const {
  confirmEmailVerificationSchema,
  googleOauthRegisterSchema,
} = require('../src/validators/authValidator');

describe('confirmEmailVerificationSchema', () => {
  test('normalizes OTP before validation', () => {
    const result = confirmEmailVerificationSchema.parse({
      email: 'patient@example.com',
      otp: '１２\u200b ３\u00a0４５６',
    });

    expect(result.otp).toBe('123456');
  });
});

describe('googleOauthRegisterSchema', () => {
  test('accepts Google registration payload with username and token', () => {
    const result = googleOauthRegisterSchema.parse({
      registrationToken: 'signed-token',
      username: 'new_google_user',
      firstName: 'New',
      lastName: 'User',
      role: 'patient',
    });

    expect(result.username).toBe('new_google_user');
    expect(result.registrationToken).toBe('signed-token');
  });
});
