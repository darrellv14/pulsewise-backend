const crypto = require('crypto');
const mockVerifyIdToken = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: mockVerifyIdToken,
  })),
}));

jest.mock('../src/config/env', () => ({
  googleClientId: 'test-google-client-id.apps.googleusercontent.com',
  jwtSecret: 'test-jwt-secret',
  jwtExpiresIn: '1d',
  otpExpiresMinutes: 10,
  otpDebugExpose: false,
  nodeEnv: 'test',
}));

jest.mock('../src/repositories/userRepository', () => ({
  findUserByEmail: jest.fn(),
  findUserByGoogleIdentity: jest.fn(),
  findUserById: jest.fn(),
  createUserWithRole: jest.fn(),
  createEmailVerification: jest.fn(),
  deleteEmailVerificationsByEmail: jest.fn(),
  deleteEmailVerification: jest.fn(),
  findLatestValidEmailVerification: jest.fn(),
  consumeEmailVerification: jest.fn(),
  activateUserByEmail: jest.fn(),
  linkGoogleIdentity: jest.fn(),
  updatePendingUserRegistration: jest.fn(),
  updateUserPasswordHash: jest.fn(),
}));

jest.mock('../src/services/emailService', () => ({
  sendOtpEmail: jest.fn(),
}));

const userRepository = require('../src/repositories/userRepository');
const { sendOtpEmail } = require('../src/services/emailService');
const authService = require('../src/services/authService');

describe('authService.register', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('creates pending user, sends OTP, and returns email verification step for new email', async () => {
    userRepository.findUserByEmail.mockResolvedValue(null);
    userRepository.createUserWithRole.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      username: 'patient',
      email: 'patient@example.com',
      first_name: 'Pat',
      last_name: 'Ient',
      role: 'patient',
      account_status: 'pending_verification',
      email_verified_at: null,
      onboarding_completed: true,
    });
    userRepository.createEmailVerification.mockResolvedValue({
      verification_id: '22222222-2222-4222-8222-222222222222',
    });
    sendOtpEmail.mockResolvedValue(undefined);

    const result = await authService.register({
      username: 'patient',
      email: 'Patient@Example.com',
      password: 'password123',
      firstName: 'Pat',
      lastName: 'Ient',
      role: 'patient',
    });

    expect(userRepository.findUserByEmail).toHaveBeenCalledWith('patient@example.com');
    expect(userRepository.createUserWithRole).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'patient',
        email: 'patient@example.com',
        role: 'patient',
        accountStatus: 'pending_verification',
        emailVerifiedAt: null,
      })
    );
    expect(userRepository.createEmailVerification).toHaveBeenCalledTimes(1);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      nextStep: 'EMAIL_VERIFICATION_REQUIRED',
      user: {
        email: 'patient@example.com',
        accountStatus: 'pending_verification',
      },
    });
  });

  test('updates pending verification user, invalidates old OTP, and sends new OTP', async () => {
    userRepository.findUserByEmail.mockResolvedValue({
      user_id: '33333333-3333-4333-8333-333333333333',
      username: 'old_patient',
      email: 'patient@example.com',
      first_name: 'Old',
      last_name: 'Name',
      role: 'patient',
      account_status: 'pending_verification',
      email_verified_at: null,
      onboarding_completed: true,
    });
    userRepository.updatePendingUserRegistration.mockResolvedValue({
      user_id: '33333333-3333-4333-8333-333333333333',
      username: 'new_patient',
      email: 'patient@example.com',
      first_name: 'New',
      last_name: 'Name',
      role: 'patient',
      account_status: 'pending_verification',
      email_verified_at: null,
      onboarding_completed: true,
    });
    userRepository.deleteEmailVerificationsByEmail.mockResolvedValue(2);
    userRepository.createEmailVerification.mockResolvedValue({
      verification_id: '44444444-4444-4444-8444-444444444444',
    });
    sendOtpEmail.mockResolvedValue(undefined);

    const result = await authService.register({
      username: 'new_patient',
      email: 'patient@example.com',
      password: 'password123',
      firstName: 'New',
      lastName: 'Name',
      role: 'patient',
    });

    expect(userRepository.updatePendingUserRegistration).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: '33333333-3333-4333-8333-333333333333',
        username: 'new_patient',
        firstName: 'New',
        lastName: 'Name',
        passwordHash: expect.any(String),
      })
    );
    expect(userRepository.deleteEmailVerificationsByEmail).toHaveBeenCalledWith(
      'patient@example.com'
    );
    expect(userRepository.createEmailVerification).toHaveBeenCalledTimes(1);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      nextStep: 'EMAIL_VERIFICATION_REQUIRED',
      user: {
        username: 'new_patient',
        email: 'patient@example.com',
        accountStatus: 'pending_verification',
      },
    });
  });

  test('rejects register when email already belongs to active account', async () => {
    userRepository.findUserByEmail.mockResolvedValue({
      user_id: '55555555-5555-4555-8555-555555555555',
      email: 'patient@example.com',
      account_status: 'active',
      role: 'patient',
    });

    await expect(
      authService.register({
        username: 'patient',
        email: 'patient@example.com',
        password: 'password123',
        firstName: 'Pat',
        lastName: 'Ient',
        role: 'patient',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Username atau email sudah terdaftar',
    });

    expect(userRepository.createUserWithRole).not.toHaveBeenCalled();
    expect(userRepository.updatePendingUserRegistration).not.toHaveBeenCalled();
    expect(sendOtpEmail).not.toHaveBeenCalled();
  });
});

