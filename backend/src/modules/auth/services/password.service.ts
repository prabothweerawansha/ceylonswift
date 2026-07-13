import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import argon2 from 'argon2';

@Injectable()
export class PasswordService {
  constructor(private readonly config: ConfigService) {}

  async hash(password: string): Promise<string> {
    return argon2.hash(this.withPepper(password), { type: argon2.argon2id, memoryCost: 19456, timeCost: 3, parallelism: 1 });
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, this.withPepper(password));
    } catch {
      return false;
    }
  }

  private withPepper(password: string): string {
    const pepper = this.config.get<string>('passwordPepper');
    if (!pepper) throw new ServiceUnavailableException({ code: 'AUTH_CONFIGURATION_UNAVAILABLE', message: 'Authentication is unavailable.', details: null });
    return `${password}\u0000${pepper}`;
  }
}
