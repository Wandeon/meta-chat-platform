import { describe, expect, it } from 'vitest';
import { RagRetriever } from '../../packages/rag/src/retrieval';
import { getIntegrationTestContext } from './setup/environment';

function unitVector(dimension: number, index: number): number[] {
  return Array.from({ length: dimension }, (_, i) => (i === index ? 1 : 0));
}

describe('RAG retrieval', () => {
  it('returns relevant chunks via keyword fallback and vector search', async () => {
    const { prisma } = getIntegrationTestContext();
    const retriever = new RagRetriever(prisma);

    const tenant = await prisma.tenant.create({
      data: {
        name: 'RAG Tenant',
        settings: {},
      },
    });

    const document = await prisma.document.create({
      data: {
        tenantId: tenant.id,
        filename: 'kb.txt',
        mimeType: 'text/plain',
        size: 128,
        path: 'rag/tenant',
        checksum: 'abc123',
        storageProvider: 'local',
        status: 'ready',
        metadata: {},
      },
    });

    const chunk = await prisma.chunk.create({
      data: {
        tenantId: tenant.id,
        documentId: document.id,
        content: 'Meta chat uses retrieval augmented generation to answer support tickets.',
        metadata: {},
        position: 0,
      },
    });

    const keywordResults = await retriever.retrieve({
      tenantId: tenant.id,
      query: 'retrieval augmented generation support',
      topK: 5,
    });

    expect(keywordResults).toHaveLength(1);
    expect(keywordResults[0].id).toBe(chunk.id);

    const embedding = unitVector(1536, 0);
    const vectorLiteral = `[${embedding.join(',')}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "chunks" SET embedding = '${vectorLiteral}'::vector WHERE id = '${chunk.id}'`,
    );

    const vectorResults = await retriever.retrieve({
      tenantId: tenant.id,
      embedding,
      topK: 1,
      minSimilarity: 0.1,
    });

    expect(vectorResults[0].id).toBe(chunk.id);
  });
});
