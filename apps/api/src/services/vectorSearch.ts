/**
 * Vector Search Service - Semantic search over document chunks using pgvector
 */

import { getPrismaClient } from '@meta-chat/database';
import { generateQueryEmbedding, type EmbeddingConfig } from './embedding';

const prisma = getPrismaClient();

export interface SearchResult {
  chunkId: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  position: number;
}

export interface SearchOptions {
  limit?: number; // Number of results to return
  minSimilarity?: number; // Minimum cosine similarity threshold (0-1)
  documentIds?: string[]; // Optional: limit search to specific documents
}

const DEFAULT_OPTIONS: Required<Omit<SearchOptions, 'documentIds'>> = {
  limit: 5,
  minSimilarity: 0.5,
};

/**
 * Search for relevant document chunks using semantic similarity
 */
export async function searchChunks(
  query: string,
  tenantId: string,
  embeddingConfig: EmbeddingConfig,
  options: SearchOptions = {}
): Promise<SearchResult[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log(`[VectorSearch] Searching for: "${query}" (tenant: ${tenantId})`);

  // Generate embedding for the query
  const queryEmbedding = await generateQueryEmbedding(query, embeddingConfig);

  // Convert embedding array to pgvector format
  const embeddingStr = `[${queryEmbedding.join(',')}]`;

  // Build the WHERE clause for document filtering
  const documentFilter = options.documentIds?.length
    ? `AND "documentId" = ANY(ARRAY[${options.documentIds.map((id) => `'${id}'`).join(',')}])`
    : '';

  // Perform vector similarity search using cosine distance
  // Note: pgvector uses <=> for cosine distance (0 = identical, 2 = opposite)
  // We convert to similarity score: 1 - (distance / 2) = similarity in range [0, 1]
  const sqlQuery = `
    SELECT
      id as "chunkId",
      "documentId",
      content,
      metadata,
      position,
      1 - (embedding <=> $1::vector) / 2 as similarity
    FROM "chunks"
    WHERE "tenantId" = $2
      AND embedding IS NOT NULL
      ${documentFilter}
    ORDER BY embedding <=> $1::vector
    LIMIT $3
  `;

  const results: any[] = await prisma.$queryRawUnsafe(
    sqlQuery,
    embeddingStr,
    tenantId,
    opts.limit
  );

  // Filter by minimum similarity and format results
  const formattedResults: SearchResult[] = results
    .filter((r) => r.similarity >= opts.minSimilarity)
    .map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      content: r.content,
      similarity: r.similarity,
      metadata: r.metadata,
      position: r.position,
    }));

  console.log(
    `[VectorSearch] Found ${formattedResults.length} chunks with similarity >= ${opts.minSimilarity}`
  );

  return formattedResults;
}

/**
 * Build context string from search results for RAG
 */
export function buildContext(results: SearchResult[], maxLength: number = 2000): string {
  if (results.length === 0) {
    return '';
  }

  const contextParts: string[] = [];
  let currentLength = 0;

  for (const result of results) {
    const part = `[Source: Document ${result.documentId.slice(0, 8)}, Similarity: ${(result.similarity * 100).toFixed(1)}%]\n${result.content}\n`;

    if (currentLength + part.length > maxLength) {
      break;
    }

    contextParts.push(part);
    currentLength += part.length;
  }

  return contextParts.join('\n---\n\n');
}

/**
 * Get count of indexed chunks for a tenant
 */
export async function getChunkCount(tenantId: string): Promise<number> {
  const count = await prisma.chunk.count({
    where: {
      tenantId,
      embedding: { not: null },
    },
  });

  return count;
}

/**
 * Get count of indexed documents for a tenant
 */
export async function getIndexedDocumentCount(tenantId: string): Promise<number> {
  const count = await prisma.document.count({
    where: {
      tenantId,
      status: 'indexed',
    },
  });

  return count;
}
