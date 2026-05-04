const {
  changePasswordSchema,
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

describe('changePasswordSchema', () => {
  test('accepts valid change password payload', () => {
    const result = changePasswordSchema.parse({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmNewPassword: 'new-password-123',
    });

    expect(result.newPassword).toBe('new-password-123');
  });

  test('rejects when confirmNewPassword does not match', () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmNewPassword: 'different-password',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues[0].path).toEqual(['confirmNewPassword']);
  });
});
