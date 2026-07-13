import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';

@Injectable()
export class MfaService {
  constructor(private readonly config: ConfigService) {}
  encryptSecret(secret: string): Buffer {
    const key = this.key(); const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]);
  }
  decryptSecret(payload: Buffer): string {
    const iv = payload.subarray(0, 12); const tag = payload.subarray(12, 28); const data = payload.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key(), iv); decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }
  generateRecoveryCodes(count = 10): string[] { return Array.from({ length: count }, () => randomBytes(10).toString('base64url')); }
  hashRecoveryCode(code: string): Promise<string> { return argon2.hash(code, { type: argon2.argon2id }); }
  verifyRecoveryCode(hash: string, code: string): Promise<boolean> { return argon2.verify(hash, code).catch(() => false); }
  private key(): Buffer {
    const encoded = this.config.get<string>('mfaEncryptionKey');
    if (!encoded) throw new ServiceUnavailableException({ code: 'MFA_CONFIGURATION_UNAVAILABLE', message: 'MFA is unavailable.', details: null });
    const key = Buffer.from(encoded, 'base64'); if (key.length !== 32) throw new ServiceUnavailableException({ code: 'MFA_CONFIGURATION_UNAVAILABLE', message: 'MFA is unavailable.', details: null }); return key;
  }
}
