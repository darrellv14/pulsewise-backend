const { z } = require('zod');
const { normalizeOtp } = require('../utils/otp');

const optionalNullableString = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.null()]).optional();

const emailRule = z.string().trim().email().max(255);
const otpRule = z.preprocess(
  (value) => {
    if (typeof value === 'string' || typeof value === 'number') {
      return normalizeOtp(value);
    }

    return value;
  },
  z
    .string()
    .length(6, 'OTP harus 6 digit')
    .regex(/^[0-9]+$/, 'OTP harus berisi angka')
);

const registerSchema = z.object({
  username: z.string().trim().min(3).max(100),
  email: emailRule,
  password: z.string().min(8).max(128),
  firstName: optionalNullableString(100),
  lastName: optionalNullableString(100),
  role: z.enum(['patient', 'doctor']).default('patient'),
});

const loginSchema = z.object({
  email: emailRule,
  password: z.string(),
});

const sendEmailVerificationSchema = z.object({
  email: emailRule,
});

const confirmEmailVerificationSchema = z.object({
  email: emailRule,
  otp: otpRule,
});

const googleOauthSchema = z
  .object({
    idToken: z.string().min(1).optional(),
    accessToken: z.string().min(1).optional(),
    role: z.enum(['patient', 'doctor']).default('patient'),
  })
  .refine((value) => Boolean(value.idToken || value.accessToken), {
    message: 'idToken atau accessToken wajib diisi',
    path: ['idToken'],
  });

const googleOauthRegisterSchema = z.object({
  registrationToken: z.string(),
  username: z.string().trim().min(3).max(100),
  firstName: optionalNullableString(100),
  lastName: optionalNullableString(100),
  role: z.enum(['patient', 'doctor']).default('patient'),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Password saat ini wajib diisi').max(128),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(128),
    confirmNewPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: 'Konfirmasi password baru tidak sama',
    path: ['confirmNewPassword'],
  });

const forgotPasswordSchema = z.object({
  email: emailRule,
});

const verifyForgotPasswordOtpSchema = z.object({
  email: emailRule,
  otp: otpRule,
});

const resetForgotPasswordSchema = z
  .object({
    resetToken: z.string().min(1, 'Reset token wajib diisi'),
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter').max(128),
    confirmNewPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.newPassword === value.confirmNewPassword, {
    message: 'Konfirmasi password baru tidak sama',
    path: ['confirmNewPassword'],
  });

const accountDeletionRequestSchema = z.object({
  confirmationText: z
    .string()
    .trim()
    .refine((value) => value === 'HAPUS AKUN', {
      message: 'Confirmation text harus persis HAPUS AKUN',
    }),
  reauthMethod: z.enum(['password', 'otp', 'google']),
});

const accountDeletionConfirmSchema = z.object({
  deletionToken: z.string().min(1, 'Deletion token wajib diisi'),
  password: z.string().min(1).max(128).optional(),
  otp: otpRule.optional(),
  googleIdToken: z.string().min(1).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  sendEmailVerificationSchema,
  confirmEmailVerificationSchema,
  googleOauthSchema,
  googleOauthRegisterSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  verifyForgotPasswordOtpSchema,
  resetForgotPasswordSchema,
  accountDeletionRequestSchema,
  accountDeletionConfirmSchema,
};
