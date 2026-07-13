const sensitiveKey = /password|passcode|otp|token|cookie|authorization|secret|private.?key|recovery.?code|phone|address/i;

export function redactSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSensitive);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, child]) => [
      key,
      sensitiveKey.test(key) ? '[REDACTED]' : redactSensitive(child),
    ]),
  );
}

export function safeFailureMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : 'Background operation failed';
  return raw.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, '[DATABASE_URL]').slice(0, 500);
}
