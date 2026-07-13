import { withRetry } from './retry-policy';

describe('withRetry', () => {
  it('retries transient failures with a bound', async () => {
    let calls = 0;
    await expect(withRetry(() => { calls += 1; return calls < 3 ? Promise.reject(new Error('temporary')) : Promise.resolve('ok'); }, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1, isTransient: () => true })).resolves.toBe('ok');
    expect(calls).toBe(3);
  });

  it('does not retry permanent failures', async () => {
    let calls = 0;
    await expect(withRetry(() => { calls += 1; return Promise.reject(new Error('validation')); }, { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 1, isTransient: () => false })).rejects.toThrow('validation');
    expect(calls).toBe(1);
  });
});
