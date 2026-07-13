import * as Joi from 'joi';

const localhostOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

export const environmentSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().port().default(4000),
  API_PREFIX: Joi.string().valid('/api/v1').default('/api/v1'),
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
  FRONTEND_ORIGINS: Joi.string().required(),
  JSON_BODY_LIMIT: Joi.string().pattern(/^\d+(kb|mb)$/i).default('1mb'),
  COOKIE_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  COOKIE_SAME_SITE: Joi.string().valid('lax', 'strict', 'none').default('lax'),
  COOKIE_DOMAIN: Joi.string().allow('').optional(),
  REFRESH_COOKIE_NAME: Joi.string().pattern(/^[A-Za-z0-9_-]+$/).default('ceylonswift_refresh'),
  REFRESH_COOKIE_PATH: Joi.string().pattern(/^\//).default('/api/v1/auth'),
  ACCESS_TOKEN_PRIVATE_KEY: Joi.string().allow('').optional(),
  ACCESS_TOKEN_PUBLIC_KEY: Joi.string().allow('').optional(),
  ACCESS_TOKEN_TTL: Joi.string().default('15m'),
  REFRESH_TOKEN_TTL: Joi.string().default('30d'),
  ACCESS_TOKEN_ISSUER: Joi.string().default('ceylonswift-api'),
  ACCESS_TOKEN_AUDIENCE: Joi.string().default('ceylonswift-clients'),
  PASSWORD_PEPPER: Joi.string().allow('').optional(),
  MFA_ENCRYPTION_KEY: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_ID: Joi.string().allow('').optional(),
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  GOOGLE_CALLBACK_URL: Joi.string().uri({ scheme: ['http', 'https'] }).allow('').optional(),
  GOOGLE_ALLOWED_REDIRECT_ORIGINS: Joi.string().allow('').optional(),
  OTP_PROVIDER: Joi.string().valid('disabled', 'test', 'sms', 'email').default('disabled'),
  OTP_TTL_SECONDS: Joi.number().integer().min(60).max(900).default(300),
  OTP_MAX_ATTEMPTS: Joi.number().integer().min(3).max(10).default(5),
  OTP_RESEND_SECONDS: Joi.number().integer().min(30).max(600).default(60),
  WEBAUTHN_RP_ID: Joi.string().default('localhost'),
  WEBAUTHN_RP_NAME: Joi.string().default('CeylonSwift'),
  WEBAUTHN_ALLOWED_ORIGINS: Joi.string().allow('').default('http://localhost:5500'),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false),
  AUTH_RATE_LIMIT_STORE: Joi.string().valid('memory', 'distributed').default('memory'),
  LOG_LEVEL: Joi.string().valid('fatal', 'error', 'warn', 'info', 'debug', 'trace').default('info'),
  SERVICE_NAME: Joi.string().max(100).default('ceylonswift-api'),
  SERVICE_VERSION: Joi.string().max(64).default('0.1.0'),
  REQUEST_TIMEOUT_MS: Joi.number().integer().min(1000).max(120000).default(15000),
  IDEMPOTENCY_TTL_SECONDS: Joi.number().integer().min(60).max(604800).default(86400),
  IDEMPOTENCY_IN_PROGRESS_TIMEOUT_SECONDS: Joi.number().integer().min(10).max(1800).default(120),
  METRICS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  TRACING_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  BACKGROUND_JOBS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
  BACKGROUND_JOBS_INTERVAL_SECONDS: Joi.number().integer().min(60).max(86400).default(900),
  CLEANUP_BATCH_SIZE: Joi.number().integer().min(10).max(5000).default(250),
  JOB_MAX_RETRIES: Joi.number().integer().min(1).max(10).default(3),
  RETENTION_LOGIN_ATTEMPTS_DAYS: Joi.number().integer().min(7).max(3650).default(90),
  RETENTION_CHALLENGES_DAYS: Joi.number().integer().min(1).max(365).default(7),
  RETENTION_SESSIONS_DAYS: Joi.number().integer().min(7).max(3650).default(90),
  RETENTION_INVITATIONS_DAYS: Joi.number().integer().min(7).max(3650).default(90),
  RETENTION_IDEMPOTENCY_DAYS: Joi.number().integer().min(1).max(365).default(7),
  RETENTION_AUDIT_DAYS: Joi.number().integer().min(365).max(7300).default(2555),
  PUBLIC_BASE_URL: Joi.string().uri({ scheme: ['http', 'https'] }).allow('').optional(),
  LEGACY_DEMO_MODE: Joi.boolean().truthy('true').falsy('false').default(false),
  PRODUCTION_TOOLS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
}).custom((env: Record<string, unknown>, helpers) => {
  const frontendOriginsValue = typeof env.FRONTEND_ORIGINS === 'string' ? env.FRONTEND_ORIGINS : '';
  const googleOriginsValue = typeof env.GOOGLE_ALLOWED_REDIRECT_ORIGINS === 'string'
    ? env.GOOGLE_ALLOWED_REDIRECT_ORIGINS
    : '';
  const frontendOrigins = frontendOriginsValue.split(',').map((value) => value.trim());
  const googleOrigins = googleOriginsValue.split(',').map((value) => value.trim()).filter(Boolean);
  if ([...frontendOrigins, ...googleOrigins].includes('*')) {
    return helpers.error('any.custom', { message: 'Wildcard origins are not allowed' });
  }
  if (env.NODE_ENV === 'production' && env.COOKIE_SECURE !== true) {
    return helpers.error('any.custom', { message: 'COOKIE_SECURE must be true in production' });
  }
  if (env.NODE_ENV === 'production' && env.OTP_PROVIDER === 'test') {
    return helpers.error('any.custom', { message: 'Test OTP provider is forbidden in production' });
  }
  if (env.COOKIE_SAME_SITE === 'none' && env.COOKIE_SECURE !== true) {
    return helpers.error('any.custom', { message: 'SameSite=None requires secure cookies' });
  }
  if (env.NODE_ENV === 'production') {
    if (frontendOrigins.some((origin) => localhostOrigin.test(origin))) {
      return helpers.error('any.custom', { message: 'Production CORS origins cannot use localhost' });
    }
    if (typeof env.PUBLIC_BASE_URL !== 'string' || !env.PUBLIC_BASE_URL.startsWith('https://')) {
      return helpers.error('any.custom', { message: 'PUBLIC_BASE_URL must use HTTPS in production' });
    }
    const privateKey = typeof env.ACCESS_TOKEN_PRIVATE_KEY === 'string' ? env.ACCESS_TOKEN_PRIVATE_KEY : '';
    const publicKey = typeof env.ACCESS_TOKEN_PUBLIC_KEY === 'string' ? env.ACCESS_TOKEN_PUBLIC_KEY : '';
    if (!privateKey.includes('BEGIN PRIVATE KEY') || !publicKey.includes('BEGIN PUBLIC KEY')) {
      return helpers.error('any.custom', { message: 'Valid RS256 signing keys are required in production' });
    }
    if (typeof env.PASSWORD_PEPPER !== 'string' || env.PASSWORD_PEPPER.length < 32) {
      return helpers.error('any.custom', { message: 'A strong password pepper is required in production' });
    }
    if (typeof env.MFA_ENCRYPTION_KEY !== 'string' || env.MFA_ENCRYPTION_KEY.length < 32) {
      return helpers.error('any.custom', { message: 'A strong MFA encryption key is required in production' });
    }
    if (env.LEGACY_DEMO_MODE === true || env.PRODUCTION_TOOLS_ENABLED === true) {
      return helpers.error('any.custom', { message: 'Demo and provisioning tools are forbidden in production' });
    }
    if (env.BACKGROUND_JOBS_ENABLED !== true) {
      return helpers.error('any.custom', { message: 'Background jobs must be configured in production' });
    }
    if (env.AUTH_RATE_LIMIT_STORE === 'memory') {
      return helpers.error('any.custom', { message: 'A distributed rate-limit store is required in production' });
    }
  }
  return env;
});
