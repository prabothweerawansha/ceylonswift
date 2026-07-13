import { assertDevelopmentProvisioning, normalizedProvisioningEmail } from './provisioning-policy';

describe('provisioning policy', () => {
  const valid = { NODE_ENV: 'development', PROVISION_CONFIRM: 'CONFIRM', PROVISION_PASSWORD: 'a-strong-test-password', PASSWORD_PEPPER: 'pepper' };
  it('refuses production and missing explicit confirmation', () => {
    expect(() => assertDevelopmentProvisioning({ ...valid, NODE_ENV: 'production' }, 'CONFIRM')).toThrow('disabled in production');
    expect(() => assertDevelopmentProvisioning({ ...valid, PROVISION_CONFIRM: undefined }, 'CONFIRM')).toThrow('confirmation');
  });
  it('requires a strong environment password and pepper', () => {
    expect(() => assertDevelopmentProvisioning({ ...valid, PROVISION_PASSWORD: 'short' }, 'CONFIRM')).toThrow('14 characters');
    expect(() => assertDevelopmentProvisioning({ ...valid, PASSWORD_PEPPER: undefined }, 'CONFIRM')).toThrow('PASSWORD_PEPPER');
  });
  it('normalizes and validates email', () => {
    expect(normalizedProvisioningEmail(' Admin@Example.Test ')).toBe('admin@example.test');
    expect(() => normalizedProvisioningEmail('invalid')).toThrow();
  });
});
