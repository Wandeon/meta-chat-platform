import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'crypto';
import { DocumentUploadPipeline } from '../upload-pipeline';
import { StorageProvider, SaveOptions, SaveResult } from '../storage/storage-provider';
import { StorageProviderRegistry } from '../storage/registry';
import { LoaderRegistry } from '../loaders/registry';
import { createTextLoader } from '../loaders/text';
import {
  EmbeddingsProvider,
  EmbeddingsProviderResult,
  EmbeddingsService,
} from '../embeddings';
import { retrieveKnowledgeBase } from '../retriever';
import { createSearchKnowledgeBaseFunction } from '../functions';
import type { FunctionContext } from '@meta-chat/shared';

type JsonRecord = Record<string, any>;

interface MockDocument {
  id: string;
  tenantId: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  checksum: string;
  storageProvider: string;
  version: number;
  status: string;
  metadata: JsonRecord;
  createdAt: Date;
  updatedAt: Date;
}

interface MockChunk {
  id: string;
  tenantId: string;
  documentId: string;
  content: string;
  embedding: number[] | null;
  metadata: JsonRecord;
  position: number;
}

class InMemoryStorageProvider implements StorageProvider {
  readonly name = 'memory';
  private readonly store = new Map<string, Buffer>();

  async save(options: SaveOptions): Promise<SaveResult> {
    const buffer = options.buffer ?? Buffer.alloc(0);
    const path = `${options.tenantId}/${options.documentId}/v${options.version}/${options.filename}`;
    this.store.set(path, Buffer.from(buffer));
    return { path, size: buffer.length };
  }

  async exists(path: string): Promise<boolean> {
    return this.store.has(path);
  }

  async getChecksum(path: string): Promise<string> {
    const buffer = this.store.get(path);
    if (!buffer) {
      throw new Error(`File ${path} not found`);
    }
    return createHash('sha256').update(buffer).digest('hex');
  }

  async read(path: string): Promise<Buffer> {
    const buffer = this.store.get(path);
    if (!buffer) {
      throw new Error(`File ${path} not found`);
    }
    return Buffer.from(buffer);
  }

  async remove(path: string): Promise<void> {
    this.store.delete(path);
  }
}

class DeterministicEmbeddingsProvider implements EmbeddingsProvider {
  async embed(inputs: string[], model: string): Promise<EmbeddingsProviderResult[]> {
    return inputs.map((input) => {
      const normalized = input.trim();
      const length = normalized.length;
      const words = normalized ? normalized.split(/\s+/).length : 0;
      const digest = createHash('sha256').update(normalized).digest('hex');
      const numbers = digest
        .slice(0, 32)
        .match(/.{1,4}/g)
        ?.map((chunk) => parseInt(chunk, 16) / 65535) ?? [0];

      const embedding = [length / 1000, words / 100, ...numbers.slice(0, 6)];

      return {
        embedding,
        tokens: Math.max(1, Math.round(length / 4)),
        model,
      };
    });
  }
}

class MockPrismaClient {
  readonly documents = new Map<string, MockDocument>();
  readonly chunks = new Map<string, MockChunk>();

  document = {
    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.documents.get(where.id) ?? null;
    },
    findFirst: async ({ where }: { where: { tenantId: string; filename: string } }) => {
      for (const document of this.documents.values()) {
        if (document.tenantId === where.tenantId && document.filename === where.filename) {
          return { ...document };
        }
      }
      return null;
    },
    create: async ({ data }: { data: Partial<MockDocument> }) => {
      const id = (data.id as string) ?? randomUUID();
      const record: MockDocument = {
        id,
        tenantId: data.tenantId!,
        filename: data.filename!,
        mimeType: data.mimeType!,
        size: data.size ?? 0,
        path: (data.path as string) ?? '',
        checksum: data.checksum ?? '',
        storageProvider: data.storageProvider ?? 'memory',
        version: data.version ?? 1,
        status: (data.status as string) ?? 'processing',
        metadata: (data.metadata as JsonRecord) ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.documents.set(id, record);
      return { ...record };
    },
    update: async ({ where, data }: { where: { id: string }; data: Partial<MockDocument> }) => {
      const existing = this.documents.get(where.id);
      if (!existing) {
        throw new Error(`Document ${where.id} not found`);
      }
      const updated: MockDocument = {
        ...existing,
        ...data,
        metadata: (data.metadata as JsonRecord) ?? existing.metadata,
        path: (data.path as string) ?? existing.path,
        checksum: data.checksum ?? existing.checksum,
        size: data.size ?? existing.size,
        status: (data.status as string) ?? existing.status,
        storageProvider: data.storageProvider ?? existing.storageProvider,
        version: data.version ?? existing.version,
        updatedAt: new Date(),
      };
      this.documents.set(where.id, updated);
      return { ...updated };
    },
  };

