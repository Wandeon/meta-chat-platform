import { createHash, randomUUID } from 'crypto';
import { Readable } from 'stream';
import type { PrismaClient, Document as DocumentRecord, Prisma } from '@meta-chat/database';
import { getSharedModule } from './internal/dependencies';
import type { StorageProvider } from './storage';
import { StorageProviderRegistry } from './storage';
import { mergeMetadata } from './utils';
import { LoaderRegistry, LoaderResult, DocumentLoader } from './loaders';
import { chunkText, ChunkerOptions } from './chunker';
import { EmbeddingsService } from './embeddings';

export interface DocumentUploadInput {
  tenantId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  metadata?: Record<string, any>;
  size?: number;
  storageProviderName?: string;
  documentId?: string;
  chunker?: ChunkerOptions;
  enableEmbeddings?: boolean;
}

const { createLogger } = getSharedModule();

export class DocumentUploadPipeline {
  private readonly logger = createLogger('DocumentUploadPipeline');

  constructor(
    private readonly prisma: PrismaClient,
    private readonly providers: StorageProviderRegistry,
    private readonly loaders: LoaderRegistry,
    private readonly embeddings: EmbeddingsService
  ) {}

  async upload(input: DocumentUploadInput): Promise<DocumentRecord> {
    const provider = this.resolveProvider(input.storageProviderName);
    const checksum = this.computeChecksum(input.buffer);
    const size = input.size ?? input.buffer.length;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let existing: DocumentRecord | null = null;
      let version = 1;

      if (input.documentId) {
        existing = await tx.document.findUnique({ where: { id: input.documentId } });
        if (!existing) {
          throw new Error(`Document ${input.documentId} not found for re-upload`);
        }
        if (existing.checksum === checksum) {
          this.logger.info('Skipping upload because checksum matches existing document', {
            documentId: existing.id,
            tenantId: existing.tenantId,
          });
          return existing;
        }
        version = existing.version + 1;
      } else {
        existing = await tx.document.findFirst({
          where: {
            tenantId: input.tenantId,
            filename: input.filename,
          },
        });

        if (existing) {
          if (existing.checksum === checksum) {
            this.logger.info('Skipping upload because identical checksum already stored', {
              documentId: existing.id,
              tenantId: existing.tenantId,
            });
            return existing;
          }
          version = existing.version + 1;
        }
      }

      const mergedMetadata = mergeMetadata(existing?.metadata, input.metadata);
      let target = existing;

      if (!target) {
        target = await tx.document.create({
          data: {
            tenantId: input.tenantId,
            filename: input.filename,
            mimeType: input.mimeType,
            size,
            path: '',
            status: 'processing',
            metadata: mergedMetadata,
            checksum,
            storageProvider: provider.name,
            version,
          },
        });
      } else {
        target = await tx.document.update({
          where: { id: target.id },
          data: {
            mimeType: input.mimeType,
            size,
            status: 'processing',
            metadata: mergedMetadata,
            checksum,
            storageProvider: provider.name,
            version,
          },
        });
      }

      if (!target) {
        throw new Error('Failed to determine document target during upload');
      }

      const saveResult = await provider.save({
        tenantId: target.tenantId,
        documentId: target.id,
        version,
        filename: input.filename,
        mimeType: input.mimeType,
        size,
        checksum,
        buffer: input.buffer,
      });

      const storedChecksum = await provider.getChecksum(saveResult.path);
      if (storedChecksum !== checksum) {
        await provider.remove(saveResult.path);
        await tx.document.update({
          where: { id: target.id },
          data: {
            status: 'failed',
            metadata: mergeMetadata(mergedMetadata, {
              integrity: {
                status: 'failed',
                lastCheckedAt: new Date().toISOString(),
                reason: 'checksum_mismatch_on_upload',
                expected: checksum,
                actual: storedChecksum,
              },
            }),
          },
        });

        throw new Error(
          `Checksum mismatch after uploading document ${target.id} (expected ${checksum}, got ${storedChecksum})`
        );
      }

      const { indexingMetadata, chunks } = await this.processDocument(tx, target, input, mergedMetadata);

      const finalMetadata = mergeMetadata(mergedMetadata, {
        integrity: {
          status: 'healthy',
          lastCheckedAt: new Date().toISOString(),
          checksum,
        },
        indexing: indexingMetadata,
      });

      const updated = await tx.document.update({
        where: { id: target.id },
        data: {
          path: saveResult.path,
          size: saveResult.size,
          status: 'ready',
          checksum,
          storageProvider: provider.name,
          version,
          metadata: finalMetadata,
        },
      });

      this.logger.info('Document upload completed', {
        documentId: updated.id,
        tenantId: updated.tenantId,
        version: updated.version,
        storageProvider: provider.name,
        chunks: chunks.length,
      });

      return updated;
    });
  }

  private computeChecksum(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private resolveProvider(name?: string): StorageProvider {
    const provider = name ? this.providers.get(name) : this.providers.getDefault();
    if (!provider) {
      throw new Error(`Storage provider ${name} is not registered`);
    }
    return provider;
  }

  private async processDocument(
    tx: Prisma.TransactionClient,
    document: DocumentRecord,
    input: DocumentUploadInput,
    mergedMetadata: Record<string, any>
  ): Promise<{ indexingMetadata: Record<string, any>; chunks: Array<{ id: string }> }> {
    const stream = Readable.from(input.buffer);
    const loaderResult = await this.loaders.load(stream, {
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size ?? input.buffer.length,
    });

    const chunkOptions: ChunkerOptions = {
      strategy: input.chunker?.strategy ?? 'recursive',
      maxTokens: input.chunker?.maxTokens ?? 512,
      overlap: input.chunker?.overlap ?? 64,
    };

    const chunks = chunkText(loaderResult.text, chunkOptions);

    await tx.chunk.deleteMany({ where: { documentId: document.id } });

    const embeddingsEnabled = input.enableEmbeddings !== false && chunks.length > 0;
    const embeddingResponses = embeddingsEnabled
      ? await this.embeddings.embed(
          chunks.map((chunk) => ({
            id: `${document.id}:${chunk.position}`,
            text: chunk.content,
            metadata: {
              tenantId: document.tenantId,
              documentId: document.id,
              position: chunk.position,
            },
          }))
        )
      : [];

    const createdChunks = await this.persistChunks(tx, document, chunks, loaderResult, embeddingResponses);

    const totalTokens = embeddingResponses.reduce((sum, result) => sum + result.tokens, 0);
    const totalCost = embeddingResponses.reduce((sum, result) => sum + result.cost, 0);
    const models = new Set(embeddingResponses.map((result) => result.model));

    const indexingMetadata = mergeMetadata(mergedMetadata.indexing, {
      loader: loaderResult.loader.name,
      extractedAt: new Date().toISOString(),
      chunkCount: chunks.length,
      chunking: {
        strategy: chunkOptions.strategy,
        maxTokens: chunkOptions.maxTokens,
        overlap: chunkOptions.overlap,
      },
      sourceMetadata: loaderResult.metadata,
      embeddings: embeddingsEnabled
        ? {
            model: Array.from(models).join(', '),
            totalTokens,
            totalCost,
          }
        : { model: null, totalTokens: 0, totalCost: 0 },
    });

    return { indexingMetadata, chunks: createdChunks };
  }

  private async persistChunks(
    tx: Prisma.TransactionClient,
    document: DocumentRecord,
    chunks: ReturnType<typeof chunkText>,
    loaderResult: LoaderResult & { loader: DocumentLoader },
    embeddings: Awaited<ReturnType<EmbeddingsService['embed']>>
  ): Promise<Array<{ id: string }>> {
    const results: Array<{ id: string }> = [];

    for (const chunk of chunks) {
      const embeddingId = `${document.id}:${chunk.position}`;
      const embedding = embeddings.find((item) => item.id === embeddingId);
      const chunkId = randomUUID();
      const baseMetadata = mergeMetadata(loaderResult.metadata, chunk.metadata);
      const metadata = mergeMetadata(baseMetadata, {
        position: chunk.position,
        startToken: chunk.startToken,
        endToken: chunk.endToken,
        tokens: chunk.tokenCount,
        loader: loaderResult.loader.name,
      });

      const vectorLiteral = embedding && embedding.embedding.length ? `[${embedding.embedding.join(',')}]` : null;
      const sql = vectorLiteral
        ? `INSERT INTO "chunks" ("id", "tenantId", "documentId", "content", "embedding", "metadata", "position") VALUES ($1, $2, $3, $4, $5::vector, $6::jsonb, $7)`
        : `INSERT INTO "chunks" ("id", "tenantId", "documentId", "content", "embedding", "metadata", "position") VALUES ($1, $2, $3, $4, NULL, $5::jsonb, $6)`;

      const params = vectorLiteral
        ? [
            chunkId,
            document.tenantId,
            document.id,
            chunk.content,
            vectorLiteral,
            JSON.stringify(metadata),
            chunk.position,
          ]
        : [
            chunkId,
            document.tenantId,
            document.id,
            chunk.content,
            JSON.stringify(metadata),
            chunk.position,
          ];

      await tx.$executeRawUnsafe(sql, ...params);

      results.push({ id: chunkId });
    }

    return results;
  }
}
