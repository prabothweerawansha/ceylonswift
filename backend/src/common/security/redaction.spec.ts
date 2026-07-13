import { redactSensitive, safeFailureMessage } from './redaction';

describe('central redaction', () => {
  it('redacts nested credentials, contact data, and addresses', () => {
    expect(redactSensitive({ password: 'x', nested: { accessToken: 'y', recipientPhone: '1', deliveryAddress: { line1: 'private' }, ok: 2 } }))
      .toEqual({ password: '[REDACTED]', nested: { accessToken: '[REDACTED]', recipientPhone: '[REDACTED]', deliveryAddress: '[REDACTED]', ok: 2 } });
  });

  it('removes database credentials from failure messages', () => {
    expect(safeFailureMessage(new Error('failed postgresql://user:pass@db/private'))).not.toContain('pass');
  });
});
