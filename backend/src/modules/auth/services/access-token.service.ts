import { Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { durationToSeconds } from '../utils/security.util';

export interface AccessClaims extends JwtPayload { sub: string; sid: string; jti: string }

@Injectable()
export class AccessTokenService {
  constructor(private readonly config: ConfigService) {}

  issue(userId: string, sessionId: string): { token: string; expiresIn: number } {
    const privateKey = this.key('tokens.accessPrivateKey');
    const expiresIn = durationToSeconds(this.config.get<string>('tokens.accessTtl', '15m'), 900);
    const token = jwt.sign({ sid: sessionId }, privateKey, {
      algorithm: 'RS256', subject: userId, jwtid: randomUUID(),
      issuer: this.config.get<string>('tokens.issuer', 'ceylonswift-api'),
      audience: this.config.get<string>('tokens.audience', 'ceylonswift-clients'),
      expiresIn,
    });
    return { token, expiresIn };
  }

  verify(token: string): AccessClaims {
    try {
      const result = jwt.verify(token, this.key('tokens.accessPublicKey'), {
        algorithms: ['RS256'], issuer: this.config.get<string>('tokens.issuer', 'ceylonswift-api'),
        audience: this.config.get<string>('tokens.audience', 'ceylonswift-clients'),
      });
      if (typeof result === 'string' || !result.sub || typeof result.sid !== 'string' || !result.jti) throw new Error('claims');
      return result as AccessClaims;
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_INVALID_TOKEN', message: 'Authentication is required.', details: null });
    }
  }

  private key(path: string): string {
    const value = this.config.get<string>(path)?.replace(/\\n/g, '\n');
    if (!value) throw new ServiceUnavailableException({ code: 'AUTH_CONFIGURATION_UNAVAILABLE', message: 'Authentication is unavailable.', details: null });
    return value;
  }
}
