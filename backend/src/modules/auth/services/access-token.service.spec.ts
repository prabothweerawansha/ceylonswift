import { generateKeyPairSync } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { AccessTokenService } from './access-token.service';

describe('AccessTokenService', () => {
  const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKey = keys.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  const publicKey = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
  const config = new ConfigService({ tokens: { accessPrivateKey: privateKey, accessPublicKey: publicKey, accessTtl: '15m', issuer: 'test-issuer', audience: 'test-audience' } });
  const service = new AccessTokenService(config);

  it('issues and validates an RS256 token with required claims', () => {
    const issued = service.issue('user-id', 'session-id');
    const claims = service.verify(issued.token);
    expect(claims).toEqual(expect.objectContaining({ sub: 'user-id', sid: 'session-id', iss: 'test-issuer', aud: 'test-audience' }));
    expect(claims.jti).toBeTruthy(); expect(claims.iat).toBeTruthy(); expect(claims.exp).toBeTruthy();
  });

  it.each([
    ['wrong issuer', { issuer: 'other', audience: 'test-audience', expiresIn: 60 }],
    ['wrong audience', { issuer: 'test-issuer', audience: 'other', expiresIn: 60 }],
    ['expired', { issuer: 'test-issuer', audience: 'test-audience', expiresIn: -1 }],
  ])('rejects %s', (_name, options) => {
    const token = jwt.sign({ sid: 'session-id' }, privateKey, { algorithm: 'RS256', subject: 'user-id', jwtid: 'jti', ...options });
    expect(() => service.verify(token)).toThrow(UnauthorizedException);
  });

  it('rejects invalid signatures and algorithm substitution', () => {
    const otherKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });
    const invalid = jwt.sign({ sid: 'session-id' }, otherKeys.privateKey, { algorithm: 'RS256', subject: 'user-id', jwtid: 'jti', issuer: 'test-issuer', audience: 'test-audience' });
    const unsigned = jwt.sign({ sid: 'session-id', sub: 'user-id' }, 'not-used', { algorithm: 'HS256', issuer: 'test-issuer', audience: 'test-audience' });
    expect(() => service.verify(invalid)).toThrow(UnauthorizedException);
    expect(() => service.verify(unsigned)).toThrow(UnauthorizedException);
  });
});
