import { PrismaClient } from '@prisma/client';
import { createLogger } from '@meta-chat/shared';
import { validateAndSanitizeSearchQuery, validateTenantId } from './search-validation';

const logger = createLogger('Database');

function normalizeEmbeddingVector(vector: number[]): number[] {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error('Embedding vector must contain at least one value.');
  }

  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));

  if (!Number.isFinite(norm) || norm === 0) {
    throw new Error('Embedding vector cannot be normalized (zero norm).');
  }

  return vector.map((value) => value / norm);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// Singleton Prisma client
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });

    // Graceful shutdown
    process.on('beforeExit', async () => {
      logger.info('Disconnecting Prisma client');
      await prisma.$disconnect();
    });
  }

  return prisma;
}

// Vector search helper for pgvector with SQL injection protection
export async function vectorSearch(
  tenantId: string,
  embedding: number[],
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<any[]> {
  const prisma = getPrismaClient();

  // Validate tenant ID to prevent SQL injection
  const tenantValidation = validateTenantId(tenantId);
  if (!tenantValidation.isValid) {
    logger.error('Invalid tenant ID for vector search', { tenantId, error: tenantValidation.error });
    throw new Error(tenantValidation.error);
  }

  // Validate topK parameter
  const clampedTopK = clamp(topK, 1, 100);
  if (topK !== clampedTopK) {
    logger.warn('topK parameter out of range, clamping', { original: topK, clamped: clampedTopK });
  }

  const normalizedEmbedding = normalizeEmbeddingVector(embedding);
  const vectorLiteral = `[${normalizedEmbedding.join(',')}]`;
  const similarityThreshold = clamp(minSimilarity, 0, 1);
  const distanceThreshold = 1 - similarityThreshold;

  // Using cosine similarity with pgvector
  // Note: Using parameterized queries with $queryRaw template literals
  // This prevents SQL injection by properly escaping all user inputs
  const results = await prisma.$queryRaw`
    SELECT
      c.id,
      c."documentId",
      c.content,
      c.metadata,
      c.position,
      1 - (c.embedding <=> ${vectorLiteral}::vector) as similarity
    FROM chunks c
    INNER JOIN documents d ON c."documentId" = d.id
    WHERE d."tenantId" = ${tenantValidation.sanitized}
      AND c."tenantId" = ${tenantValidation.sanitized}
      AND d.status = 'ready'
      AND c.embedding IS NOT NULL
      AND c.embedding <=> ${vectorLiteral}::vector <= ${distanceThreshold}
    ORDER BY c.embedding <=> ${vectorLiteral}::vector
    LIMIT ${clampedTopK}
  `;

  return results as any[];
}

// Keyword search helper (full-text search) with SQL injection protection
export async function keywordSearch(
  tenantId: string,
  query: string,
  topK: number = 5
): Promise<any[]> {
  const prisma = getPrismaClient();

  // Validate tenant ID to prevent SQL injection
  const tenantValidation = validateTenantId(tenantId);
  if (!tenantValidation.isValid) {
    logger.error('Invalid tenant ID for keyword search', { tenantId, error: tenantValidation.error });
    throw new Error(tenantValidation.error);
  }

  // Validate and sanitize search query to prevent SQL injection
  const queryValidation = validateAndSanitizeSearchQuery(query);
  if (!queryValidation.isValid) {
    logger.error('Invalid search query', { query, error: queryValidation.error });
    throw new Error(queryValidation.error);
  }

  // Validate topK parameter
  const clampedTopK = clamp(topK, 1, 100);
  if (topK !== clampedTopK) {
    logger.warn('topK parameter out of range, clamping', { original: topK, clamped: clampedTopK });
  }

  const sanitizedQuery = queryValidation.sanitized as string;

  // Using parameterized queries with $queryRaw template literals
  // This prevents SQL injection by properly escaping all user inputs
  // plainto_tsquery automatically escapes special characters for full-text search
  const results = await prisma.$queryRaw`
    SELECT
      c.id,
      c."documentId",
      c.content,
      c.metadata,
      c.position,
      ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', ${sanitizedQuery})) as rank
    FROM chunks c
    INNER JOIN documents d ON c."documentId" = d.id
    WHERE d."tenantId" = ${tenantValidation.sanitized}
      AND c."tenantId" = ${tenantValidation.sanitized}
      AND d.status = 'ready'
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', ${sanitizedQuery})
    ORDER BY rank DESC
    LIMIT ${clampedTopK}
  `;

  logger.info('Keyword search completed', {
    tenantId: tenantValidation.sanitized,
    query: sanitizedQuery,
    resultsCount: (results as any[]).length
  });

  return results as any[];
}

export { PrismaClient };
