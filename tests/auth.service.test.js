const crypto = require('crypto');

jest.mock('../src/repositories/userRepository', () => ({
  findUserByEmail: jest.fn(),
  findUserById: jest.fn(),
  createEmailVerification: jest.fn(),
  deleteEmailVerification: jest.fn(),
  findLatestValidEmailVerification: jest.fn(),
  consumeEmailVerification: jest.fn(),
  activateUserByEmail: jest.fn(),
}));

jest.mock('../src/services/emailService', () => ({
  sendOtpEmail: jest.fn(),
}));

const userRepository = require('../src/repositories/userRepository');
const { sendOtpEmail } = require('../src/services/emailService');
const authService = require('../src/services/authService');

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
