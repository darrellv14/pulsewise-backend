jest.mock('../src/repositories/userRepository', () => ({
  findUserByEmail: jest.fn(),
  createEmailVerification: jest.fn(),
  deleteEmailVerification: jest.fn(),
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