  chunk = {
    deleteMany: async ({ where }: { where: { documentId: string } }) => {
      let count = 0;
      for (const [id, chunk] of Array.from(this.chunks.entries())) {
        if (chunk.documentId === where.documentId) {
          this.chunks.delete(id);
          count += 1;
        }
      }
      return { count };
    },
  };

  async $transaction<T>(callback: (tx: this) => Promise<T>): Promise<T> {
    return callback(this);
  }

  async $executeRawUnsafe(sql: string, ...params: any[]): Promise<number> {
    if (sql.includes('::vector')) {
      const [id, tenantId, documentId, content, vectorLiteral, metadataJson, position] = params as [
        string,
        string,
        string,
        string,
        string,
        string,
        number,
      ];
      this.chunks.set(id, {
        id,
        tenantId,
        documentId,
        content,
        embedding: parseVector(vectorLiteral),
        metadata: JSON.parse(metadataJson),
        position,
      });
    } else {
      const [id, tenantId, documentId, content, metadataJson, position] = params as [
        string,
        string,
        string,
        string,
        string,
        number,
      ];
      this.chunks.set(id, {
        id,
        tenantId,
        documentId,
        content,
        embedding: null,
        metadata: JSON.parse(metadataJson),
        position,
      });
    }

    return 1;
  }
}

function parseVector(literal: string): number[] {
  const trimmed = literal.replace(/[[\]]/g, '').trim();
  if (!trimmed) {
    return [];
  }
  return trimmed.split(',').map((value) => Number(value.trim()));
}

function makeKeywordSearch(prisma: MockPrismaClient) {
  return async (tenantId: string, query: string, topK: number = 5) => {
    const normalized = query.toLowerCase();
    return Array.from(prisma.chunks.values())
      .filter((chunk) => chunk.tenantId === tenantId && chunk.content.toLowerCase().includes(normalized))
      .map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        content: chunk.content,
        metadata: chunk.metadata,
        position: chunk.position,
        rank: chunk.content.toLowerCase().split(normalized).length,
      }))
      .sort((a, b) => Number(b.rank) - Number(a.rank))
      .slice(0, topK);
  };
}

