export function assertDevelopmentProvisioning(env: NodeJS.ProcessEnv, expectedConfirmation: string): void {
  if (env.NODE_ENV === 'production') throw new Error('Provisioning is disabled in production.');
  if (env.PROVISION_CONFIRM !== expectedConfirmation) throw new Error('Explicit provisioning confirmation is required.');
  if (!env.PROVISION_PASSWORD || env.PROVISION_PASSWORD.length < 14) throw new Error('PROVISION_PASSWORD must contain at least 14 characters.');
  if (!env.PASSWORD_PEPPER) throw new Error('PASSWORD_PEPPER is required.');
}

export function normalizedProvisioningEmail(value: string | undefined): string {
  const email = value?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('A valid normalized provisioning email is required.');
  return email;
}
