const { z } = require('zod');

const optionalNullableString = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.null()]).optional();

const emailRule = z.string().trim().email().max(255);

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
  otp: z
    .string()
    .trim()
    .length(6)
    .regex(/^[0-9]+$/, 'OTP harus berisi angka'),
});

const googleOauthSchema = z.object({
  idToken: z.string(),
  role: z.enum(['patient', 'doctor']).default('patient'),
});

module.exports = {
  registerSchema,
  loginSchema,
  sendEmailVerificationSchema,
  confirmEmailVerificationSchema,
  googleOauthSchema,
};
