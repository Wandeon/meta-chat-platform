import { RetrievalResult, createLogger } from '@meta-chat/shared';
import { keywordSearch, vectorSearch, Prisma } from '@meta-chat/database';
import { TenantRuntimeConfig } from './config-cache';

interface HybridScore {
  id: string;
  similarity?: number;
  rank?: number;
  data: any;
}

export class RagRetriever {
  private readonly logger = createLogger('RagRetriever');

  async retrieve(
    tenantId: string,
    query: string,
    config: TenantRuntimeConfig,
  ): Promise<RetrievalResult[]> {
    const ragConfig = config.settings.ragConfig;
    if (!ragConfig) {
      return [];
    }

    const { topK = 5, minSimilarity = 0.5, hybridWeights } = ragConfig;

    let vectorResults: any[] = [];
    try {
      vectorResults = await vectorSearch(tenantId, await this.embedQuery(query, config), topK, minSimilarity);
    } catch (error) {
      // Vector search may fail if embeddings are unavailable; fallback to keyword only
      this.logger.warn('Vector search failed, falling back to keyword results', error as Error);
    }

    const keywordResults = await keywordSearch(tenantId, query, topK);

    const keywordMaxRank = keywordResults.reduce((max: number, item: any) => Math.max(max, Number(item.rank ?? 0)), 0);
    const weights = {
      keyword: hybridWeights?.keyword ?? 0.3,
      vector: hybridWeights?.vector ?? 0.7,
    };

    const combined = new Map<string, HybridScore>();

    for (const item of vectorResults as any[]) {
      const id = item.id as string;
      const existing = combined.get(id) ?? { id, data: item };
      existing.similarity = Number(item.similarity ?? 0);
      existing.data = item;
      combined.set(id, existing);
    }

    for (const item of keywordResults as any[]) {
      const id = item.id as string;
      const existing = combined.get(id) ?? { id, data: item };
      existing.rank = Number(item.rank ?? 0);
      existing.data = { ...existing.data, ...item };
      combined.set(id, existing);
    }

    const results: RetrievalResult[] = [];

    for (const { data, similarity, rank } of combined.values()) {
      const keywordScore = keywordMaxRank > 0 ? (rank ?? 0) / keywordMaxRank : 0;
      const vectorScore = similarity ?? 0;
      const score = weights.vector * vectorScore + weights.keyword * keywordScore;

      results.push({
        chunk: {
          id: String(data.id),
          documentId: String(data.documentId),
          content: String(data.content ?? ''),
          embedding: [],
          metadata: { ...this.parseMetadata(data.metadata), source: String(data.documentId) },
        },
        score,
        type:
          similarity && keywordScore
            ? 'hybrid'
            : similarity
            ? 'vector'
            : 'keyword',
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  private async embedQuery(query: string, _config: TenantRuntimeConfig): Promise<number[]> {
    // Placeholder deterministic embedding using simple hashing to avoid external dependencies
    const vector = new Array(32).fill(0);
    for (let i = 0; i < query.length; i++) {
      const index = i % vector.length;
      vector[index] += query.charCodeAt(i) / 255;
    }
    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm === 0 ? vector : vector.map((value) => value / norm);
  }

  private parseMetadata(metadata: any): Record<string, any> {
    if (!metadata) {
      return {};
    }

    if (this.isJson(metadata)) {
      return JSON.parse(JSON.stringify(metadata));
    }

    if (typeof metadata === 'string') {
      try {
        return JSON.parse(metadata) as Record<string, any>;
      } catch {
        return { value: metadata };
      }
    }

    return { value: metadata };
  }

  private isJson(value: unknown): value is Prisma.JsonValue {
    return typeof value === 'object' || typeof value === 'number' || typeof value === 'boolean';
  }
}

