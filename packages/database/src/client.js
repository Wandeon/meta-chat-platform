"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = void 0;
exports.getPrismaClient = getPrismaClient;
exports.vectorSearch = vectorSearch;
exports.keywordSearch = keywordSearch;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
const shared_1 = require("@meta-chat/shared");
const logger = new shared_1.Logger('Database');
// Singleton Prisma client
let prisma;
function getPrismaClient() {
    if (!prisma) {
        prisma = new client_1.PrismaClient({
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
async function vectorSearch(tenantId, embedding, topK = 5, minSimilarity = 0.7) {
    const prisma = getPrismaClient();
    // Using cosine similarity with pgvector
    const results = await prisma.$queryRaw `
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
      AND d.status = 'ready'
      AND c.embedding IS NOT NULL
    ORDER BY c.embedding <=> ${`[${embedding.join(',')}]`}::vector
    LIMIT ${topK}
  `;
    // Filter by minimum similarity
    return results.filter((r) => r.similarity >= minSimilarity);
}
// Keyword search helper (full-text search)
async function keywordSearch(tenantId, query, topK = 5) {
    const prisma = getPrismaClient();
    const results = await prisma.$queryRaw `
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
      AND d.status = 'ready'
      AND to_tsvector('english', c.content) @@ plainto_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${topK}
  `;
    return results;
}
//# sourceMappingURL=client.js.map