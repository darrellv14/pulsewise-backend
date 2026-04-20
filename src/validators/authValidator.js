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
  role: z.enum(['patient', 'doctor', 'admin']).default('patient'),
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

const googleOauthSchema = z.object({
  idToken: z.string(),
  role: z.enum(['patient', 'doctor']).default('patient'),
});

const googleOauthRegisterSchema = z.object({
  registrationToken: z.string(),
  username: z.string().trim().min(3).max(100),
  firstName: optionalNullableString(100),
  lastName: optionalNullableString(100),
  role: z.enum(['patient', 'doctor']).default('patient'),
});

module.exports = {
  registerSchema,
  loginSchema,
  sendEmailVerificationSchema,
  confirmEmailVerificationSchema,
  googleOauthSchema,
  googleOauthRegisterSchema,
};
