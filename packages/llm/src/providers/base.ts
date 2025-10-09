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
  FetchLike,
  LLMProvider,
  PricingConfig,
  ProviderConfig,
  ProviderInfo,
  RetryOptions,
} from '../types';
import { CostTracker } from '../utils/cost-tracker';

export abstract class BaseLLMProvider implements LLMProvider {
  protected readonly retryOptions: RetryOptions;
  protected readonly circuitBreaker: CircuitBreaker;
  protected readonly costTracker?: CostTracker;
  protected readonly pricing?: PricingConfig;
  protected readonly httpClient?: FetchLike;

  constructor(protected readonly config: ProviderConfig) {
    this.retryOptions = { ...defaultRetryOptions, ...config.retry };
    const circuitBreakerOptions: CircuitBreakerOptions = {
      ...defaultCircuitBreakerOptions,
      ...config.circuitBreaker,
    };
    this.circuitBreaker = new CircuitBreaker(circuitBreakerOptions);
    this.costTracker = config.costTracker;
    this.pricing = config.pricing;
    this.httpClient = config.httpClient;
  }

  public async complete(params: CompletionParams): Promise<CompletionResponse> {
    const response = await this.executeWithPolicies(() => this.doComplete(params));
    this.trackUsage(response);
    return response;
  }

  public async *streamComplete(params: CompletionParams): AsyncIterable<CompletionChunk> {
    const stream = await this.executeWithPolicies(() => this.doStreamComplete(params));
    for await (const chunk of stream) {
      if (chunk.done && chunk.delta?.usage) {
        const response: CompletionResponse = {
          id: chunk.id,
          created: chunk.created,
          model: chunk.delta.model ?? this.config.model,
          content: chunk.delta.content ?? '',
          usage: chunk.delta.usage,
        };
        this.trackUsage(response);
      }
      yield chunk;
    }
  }

  public async embed(texts: string[]): Promise<number[][]> {
    return this.executeWithPolicies(() => this.doEmbed(texts));
  }

  public abstract getInfo(): ProviderInfo;

  protected abstract doComplete(params: CompletionParams): Promise<CompletionResponse>;

  protected async doStreamComplete(_params: CompletionParams): Promise<AsyncIterable<CompletionChunk>> {
    throw new Error('Streaming not implemented for this provider');
  }

  protected async doEmbed(_texts: string[]): Promise<number[][]> {
    throw new Error('Embeddings not implemented for this provider');
  }

  protected async executeWithPolicies<T>(fn: () => Promise<T>): Promise<T> {
    const guarded = () => retryWithBackoff(fn, this.retryOptions);
    return this.circuitBreaker.execute(guarded);
  }

  protected trackUsage(response: CompletionResponse, metadata: Record<string, unknown> = {}): void {
    if (!this.costTracker || !response.usage) {
      return;
    }

    const promptTokens = response.usage.promptTokens ?? 0;
    const completionTokens = response.usage.completionTokens ?? 0;
    const totalTokens = response.usage.totalTokens ?? promptTokens + completionTokens;
    response.usage.totalTokens = totalTokens;

    let costInUsd = response.usage.costInUsd;
    if (costInUsd === undefined && this.pricing) {
      const promptRate = this.pricing.promptTokenUsdPer1K ?? 0;
      const completionRate = this.pricing.completionTokenUsdPer1K ?? 0;
      costInUsd = promptTokens * (promptRate / 1000) + completionTokens * (completionRate / 1000);
      response.usage.costInUsd = costInUsd;
    }

    this.costTracker.record({
      provider: this.config.provider,
      model: response.model,
      promptTokens,
      completionTokens,
      costInUsd,
      metadata: {
        responseId: response.id,
        ...metadata,
      },
    });
  }
}
