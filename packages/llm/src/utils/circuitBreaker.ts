import { CircuitBreakerOptions } from '../types';

type AsyncFn<T> = () => Promise<T>;

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export const defaultCircuitBreakerOptions: CircuitBreakerOptions = {
  failureThreshold: 5,
  cooldownMs: 15_000,
  halfOpenMaxCalls: 2,
};

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private nextAttempt = 0;
  private halfOpenAttempts = 0;

  constructor(private readonly options: CircuitBreakerOptions = defaultCircuitBreakerOptions) {}

  public async execute<T>(fn: AsyncFn<T>): Promise<T> {
    const now = Date.now();

    if (this.state === 'OPEN') {
      if (now >= this.nextAttempt) {
        this.state = 'HALF_OPEN';
        this.halfOpenAttempts = 0;
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    if (this.state === 'HALF_OPEN' && this.halfOpenAttempts >= this.options.halfOpenMaxCalls) {
      throw new Error('Circuit breaker is stabilising');
    }

    try {
      if (this.state === 'HALF_OPEN') {
        this.halfOpenAttempts += 1;
      }

      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  public isOpen(): boolean {
    return this.state === 'OPEN';
  }

  private recordFailure(): void {
    this.failureCount += 1;

    if (this.state === 'HALF_OPEN') {
      this.trip();
      return;
    }

    if (this.failureCount >= this.options.failureThreshold) {
      this.trip();
    }
  }

  private reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenAttempts = 0;
    this.nextAttempt = 0;
  }

  private trip(): void {
    this.state = 'OPEN';
    this.nextAttempt = Date.now() + this.options.cooldownMs;
  }
}
