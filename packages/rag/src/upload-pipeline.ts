import { createHash } from 'crypto';
import { PrismaClient, Document as DocumentRecord, Prisma } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';
import type { StorageProvider } from './storage';
import { StorageProviderRegistry } from './storage';
import { mergeMetadata } from './utils';

export interface DocumentUploadInput {
  tenantId: string;
  filename: string;
  mimeType: string;
  buffer: Buffer;
  metadata?: Record<string, any>;
  size?: number;
  storageProviderName?: string;
  documentId?: string;
}

export class DocumentUploadPipeline {
  private readonly logger = createLogger('DocumentUploadPipeline');

  constructor(
    private readonly prisma: PrismaClient,
    private readonly providers: StorageProviderRegistry
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

      const finalMetadata = mergeMetadata(mergedMetadata, {
        integrity: {
          status: 'healthy',
          lastCheckedAt: new Date().toISOString(),
          checksum,
        },
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
}
