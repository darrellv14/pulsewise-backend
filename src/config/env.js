require('dotenv').config({ override: true });

function ensureEnv(name, fallback) {
  const value = process.env[name] || fallback;
  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function parseDatabaseUrl(databaseUrl) {
  if (!databaseUrl) {
    return null;
  }

  try {
    const parsed = new URL(databaseUrl);
    const dbName = parsed.pathname ? parsed.pathname.replace(/^\//, '') : null;
    const sslMode = parsed.searchParams.get('sslmode');

    return {
      host: parsed.hostname || null,
      port: parsed.port ? Number(parsed.port) : null,
      database: dbName || null,
      user: parsed.username ? decodeURIComponent(parsed.username) : null,
      password: parsed.password ? decodeURIComponent(parsed.password) : null,
      sslRequired: sslMode === 'require',
    };
  } catch (_error) {
    return null;
  }
}

const parsedDbUrl = parseDatabaseUrl(process.env.DATABASE_URL);

function pickPostgresValue(envName, parsedValue, fallback) {
  if (parsedValue !== undefined && parsedValue !== null && String(parsedValue).trim() !== '') {
    return parsedValue;
  }

  return process.env[envName] || fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: process.env.DIRECT_URL || '',
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
  cloudinary: {
    url: process.env.CLOUDINARY_URL || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    uploadFolder: process.env.CLOUDINARY_UPLOAD_FOLDER || 'pulsewise/avatar',
  },
  rateLimit: {
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  },
  postgres: {
    host: ensureEnv(
      'POSTGRES_HOST',
      pickPostgresValue('POSTGRES_HOST', parsedDbUrl?.host, 'localhost')
    ),
    port: Number(pickPostgresValue('POSTGRES_PORT', parsedDbUrl?.port, 5432)),
    database: ensureEnv(
      'POSTGRES_DB',
      pickPostgresValue('POSTGRES_DB', parsedDbUrl?.database, 'pulsewise')
    ),
    user: ensureEnv(
      'POSTGRES_USER',
      pickPostgresValue('POSTGRES_USER', parsedDbUrl?.user, 'pulsewise')
    ),
    password: ensureEnv(
      'POSTGRES_PASSWORD',
      pickPostgresValue('POSTGRES_PASSWORD', parsedDbUrl?.password, 'pulsewise123')
    ),
    ssl: process.env.POSTGRES_SSL === 'true' || Boolean(parsedDbUrl?.sslRequired),
    sslRejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === 'true',
  },
};

module.exports = env;
