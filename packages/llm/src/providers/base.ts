import {
  CircuitBreaker,
  defaultCircuitBreakerOptions,
} from '../utils/circuitBreaker';
import { defaultRetryOptions, retryWithBackoff } from '../utils/retry';
import {
  CircuitBreakerOptions,
  CompletionChunk,
  CompletionParams,
  CompletionResponse,
  LLMProvider,
  ProviderConfig,
  ProviderInfo,
  RetryOptions,
} from '../types';

export abstract class BaseLLMProvider implements LLMProvider {
  protected readonly retryOptions: RetryOptions;
  protected readonly circuitBreaker: CircuitBreaker;

  constructor(protected readonly config: ProviderConfig) {
    this.retryOptions = { ...defaultRetryOptions, ...config.retry };
    const circuitBreakerOptions: CircuitBreakerOptions = {
      ...defaultCircuitBreakerOptions,
      ...config.circuitBreaker,
    };
    this.circuitBreaker = new CircuitBreaker(circuitBreakerOptions);
  }

  public async complete(params: CompletionParams): Promise<CompletionResponse> {
    return this.executeWithPolicies(() => this.doComplete(params));
  }

  public streamComplete(_params: CompletionParams): AsyncIterable<CompletionChunk> {
    throw new Error('Streaming not implemented for this provider');
  }

  public async embed(_texts: string[]): Promise<number[][]> {
    throw new Error('Embeddings not implemented for this provider');
  }

  public abstract getInfo(): ProviderInfo;

  protected abstract doComplete(params: CompletionParams): Promise<CompletionResponse>;

  protected async executeWithPolicies<T>(fn: () => Promise<T>): Promise<T> {
    const guarded = () => retryWithBackoff(fn, this.retryOptions);
    return this.circuitBreaker.execute(guarded);
  }
}
