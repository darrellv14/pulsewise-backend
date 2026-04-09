require('dotenv').config();

function ensureEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  jwtSecret: ensureEnv('JWT_SECRET', 'replace_with_strong_secret'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  otpDebugExpose: process.env.OTP_DEBUG_EXPOSE === 'true',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  mailtrap: {
    token: process.env.MAILTRAP_TOKEN || '',
    senderEmail: process.env.MAILTRAP_SENDER_EMAIL || 'hello@demomailtrap.co',
    senderName: process.env.MAILTRAP_SENDER_NAME || 'PulseWise',
  },
  postgres: {
    host: ensureEnv('POSTGRES_HOST', 'localhost'),
    port: Number(process.env.POSTGRES_PORT || 5432),
    database: ensureEnv('POSTGRES_DB', 'pulsewise'),
    user: ensureEnv('POSTGRES_USER', 'pulsewise'),
    password: ensureEnv('POSTGRES_PASSWORD', 'pulsewise123'),
  },
};

module.exports = env;