describe('authService.sendEmailVerification', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('hard-fail: rollback OTP record when email provider fails', async () => {
    const providerError = new Error('Mail provider gagal');

    userRepository.findUserByEmail.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      email: 'patient@example.com',
    });

    userRepository.createEmailVerification.mockResolvedValue({
      verification_id: '22222222-2222-4222-8222-222222222222',
    });

    userRepository.deleteEmailVerification.mockResolvedValue(true);
    sendOtpEmail.mockRejectedValue(providerError);

    await expect(authService.sendEmailVerification('Patient@Example.com')).rejects.toBe(
      providerError
    );

    expect(userRepository.findUserByEmail).toHaveBeenCalledWith('patient@example.com');
    expect(userRepository.createEmailVerification).toHaveBeenCalledTimes(1);
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(userRepository.deleteEmailVerification).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222'
    );
  });
});

describe('authService.confirmEmailVerification', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('accepts OTP copied from email with hidden formatting and Unicode digits', async () => {
    userRepository.findLatestValidEmailVerification.mockResolvedValue({
      verification_id: '33333333-3333-4333-8333-333333333333',
      otp_code_hash: crypto.createHash('sha256').update('123456').digest('hex'),
    });

    userRepository.activateUserByEmail.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      username: 'patient',
      email: 'patient@example.com',
      first_name: 'Pat',
      last_name: 'Ient',
      role: 'patient',
      account_status: 'active',
      email_verified_at: '2026-04-10T10:43:08.257Z',
    });

    const result = await authService.confirmEmailVerification(
      'Patient@Example.com',
      '١٢\u200b ٣\u00a0٤\u200d٥\u2060٦'
    );

    expect(userRepository.findLatestValidEmailVerification).toHaveBeenCalledWith(
      'patient@example.com'
    );
    expect(userRepository.consumeEmailVerification).toHaveBeenCalledWith(
      '33333333-3333-4333-8333-333333333333'
    );
    expect(userRepository.activateUserByEmail).toHaveBeenCalledWith('patient@example.com');
    expect(result.accountStatus).toBe('active');
    expect(result.user.email).toBe('patient@example.com');
  });
});

describe('authService.beginGoogleAuth', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns registration step for first-time Google account', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-001',
        email: 'NewUser@example.com',
        email_verified: true,
        given_name: 'New',
        family_name: 'User',
        picture: 'https://example.com/avatar.png',
      }),
    });
    userRepository.findUserByGoogleIdentity.mockResolvedValue(null);

    const result = await authService.beginGoogleAuth('google-id-token', 'patient');

    expect(userRepository.findUserByGoogleIdentity).toHaveBeenCalledWith({
      googleSub: 'google-sub-001',
      email: 'newuser@example.com',
    });
    expect(result.nextStep).toBe('COMPLETE_REGISTRATION');
    expect(result.accountExists).toBe(false);
    expect(result.registrationCompleted).toBe(false);
    expect(result.otpRequired).toBe(true);
    expect(result.registrationToken).toEqual(expect.any(String));
    expect(result.googleProfile.email).toBe('newuser@example.com');
  });

  test('rejects Google auth when email already belongs to password account', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-009',
        email: 'existing.password@example.com',
        email_verified: true,
      }),
    });
    userRepository.findUserByGoogleIdentity.mockResolvedValue({
      user_id: '77777777-7777-4777-8777-777777777777',
      email: 'existing.password@example.com',
      google_sub: null,
      account_status: 'active',
      onboarding_completed: true,
      role: 'patient',
    });

    await expect(authService.beginGoogleAuth('google-id-token', 'patient')).rejects.toMatchObject({
      statusCode: 409,
      message:
        'Email ini sudah terdaftar dengan metode email/password. Gunakan login email/password.',
    });

    expect(userRepository.linkGoogleIdentity).not.toHaveBeenCalled();
  });
});

