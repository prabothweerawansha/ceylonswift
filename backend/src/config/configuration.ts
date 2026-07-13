export type CookieSameSite = 'lax' | 'strict' | 'none';

export interface ApplicationConfiguration {
  nodeEnv: 'development' | 'test' | 'production';
  port: number;
  apiPrefix: string;
  databaseUrl: string;
  frontendOrigins: string[];
  jsonBodyLimit: string;
  cookie: { secure: boolean; sameSite: CookieSameSite; domain?: string; name: string; path: string };
  tokens: {
    accessPrivateKey?: string;
    accessPublicKey?: string;
    accessTtl: string;
    refreshTtl: string;
    issuer: string;
    audience: string;
  };
  passwordPepper?: string;
  mfaEncryptionKey?: string;
  otp: { provider: string; ttlSeconds: number; maxAttempts: number; resendSeconds: number };
  webauthn: { rpId: string; rpName: string; allowedOrigins: string[] };
  trustProxy: boolean;
  authRateLimitStore: string;
  google: {
    clientId?: string;
    clientSecret?: string;
    callbackUrl?: string;
    allowedRedirectOrigins: string[];
  };
  logLevel: string;
  serviceName: string;
  serviceVersion: string;
  requestTimeoutMs: number;
  idempotency: { ttlSeconds: number; inProgressTimeoutSeconds: number };
  observability: { metricsEnabled: boolean; tracingEnabled: boolean };
  jobs: { enabled: boolean; intervalSeconds: number; batchSize: number; maxRetries: number };
  retention: {
    loginAttemptsDays: number;
    challengesDays: number;
    sessionsDays: number;
    invitationsDays: number;
    idempotencyDays: number;
    auditDays: number;
  };
}

export const parseCsvOrigins = (value: string | undefined): string[] => {
  if (!value) return [];
  return [...new Set(value.split(',').map((origin) => origin.trim()).filter(Boolean))];
};

export default (): ApplicationConfiguration => ({
  nodeEnv: (process.env.NODE_ENV ?? 'development') as ApplicationConfiguration['nodeEnv'],
  port: Number(process.env.PORT ?? 4000),
  apiPrefix: process.env.API_PREFIX ?? '/api/v1',
  databaseUrl: process.env.DATABASE_URL ?? '',
  frontendOrigins: parseCsvOrigins(process.env.FRONTEND_ORIGINS),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT ?? '1mb',
  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',
    sameSite: (process.env.COOKIE_SAME_SITE ?? 'lax') as CookieSameSite,
    ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    name: process.env.REFRESH_COOKIE_NAME ?? 'ceylonswift_refresh',
    path: process.env.REFRESH_COOKIE_PATH ?? '/api/v1/auth',
  },
  tokens: {
    ...(process.env.ACCESS_TOKEN_PRIVATE_KEY
      ? { accessPrivateKey: process.env.ACCESS_TOKEN_PRIVATE_KEY }
      : {}),
    ...(process.env.ACCESS_TOKEN_PUBLIC_KEY
      ? { accessPublicKey: process.env.ACCESS_TOKEN_PUBLIC_KEY }
      : {}),
    accessTtl: process.env.ACCESS_TOKEN_TTL ?? '15m',
    refreshTtl: process.env.REFRESH_TOKEN_TTL ?? '30d',
    issuer: process.env.ACCESS_TOKEN_ISSUER ?? 'ceylonswift-api',
    audience: process.env.ACCESS_TOKEN_AUDIENCE ?? 'ceylonswift-clients',
  },
  ...(process.env.PASSWORD_PEPPER ? { passwordPepper: process.env.PASSWORD_PEPPER } : {}),
  ...(process.env.MFA_ENCRYPTION_KEY ? { mfaEncryptionKey: process.env.MFA_ENCRYPTION_KEY } : {}),
  google: {
    ...(process.env.GOOGLE_CLIENT_ID ? { clientId: process.env.GOOGLE_CLIENT_ID } : {}),
    ...(process.env.GOOGLE_CLIENT_SECRET ? { clientSecret: process.env.GOOGLE_CLIENT_SECRET } : {}),
    ...(process.env.GOOGLE_CALLBACK_URL ? { callbackUrl: process.env.GOOGLE_CALLBACK_URL } : {}),
    allowedRedirectOrigins: parseCsvOrigins(process.env.GOOGLE_ALLOWED_REDIRECT_ORIGINS),
  },
  otp: {
    provider: process.env.OTP_PROVIDER ?? 'disabled',
    ttlSeconds: Number(process.env.OTP_TTL_SECONDS ?? 300),
    maxAttempts: Number(process.env.OTP_MAX_ATTEMPTS ?? 5),
    resendSeconds: Number(process.env.OTP_RESEND_SECONDS ?? 60),
  },
  webauthn: {
    rpId: process.env.WEBAUTHN_RP_ID ?? 'localhost',
    rpName: process.env.WEBAUTHN_RP_NAME ?? 'CeylonSwift',
    allowedOrigins: parseCsvOrigins(process.env.WEBAUTHN_ALLOWED_ORIGINS),
  },
  trustProxy: process.env.TRUST_PROXY === 'true',
  authRateLimitStore: process.env.AUTH_RATE_LIMIT_STORE ?? 'memory',
  logLevel: process.env.LOG_LEVEL ?? 'info',
  serviceName: process.env.SERVICE_NAME ?? 'ceylonswift-api',
  serviceVersion: process.env.SERVICE_VERSION ?? '0.1.0',
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 15000),
  idempotency: {
    ttlSeconds: Number(process.env.IDEMPOTENCY_TTL_SECONDS ?? 86400),
    inProgressTimeoutSeconds: Number(process.env.IDEMPOTENCY_IN_PROGRESS_TIMEOUT_SECONDS ?? 120),
  },
  observability: {
    metricsEnabled: process.env.METRICS_ENABLED !== 'false',
    tracingEnabled: process.env.TRACING_ENABLED !== 'false',
  },
  jobs: {
    enabled: process.env.BACKGROUND_JOBS_ENABLED === 'true',
    intervalSeconds: Number(process.env.BACKGROUND_JOBS_INTERVAL_SECONDS ?? 900),
    batchSize: Number(process.env.CLEANUP_BATCH_SIZE ?? 250),
    maxRetries: Number(process.env.JOB_MAX_RETRIES ?? 3),
  },
  retention: {
    loginAttemptsDays: Number(process.env.RETENTION_LOGIN_ATTEMPTS_DAYS ?? 90),
    challengesDays: Number(process.env.RETENTION_CHALLENGES_DAYS ?? 7),
    sessionsDays: Number(process.env.RETENTION_SESSIONS_DAYS ?? 90),
    invitationsDays: Number(process.env.RETENTION_INVITATIONS_DAYS ?? 90),
    idempotencyDays: Number(process.env.RETENTION_IDEMPOTENCY_DAYS ?? 7),
    auditDays: Number(process.env.RETENTION_AUDIT_DAYS ?? 2555),
  },
});
