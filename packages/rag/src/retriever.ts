import type { DocumentChunk, RetrievalResult } from '@meta-chat/shared';
import { EmbeddingsService } from './embeddings';
import { getSharedModule, getDatabaseModule } from './internal/dependencies';

interface KeywordSearchRow {
  id: string;
  documentId: string;
  content: string;
  metadata: any;
  position: number;
  rank?: number;
}

interface VectorSearchRow {
  id: string;
  documentId: string;
  content: string;
  metadata: any;
  position: number;
  similarity?: number;
}

export interface RetrievalWeights {
  keyword?: number;
  vector?: number;
}

export interface RetrievalOptions {
  tenantId: string;
  query: string;
  topK?: number;
  minSimilarity?: number;
  weights?: RetrievalWeights;
}

export interface RetrievalDependencies {
  embeddings: EmbeddingsService;
  keywordSearch?: (tenantId: string, query: string, topK?: number) => Promise<any[]>;
  vectorSearch?: (
    tenantId: string,
    embedding: number[],
    topK?: number,
    minSimilarity?: number
  ) => Promise<any[]>;
}

const { createLogger } = getSharedModule();
const database = getDatabaseModule();
const fallbackKeywordSearch = database?.keywordSearch;
const fallbackVectorSearch = database?.vectorSearch;
const logger = createLogger('Retriever');

export async function retrieveKnowledgeBase(
  options: RetrievalOptions,
  dependencies: RetrievalDependencies
): Promise<RetrievalResult[]> {
  const topK = options.topK ?? 5;
  const keywordWeight = options.weights?.keyword ?? 0.3;
  const vectorWeight = options.weights?.vector ?? 0.7;
  const keywordFn = dependencies.keywordSearch ?? fallbackKeywordSearch;
  const vectorFn = dependencies.vectorSearch ?? fallbackVectorSearch;

  if (!keywordFn || !vectorFn) {
    throw new Error('Database search functions are not available. Provide keywordSearch and vectorSearch implementations.');
  }

  const [keywordResults, embedding] = await Promise.all([
    keywordFn(options.tenantId, options.query, topK * 2),
    dependencies.embeddings.embed([{ id: 'query', text: options.query }]),
  ]);

  const keywordRows = keywordResults as KeywordSearchRow[];
  const vectorInput = embedding[0]?.embedding ?? [];
  if (vectorInput.length === 0) {
    logger.warn('Embedding service returned empty vector for query');
  }

  const vectorResults = vectorInput.length
    ? ((await vectorFn(options.tenantId, vectorInput, topK * 2, options.minSimilarity ?? 0.7)) as VectorSearchRow[])
    : ([] as VectorSearchRow[]);

  const keywordMax = keywordRows.reduce<number>((max, item) => Math.max(max, Number(item.rank ?? 0)), 0) || 1;
  const vectorMax = vectorResults.reduce<number>((max, item) => Math.max(max, Number(item.similarity ?? 0)), 0) || 1;

  const combined = new Map<
    string,
    {
      chunk: DocumentChunk;
      keywordScore: number;
      vectorScore: number;
      fusedScore: number;
      type: RetrievalResult['type'];
    }
  >();

  for (const result of keywordRows) {
    const id = result.id as string;
    const score = Number(result.rank ?? 0) / keywordMax;
    const chunk = buildChunk(result);
    combined.set(id, {
      chunk,
      keywordScore: score,
      vectorScore: 0,
      fusedScore: score * keywordWeight,
      type: 'keyword',
    });
  }

  for (const result of vectorResults) {
    const id = result.id as string;
    const score = Number(result.similarity ?? 0) / vectorMax;
    const entry = combined.get(id);
    if (entry) {
      entry.vectorScore = score;
      entry.fusedScore = entry.keywordScore * keywordWeight + score * vectorWeight;
      entry.type = 'hybrid';
    } else {
      combined.set(id, {
        chunk: buildChunk(result),
        keywordScore: 0,
        vectorScore: score,
        fusedScore: score * vectorWeight,
        type: 'vector',
      });
    }
  }

  const sorted = Array.from(combined.values())
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, topK)
    .map((entry) => ({
      chunk: entry.chunk,
      score: entry.fusedScore,
      type: entry.type,
    }));

  return sorted;
}

function buildChunk(record: any): DocumentChunk {
  const metadata = normalizeMetadata(record.metadata);
  return {
    id: record.id,
    documentId: record.documentId,
    content: record.content,
    embedding: [],
    metadata: {
      ...metadata,
      source: metadata?.source ?? 'knowledge_base',
      position: record.position,
    },
  };
}

function normalizeMetadata(metadata: any): Record<string, any> {
  if (!metadata) {
    return {};
  }

  if (typeof metadata === 'string') {
    try {
      return JSON.parse(metadata);
    } catch {
      return { raw: metadata };
    }
  }

  if (typeof metadata === 'object') {
    return metadata as Record<string, any>;
  }

  return {};
}
