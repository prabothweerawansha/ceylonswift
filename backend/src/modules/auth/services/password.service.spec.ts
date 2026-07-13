import { ConfigService } from '@nestjs/config';
import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService(new ConfigService({ passwordPepper: 'test-only-pepper' }));

  it('hashes with Argon2id and never persists plaintext', async () => {
    const password = 'Correct horse battery staple!';
    const hash = await service.hash(password);
    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain(password);
  });

  it('accepts the correct password and rejects an incorrect password', async () => {
    const hash = await service.hash('correct-password');
    await expect(service.verify(hash, 'correct-password')).resolves.toBe(true);
    await expect(service.verify(hash, 'wrong-password')).resolves.toBe(false);
  });
});