describe('authService.completeGoogleRegistration', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('creates pending Google account and sends OTP', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-002',
        email: 'google.signup@example.com',
        email_verified: true,
        given_name: 'Google',
        family_name: 'Signup',
      }),
    });
    userRepository.findUserByGoogleIdentity.mockResolvedValueOnce(null);

    const beginResult = await authService.beginGoogleAuth('google-id-token', 'patient');

    userRepository.findUserByGoogleIdentity.mockResolvedValueOnce(null);
    userRepository.createUserWithRole.mockResolvedValue({
      user_id: '44444444-4444-4444-8444-444444444444',
      username: 'google_signup',
      email: 'google.signup@example.com',
      first_name: 'Google',
      last_name: 'Signup',
      role: 'patient',
      account_status: 'pending_verification',
      email_verified_at: null,
      onboarding_completed: true,
    });
    userRepository.createEmailVerification.mockResolvedValue({
      verification_id: '55555555-5555-4555-8555-555555555555',
    });
    sendOtpEmail.mockResolvedValue(undefined);

    const result = await authService.completeGoogleRegistration({
      registrationToken: beginResult.registrationToken,
      username: 'google_signup',
      role: 'patient',
    });

    expect(userRepository.createUserWithRole).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'google_signup',
        email: 'google.signup@example.com',
        googleSub: 'google-sub-002',
        onboardingCompleted: true,
        accountStatus: 'pending_verification',
      })
    );
    expect(sendOtpEmail).toHaveBeenCalledTimes(1);
    expect(result.nextStep).toBe('VERIFY_OTP');
    expect(result.user.email).toBe('google.signup@example.com');
  });

  test('rejects Google registration completion when email already belongs to password account', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-sub-010',
        email: 'locked@example.com',
        email_verified: true,
      }),
    });
    userRepository.findUserByGoogleIdentity.mockResolvedValueOnce(null);

    const beginResult = await authService.beginGoogleAuth('google-id-token', 'patient');

    userRepository.findUserByGoogleIdentity.mockResolvedValueOnce({
      user_id: '88888888-8888-4888-8888-888888888888',
      email: 'locked@example.com',
      google_sub: null,
      account_status: 'active',
      onboarding_completed: true,
      role: 'patient',
    });

    await expect(
      authService.completeGoogleRegistration({
        registrationToken: beginResult.registrationToken,
        username: 'locked_user',
        role: 'patient',
      })
    ).rejects.toMatchObject({
      statusCode: 409,
      message:
        'Email ini sudah terdaftar dengan metode email/password. Gunakan login email/password.',
    });
  });
});

describe('authService.getCurrentUser', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('returns avatarPhoto from current user record', async () => {
    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      username: 'patient',
      email: 'patient@example.com',
      first_name: 'Pat',
      last_name: 'Ient',
      avatar_photo: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.png',
      role: 'patient',
      account_status: 'active',
      email_verified_at: '2026-04-10T10:43:08.257Z',
    });

    const result = await authService.getCurrentUser('11111111-1111-4111-8111-111111111111');

    expect(userRepository.findUserById).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111'
    );
    expect(result.avatarPhoto).toBe('https://res.cloudinary.com/demo/image/upload/v1/avatar.png');
  });
});

describe('authService.changePassword', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('changes password for email/password account and asks client to login again', async () => {
    const passwordHash = await require('bcrypt').hash('old-password', 10);

    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      email: 'patient@example.com',
      password_hash: passwordHash,
      google_sub: null,
      role: 'patient',
    });
    userRepository.updateUserPasswordHash.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
    });

    const result = await authService.changePassword('11111111-1111-4111-8111-111111111111', {
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmNewPassword: 'new-password-123',
    });

    expect(userRepository.updateUserPasswordHash).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      expect.any(String)
    );
    expect(result).toEqual({
      nextStep: 'LOGIN_AGAIN',
    });
  });

  test('rejects change password for Google account', async () => {
    const passwordHash = await require('bcrypt').hash('old-password', 10);

    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      email: 'patient@example.com',
      password_hash: passwordHash,
      google_sub: 'google-sub-001',
      role: 'patient',
    });

    await expect(
      authService.changePassword('11111111-1111-4111-8111-111111111111', {
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
        confirmNewPassword: 'new-password-123',
      })
    ).rejects.toMatchObject({
      statusCode: 403,
      message: 'Ubah password hanya tersedia untuk akun email/password',
      details: {
        nextStep: 'USE_GOOGLE_LOGIN',
      },
    });

    expect(userRepository.updateUserPasswordHash).not.toHaveBeenCalled();
  });

  test('rejects when current password is wrong', async () => {
    const passwordHash = await require('bcrypt').hash('old-password', 10);

    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      email: 'patient@example.com',
      password_hash: passwordHash,
      google_sub: null,
      role: 'patient',
    });

    await expect(
      authService.changePassword('11111111-1111-4111-8111-111111111111', {
        currentPassword: 'wrong-password',
        newPassword: 'new-password-123',
        confirmNewPassword: 'new-password-123',
      })
    ).rejects.toMatchObject({
      statusCode: 401,
      message: 'Password saat ini salah',
    });

    expect(userRepository.updateUserPasswordHash).not.toHaveBeenCalled();
  });

  test('rejects when new password is same as current password', async () => {
    const passwordHash = await require('bcrypt').hash('same-password', 10);

    userRepository.findUserById.mockResolvedValue({
      user_id: '11111111-1111-4111-8111-111111111111',
      email: 'patient@example.com',
      password_hash: passwordHash,
      google_sub: null,
      role: 'patient',
    });

    await expect(
      authService.changePassword('11111111-1111-4111-8111-111111111111', {
        currentPassword: 'same-password',
        newPassword: 'same-password',
        confirmNewPassword: 'same-password',
      })
    ).rejects.toMatchObject({
      statusCode: 400,
      message: 'Password baru tidak boleh sama dengan password saat ini',
    });

    expect(userRepository.updateUserPasswordHash).not.toHaveBeenCalled();
  });
});