function cosineSimilarity(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) {
    return 0;
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

function makeVectorSearch(prisma: MockPrismaClient) {
  return async (tenantId: string, embedding: number[], topK: number = 5, minSimilarity: number = 0.7) => {
    const results = Array.from(prisma.chunks.values())
      .filter((chunk) => chunk.tenantId === tenantId && Array.isArray(chunk.embedding) && chunk.embedding.length > 0)
      .map((chunk) => {
        const similarity = cosineSimilarity(embedding, chunk.embedding ?? []);
        return {
          id: chunk.id,
          documentId: chunk.documentId,
          content: chunk.content,
          metadata: chunk.metadata,
          position: chunk.position,
          similarity,
        };
      })
      .filter((result) => result.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  };
}

const TENANT_ID = 'tenant-test';

let prisma: MockPrismaClient;
let storageRegistry: StorageProviderRegistry;
let loaderRegistry: LoaderRegistry;
let embeddingsService: EmbeddingsService;
let pipeline: DocumentUploadPipeline;

beforeEach(() => {
  prisma = new MockPrismaClient();
  storageRegistry = new StorageProviderRegistry(new InMemoryStorageProvider());
  loaderRegistry = new LoaderRegistry([createTextLoader()]);
  embeddingsService = new EmbeddingsService({
    provider: new DeterministicEmbeddingsProvider(),
    batchSize: 8,
    pricePerThousandTokens: 0,
    model: 'deterministic-test',
  });
  pipeline = new DocumentUploadPipeline(prisma as any, storageRegistry, loaderRegistry, embeddingsService);
});

void test('document upload pipeline indexes and chunks text documents', async () => {
  const buffer = Buffer.from(
    'Paragraph one introduces the topic.\n\nParagraph two expands the idea with additional detail.\n\nParagraph three concludes.'
  );

  const document = await pipeline.upload({
    tenantId: TENANT_ID,
    filename: 'sample.txt',
    mimeType: 'text/plain',
    buffer,
    metadata: { source: 'integration-test' },
    chunker: { strategy: 'semantic', maxTokens: 40 },
  });

  assert.equal(document.status, 'ready');
  const stored = prisma.documents.get(document.id);
  assert.ok(stored);
  assert.ok(stored?.metadata.indexing);
  assert.equal(stored?.metadata.indexing.chunkCount, prisma.chunks.size);

  const positions = Array.from(prisma.chunks.values()).map((chunk) => chunk.position);
  const sortedPositions = [...positions].sort((a, b) => a - b);
  assert.deepEqual(positions, sortedPositions, 'chunks should be stored sequentially');

  const firstChunk = Array.from(prisma.chunks.values())[0];
  assert.ok(firstChunk.metadata.loader);
  assert.ok(firstChunk.metadata.tokens > 0);
});

void test('retrieveKnowledgeBase performs hybrid retrieval', async () => {
  const buffer = Buffer.from(
    'Alpha section covers introductions.\n\nBeta section dives deep into hybrid retrieval strategies.\n\nGamma section mentions Alpha again for reinforcement.'
  );
  const doc = await pipeline.upload({
    tenantId: TENANT_ID,
    filename: 'hybrid.txt',
    mimeType: 'text/plain',
    buffer,
    chunker: { strategy: 'recursive', maxTokens: 50 },
  });

  const retrievalEmbeddings = new EmbeddingsService({
    provider: new DeterministicEmbeddingsProvider(),
    batchSize: 4,
    pricePerThousandTokens: 0,
    model: 'deterministic-test',
  });

  const results = await retrieveKnowledgeBase(
    { tenantId: TENANT_ID, query: 'hybrid retrieval strategies', topK: 3 },
    {
      embeddings: retrievalEmbeddings,
      keywordSearch: makeKeywordSearch(prisma),
      vectorSearch: makeVectorSearch(prisma),
    }
  );

  assert.ok(results.length > 0);
  assert.equal(results[0].chunk.documentId, doc.id);
  assert.ok(results[0].chunk.metadata.position >= 0);
  assert.ok(results.some((result) => result.type === 'hybrid' || result.type === 'vector'));
});

void test('search_knowledge_base function serializes retrieval results', async () => {
  const buffer = Buffer.from('Delta section explains serialization.\n\nEpsilon section references Delta for completeness.');
  await pipeline.upload({
    tenantId: TENANT_ID,
    filename: 'function.txt',
    mimeType: 'text/plain',
    buffer,
    chunker: { strategy: 'fixed', maxTokens: 30 },
  });

  const functionEmbeddings = new EmbeddingsService({
    provider: new DeterministicEmbeddingsProvider(),
    batchSize: 4,
    pricePerThousandTokens: 0,
    model: 'deterministic-test',
  });

  const fn = createSearchKnowledgeBaseFunction({
    embeddings: functionEmbeddings,
    keywordSearch: makeKeywordSearch(prisma),
    vectorSearch: makeVectorSearch(prisma),
  });

  const context = {
    tenantId: TENANT_ID,
    conversationId: 'conversation-1',
    message: {} as any,
  } satisfies FunctionContext;

  const payload = await fn.handler({ query: 'Delta section', topK: 1 }, context);
  const parsed = JSON.parse(payload);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].documentId !== undefined, true);
  assert.ok(['keyword', 'hybrid', 'vector'].includes(parsed[0].source));
});
