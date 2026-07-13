import { environmentSchema } from './environment.schema';

describe('environmentSchema', () => {
  const valid = {
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://ceylonswift:local@localhost:5432/ceylonswift_test',
    FRONTEND_ORIGINS: 'http://localhost:5500',
  };

  it('accepts the local development configuration', () => {
    const result = environmentSchema.validate(valid, { abortEarly: false });
    const value = result.value as Record<string, unknown>;
    expect(result.error).toBeUndefined();
    expect(value.PORT).toBe(4000);
    expect(value.API_PREFIX).toBe('/api/v1');
  });

  it('rejects a missing database URL', () => {
    const result = environmentSchema.validate({ ...valid, DATABASE_URL: undefined });
    expect(result.error?.message).toContain('DATABASE_URL');
  });

  it('rejects insecure production cookies', () => {
    const result = environmentSchema.validate({
      ...valid,
      NODE_ENV: 'production',
      FRONTEND_ORIGINS: 'https://app.ceylonswift.com',
      COOKIE_SECURE: false,
    });
    expect(result.error).toBeDefined();
  });

  it('rejects localhost CORS origins in production', () => {
    const result = environmentSchema.validate({
      ...valid,
      NODE_ENV: 'production',
      COOKIE_SECURE: true,
    });
    expect(result.error).toBeDefined();
  });

  it('rejects wildcard credentialed CORS origins', () => {
    const result = environmentSchema.validate({ ...valid, FRONTEND_ORIGINS: '*' });
    expect(result.error).toBeDefined();
  });

  it('rejects the test OTP provider in production', () => {
    const result = environmentSchema.validate({
      ...valid,
      NODE_ENV: 'production',
      FRONTEND_ORIGINS: 'https://app.ceylonswift.com',
      COOKIE_SECURE: true,
      OTP_PROVIDER: 'test',
    });
    expect(result.error).toBeDefined();
  });

  it('accepts a fully hardened production configuration', () => {
    const result = environmentSchema.validate({
      ...valid, NODE_ENV: 'production', FRONTEND_ORIGINS: 'https://app.ceylonswift.example', COOKIE_SECURE: true,
      PUBLIC_BASE_URL: 'https://api.ceylonswift.example', ACCESS_TOKEN_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\nsynthetic\n-----END PRIVATE KEY-----',
      ACCESS_TOKEN_PUBLIC_KEY: '-----BEGIN PUBLIC KEY-----\nsynthetic\n-----END PUBLIC KEY-----', PASSWORD_PEPPER: 'x'.repeat(32),
      MFA_ENCRYPTION_KEY: 'y'.repeat(32), BACKGROUND_JOBS_ENABLED: true, AUTH_RATE_LIMIT_STORE: 'distributed', OTP_PROVIDER: 'disabled',
    }, { abortEarly: false });
    expect(result.error).toBeUndefined();
  });
});
