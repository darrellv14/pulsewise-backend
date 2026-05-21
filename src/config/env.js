require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const isDevelopment = !isProduction && !isTest;

function ensureEnv(name, fallback, options = {}) {
  const value = process.env[name] || fallback;
  const hasExplicitValue =
    process.env[name] !== undefined && process.env[name] !== null && process.env[name] !== '';

  if (value === undefined || value === null || String(value).trim() === '') {
    throw new Error(`Missing environment variable: ${name}`);
  }

  if (
    options.disallowLiteralInProduction &&
    isProduction &&
    options.disallowLiteralInProduction.includes(value)
  ) {
    throw new Error(`Unsafe fallback is not allowed for ${name} in production`);
  }

  if (
    options.disallowImplicitFallbackInProduction &&
    isProduction &&
    !hasExplicitValue &&
    value === fallback
  ) {
    throw new Error(`Unsafe fallback is not allowed for ${name} in production`);
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

function getDirectDatabaseUrl() {
  if (process.env.DIRECT_DATABASE_URL) {
    return process.env.DIRECT_DATABASE_URL;
  }

  if (process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }

  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('prisma://')) {
    return process.env.DATABASE_URL;
  }

  return '';
}

const directDatabaseUrl = getDirectDatabaseUrl();
const parsedDbUrl = parseDatabaseUrl(directDatabaseUrl);

function pickPostgresValue(envName, parsedValue, fallback) {
  if (parsedValue !== undefined && parsedValue !== null && String(parsedValue).trim() !== '') {
    return parsedValue;
  }

  return process.env[envName] || fallback;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction,
  isDevelopment,
  isTest,
  port: Number(process.env.PORT || 5000),
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '20mb',
  databaseUrl: process.env.DATABASE_URL || '',
  directUrl: directDatabaseUrl,
  jwtSecret: ensureEnv('JWT_SECRET', 'replace_with_strong_secret', {
    disallowLiteralInProduction: ['replace_with_strong_secret'],
  }),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  otpExpiresMinutes: Number(process.env.OTP_EXPIRES_MINUTES || 10),
  otpDebugExpose: process.env.OTP_DEBUG_EXPOSE === 'true',
  canExposeOtpDebugData:
    process.env.OTP_DEBUG_EXPOSE === 'true' && (isDevelopment || isTest),
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
    avatarMaxBytes: Number(process.env.CLOUDINARY_AVATAR_MAX_BYTES || 2 * 1024 * 1024),
    avatarMaxWidth: Number(process.env.CLOUDINARY_AVATAR_MAX_WIDTH || 512),
    avatarMaxHeight: Number(process.env.CLOUDINARY_AVATAR_MAX_HEIGHT || 512),
    avatarAllowedFormats: process.env.CLOUDINARY_AVATAR_ALLOWED_FORMATS || 'jpg,jpeg,png,webp',
    avatarQuality: process.env.CLOUDINARY_AVATAR_QUALITY || 'auto:good',
  },
  rateLimit: {
    authWindowMs: Number(process.env.RATE_LIMIT_AUTH_WINDOW_MS || 15 * 60 * 1000),
    authMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  },
  auth: {
    recheckUserOnProtectedRoutes:
      !isTest &&
      (process.env.AUTH_RECHECK_USER ? process.env.AUTH_RECHECK_USER === 'true' : true),
  },
  cors: {
    allowAllOrigins: process.env.CORS_ALLOW_ALL === 'true' || isDevelopment || isTest,
    allowedOrigins: String(process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  redis: {
    enabled: process.env.REDIS_ENABLED
      ? process.env.REDIS_ENABLED === 'true'
      : Boolean(isProduction || process.env.REDIS_URL || process.env.REDIS_HOST),
    url: process.env.REDIS_URL || '',
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || '',
    db: Number(process.env.REDIS_DB || 0),
    prefix: process.env.REDIS_PREFIX || 'pw',
  },
  cache: {
    dashboardListTtlSeconds: Number(process.env.CACHE_DASHBOARD_LIST_TTL_SECONDS || 30),
    dashboardSummaryTtlSeconds: Number(process.env.CACHE_DASHBOARD_SUMMARY_TTL_SECONDS || 30),
    dashboardVitalsTtlSeconds: Number(process.env.CACHE_DASHBOARD_VITALS_TTL_SECONDS || 30),
    dashboardAbnormalReportTtlSeconds: Number(
      process.env.CACHE_DASHBOARD_ABNORMAL_REPORT_TTL_SECONDS || 30
    ),
    diaryByDateTtlSeconds: Number(process.env.CACHE_DIARY_BY_DATE_TTL_SECONDS || 30),
    sleepByDateTtlSeconds: Number(process.env.CACHE_SLEEP_BY_DATE_TTL_SECONDS || 30),
  },
  metrics: {
    enabled: process.env.METRICS_ENABLED === 'true',
    token: process.env.METRICS_TOKEN || '',
  },
  mlService: {
    baseUrl: process.env.ML_SERVICE_BASE_URL || 'http://localhost:8080',
    timeoutMs: Number(process.env.ML_SERVICE_TIMEOUT_MS || 20000),
    version: Number(process.env.ML_SERVICE_VERSION || 3),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
    privateKeyId: process.env.FIREBASE_PRIVATE_KEY_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    privateKey: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : '',
    androidChannelId: process.env.FCM_ANDROID_CHANNEL_ID || 'pulsewise_reminders',
  },
  nutritionEstimation: {
    enabled: process.env.NUTRITION_ESTIMATION_ENABLED === 'true',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    geminiBaseUrl:
      process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    model: process.env.NUTRITION_ESTIMATION_MODEL || 'gemini-3-flash-preview',
    models: String(
      process.env.NUTRITION_ESTIMATION_MODELS || process.env.NUTRITION_ESTIMATION_MODEL || ''
    )
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    timeoutMs: Math.max(1000, Number(process.env.NUTRITION_ESTIMATION_TIMEOUT_MS || 45000)),
    maxOutputTokens: Math.max(
      100,
      Number(process.env.NUTRITION_ESTIMATION_MAX_OUTPUT_TOKENS || 1200)
    ),
    thinkingLevel: process.env.NUTRITION_ESTIMATION_THINKING_LEVEL || 'minimal',
    maxRequestsPerMinutePerModel: Math.max(
      1,
      Number(process.env.NUTRITION_ESTIMATION_MAX_REQUESTS_PER_MINUTE_PER_MODEL || 4)
    ),
    maxRequestsPerDayPerModel: Math.max(
      1,
      Number(process.env.NUTRITION_ESTIMATION_MAX_REQUESTS_PER_DAY_PER_MODEL || 19)
    ),
  },
  schedulers: {
    enabled: process.env.FCM_SCHEDULER_ENABLED === 'true',
    medicationReminderEnabled: process.env.MEDICATION_REMINDER_CRON_ENABLED === 'true',
    timeZone: process.env.MEDICATION_REMINDER_TIMEZONE || 'Asia/Jakarta',
    medicationReminderLookbackMinutes: Math.max(
      1,
      Number(process.env.MEDICATION_REMINDER_LOOKBACK_MINUTES || 2)
    ),
    medicationReminderTickMs: Math.max(
      1000,
      Number(process.env.MEDICATION_REMINDER_TICK_MS || 60 * 1000)
    ),
  },
  postgres: {
    host: ensureEnv(
      'POSTGRES_HOST',
      pickPostgresValue('POSTGRES_HOST', parsedDbUrl?.host, 'localhost'),
      { disallowImplicitFallbackInProduction: true }
    ),
    port: Number(pickPostgresValue('POSTGRES_PORT', parsedDbUrl?.port, 5432)),
    database: ensureEnv(
      'POSTGRES_DB',
      pickPostgresValue('POSTGRES_DB', parsedDbUrl?.database, 'pulsewise'),
      { disallowImplicitFallbackInProduction: true }
    ),
    user: ensureEnv(
      'POSTGRES_USER',
      pickPostgresValue('POSTGRES_USER', parsedDbUrl?.user, 'pulsewise'),
      { disallowImplicitFallbackInProduction: true }
    ),
    password: ensureEnv(
      'POSTGRES_PASSWORD',
      pickPostgresValue('POSTGRES_PASSWORD', parsedDbUrl?.password, 'pulsewise123'),
      { disallowImplicitFallbackInProduction: true }
    ),
    ssl: process.env.POSTGRES_SSL === 'true' || Boolean(parsedDbUrl?.sslRequired),
    sslRejectUnauthorized: process.env.POSTGRES_SSL_REJECT_UNAUTHORIZED === 'true',
  },
};

module.exports = env;
