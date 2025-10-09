import { RetryOptions } from '../types';

type AsyncFn<T> = () => Promise<T>;

export const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 250,
  maxDelayMs: 5_000,
  factor: 2,
  jitter: true,
};

function getDelay(attempt: number, options: RetryOptions): number {
  const { baseDelayMs, factor, maxDelayMs, jitter } = options;
  const delay = Math.min(baseDelayMs * Math.pow(factor, attempt), maxDelayMs);
  if (!jitter) {
    return delay;
  }
  const random = Math.random();
  return Math.round(delay * (0.5 + random / 2));
}

export async function retryWithBackoff<T>(fn: AsyncFn<T>, options?: Partial<RetryOptions>): Promise<T> {
  const config: RetryOptions = { ...defaultRetryOptions, ...options };
  let attempt = 0;
  let lastError: unknown;

  while (attempt <= config.maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === config.maxRetries) {
        break;
      }

      const delay = getDelay(attempt, config);
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }

  throw lastError;
}
