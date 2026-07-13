import { randomBytes } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { MfaService } from './mfa.service';

describe('MfaService', () => {
  const service = new MfaService(new ConfigService({ mfaEncryptionKey: randomBytes(32).toString('base64') }));

  it('encrypts TOTP secrets at rest and decrypts them', () => {
    const secret = 'TEST-TOTP-SECRET'; const encrypted = service.encryptSecret(secret);
    expect(encrypted.toString()).not.toContain(secret);
    expect(service.decryptSecret(encrypted)).toBe(secret);
  });

  it('generates one-time-display recovery codes and hashes them', async () => {
    const [code] = service.generateRecoveryCodes(1); expect(code).toBeTruthy();
    const hash = await service.hashRecoveryCode(code!);
    expect(hash).not.toContain(code!);
    await expect(service.verifyRecoveryCode(hash, code!)).resolves.toBe(true);
    await expect(service.verifyRecoveryCode(hash, 'wrong')).resolves.toBe(false);
  });
});
