import { createHash } from 'crypto';
import OpenAI from 'openai';
import pRetry from 'p-retry';
import { getSharedModule } from './internal/dependencies';

export interface EmbeddingRequest {
  id?: string;
  text: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingResponse {
  id: string;
  embedding: number[];
  cached: boolean;
  tokens: number;
  cost: number;
  model: string;
  metadata?: Record<string, any>;
}

export interface EmbeddingUsage {
  totalTokens: number;
  totalCost: number;
  totalRequests: number;
  cacheHits: number;
}

export interface EmbeddingsConfig {
  model?: string;
  batchSize?: number;
  apiKey?: string;
  pricePerThousandTokens?: number;
  provider?: EmbeddingsProvider;
}

export interface EmbeddingsProviderResult {
  embedding: number[];
  tokens: number;
  model: string;
}

export interface EmbeddingsProvider {
  embed(inputs: string[], model: string): Promise<EmbeddingsProviderResult[]>;
}

const DEFAULT_MODEL = 'text-embedding-3-small';
const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_PRICE_PER_1K = 0.00002;

const { createLogger } = getSharedModule();
const logger = createLogger('EmbeddingsService');

export class EmbeddingsService {
  private readonly cache = new Map<string, EmbeddingsProviderResult>();
  private readonly usage: EmbeddingUsage = {
    totalTokens: 0,
    totalCost: 0,
    totalRequests: 0,
    cacheHits: 0,
  };

  private readonly model: string;
  private readonly batchSize: number;
  private readonly pricePerThousandTokens: number;
  private readonly provider: EmbeddingsProvider;

  constructor(config: EmbeddingsConfig = {}) {
    this.model = config.model ?? DEFAULT_MODEL;
    this.batchSize = config.batchSize ?? DEFAULT_BATCH_SIZE;
    this.pricePerThousandTokens = config.pricePerThousandTokens ?? DEFAULT_PRICE_PER_1K;
    this.provider = config.provider ?? new OpenAIEmbeddingsProvider(config.apiKey, this.model);
  }

  async embed(requests: EmbeddingRequest[]): Promise<EmbeddingResponse[]> {
    const responses: EmbeddingResponse[] = [];
    const toEmbed: { request: EmbeddingRequest; cacheKey: string; index: number }[] = [];

    requests.forEach((request, index) => {
      const cacheKey = this.computeCacheKey(request.text);
      const cached = this.cache.get(cacheKey);
      if (cached) {
        this.usage.cacheHits += 1;
        responses[index] = {
          id: request.id ?? cacheKey,
          embedding: cached.embedding,
          cached: true,
          tokens: cached.tokens,
          cost: 0,
          model: cached.model,
          metadata: request.metadata,
        };
      } else {
        toEmbed.push({ request, cacheKey, index });
      }
    });

    for (let i = 0; i < toEmbed.length; i += this.batchSize) {
      const batch = toEmbed.slice(i, i + this.batchSize);
      const inputs = batch.map((item) => item.request.text);
      this.usage.totalRequests += 1;

      const providerResults = await this.provider.embed(inputs, this.model);
      if (providerResults.length !== batch.length) {
        throw new Error('Embedding provider returned unexpected result length');
      }

      providerResults.forEach((result, idx) => {
        const { request, cacheKey, index } = batch[idx];
        const cost = (result.tokens / 1000) * this.pricePerThousandTokens;

        this.cache.set(cacheKey, result);
        this.usage.totalTokens += result.tokens;
        this.usage.totalCost += cost;

        responses[index] = {
          id: request.id ?? cacheKey,
          embedding: result.embedding,
          cached: false,
          tokens: result.tokens,
          cost,
          model: result.model,
          metadata: request.metadata,
        };
      });
    }

    return responses;
  }

  getUsage(): EmbeddingUsage {
    return { ...this.usage };
  }

  private computeCacheKey(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }
}

class OpenAIEmbeddingsProvider implements EmbeddingsProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string | undefined, model: string) {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OPENAI_API_KEY is required for embeddings but was not provided');
    }
    this.model = model;
    this.client = new OpenAI({ apiKey: key });
  }

  async embed(inputs: string[], model: string): Promise<EmbeddingsProviderResult[]> {
    const operation = async () => {
      const response = await this.client.embeddings.create({
        model,
        input: inputs,
      });

      const totalTokens = response.usage?.total_tokens ?? estimateTokens(inputs.join(' '));
      const perItemTokens = Math.max(1, Math.round(totalTokens / Math.max(inputs.length, 1)));

      return response.data.map((item) => ({
        embedding: item.embedding as number[],
        tokens: perItemTokens,
        model: response.model ?? this.model,
      }));
    };

    return pRetry(operation, {
      retries: 3,
      onFailedAttempt: (error) => {
        logger.warn('Embedding request failed, retrying', {
          attemptNumber: error.attemptNumber,
          retriesLeft: error.retriesLeft,
          message: error.message,
        });
      },
    });
  }
}

function estimateTokens(text: string): number {
  if (!text.trim()) {
    return 0;
  }
  return Math.max(1, Math.round(text.length / 4));
}
