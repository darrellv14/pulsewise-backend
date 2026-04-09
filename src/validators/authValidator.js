const Joi = require('joi');

const allowedRoles = ['patient', 'doctor', 'admin'];
const emailRule = Joi.string().trim().email({ tlds: { allow: false } }).max(255);

const registerSchema = Joi.object({
  username: Joi.string().trim().min(3).max(100).required(),
  email: emailRule.required(),
  password: Joi.string().min(8).max(128).required(),
  firstName: Joi.string().trim().max(100).allow('', null),
  lastName: Joi.string().trim().max(100).allow('', null),
  role: Joi.string().valid(...allowedRoles).default('patient'),
});

const loginSchema = Joi.object({
  email: emailRule.required(),
  password: Joi.string().required(),
});

const sendEmailVerificationSchema = Joi.object({
  email: emailRule.required(),
});

const confirmEmailVerificationSchema = Joi.object({
  email: emailRule.required(),
  otp: Joi.string().trim().length(6).pattern(/^[0-9]+$/).required(),
});

const googleOauthSchema = Joi.object({
  idToken: Joi.string().required(),
  role: Joi.string().valid('patient', 'doctor').default('patient'),
});

module.exports = {
  registerSchema,
  loginSchema,
  sendEmailVerificationSchema,
  confirmEmailVerificationSchema,
  googleOauthSchema,
};
