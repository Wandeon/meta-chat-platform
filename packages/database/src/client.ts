import { PrismaClient } from '@prisma/client';
import { Logger } from '@meta-chat/shared';

const logger = new Logger('Database');

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

// Vector search helper for pgvector
export async function vectorSearch(
  tenantId: string,
  embedding: number[],
  topK: number = 5,
  minSimilarity: number = 0.7
): Promise<any[]> {
  const prisma = getPrismaClient();

  // Using cosine similarity with pgvector
  const results = await prisma.$queryRaw`
    SELECT
      c.id,
      c."documentId",
      c.content,
      c.metadata,
      c.position,
      1 - (c.embedding <=> ${`[${embedding.join(',')}]`}::vector) as similarity
    FROM chunks c
    INNER JOIN documents d ON c."documentId" = d.id
    WHERE d."tenantId" = ${tenantId}
      AND c."tenantId" = ${tenantId}
      AND d.status = 'ready'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${`[${embedding.join(',')}]`}::vector
    LIMIT ${topK}
  `;

  // Filter by minimum similarity
  return (results as any[]).filter((r: any) => r.similarity >= minSimilarity);
}

// Keyword search helper (full-text search)
export async function keywordSearch(
  tenantId: string,
  query: string,
  topK: number = 5
): Promise<any[]> {
  const prisma = getPrismaClient();

  const results = await prisma.$queryRaw`
    SELECT
      c.id,
      c."documentId",
      c.content,
      c.metadata,
      c.position,
      ts_rank(to_tsvector('english', c.content), plainto_tsquery('english', ${query})) as rank
    FROM chunks c
    INNER JOIN documents d ON c."documentId" = d.id
    WHERE d."tenantId" = ${tenantId}
      AND c."tenantId" = ${tenantId}
      AND d.status = 'ready'
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${topK}
  `;

  return results as any[];
}

export { PrismaClient };
