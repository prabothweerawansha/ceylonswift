export interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  signal?: AbortSignal;
  isTransient: (error: unknown) => boolean;
  onRetry?: (attempt: number, delayMs: number, error: unknown) => void;
}

export async function withRetry<T>(operation: (attempt: number) => Promise<T>, options: RetryOptions): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt += 1) {
    if (options.signal?.aborted) throw options.signal.reason ?? new Error('Retry cancelled');
    try { return await operation(attempt); } catch (error) {
      lastError = error;
      if (attempt === options.maxAttempts || !options.isTransient(error)) throw error;
      const exponential = Math.min(options.maxDelayMs, options.baseDelayMs * (2 ** (attempt - 1)));
      const delayMs = Math.max(1, Math.round(exponential * (0.75 + Math.random() * 0.5)));
      options.onRetry?.(attempt, delayMs, error);
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, delayMs);
        options.signal?.addEventListener('abort', () => { clearTimeout(timer); const reason: unknown = options.signal ? options.signal.reason as unknown : undefined; reject(reason instanceof Error ? reason : new Error('Retry cancelled')); }, { once: true });
      });
    }
  }
  throw lastError;
}
