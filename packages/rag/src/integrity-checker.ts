import type { PrismaClient, Document as DocumentRecord } from '@meta-chat/database';
import { getSharedModule } from './internal/dependencies';
import { StorageProviderRegistry } from './storage';
import { DocumentUploadPipeline } from './upload-pipeline';
import { mergeMetadata } from './utils';

export type IntegrityIssueReason = 'missing' | 'checksum_mismatch';

export interface IntegrityCheckOptions {
  batchSize?: number;
  statuses?: string[];
  remediator?: DocumentRemediator;
}

export interface DocumentRemediator {
  reupload(
    document: DocumentRecord,
    context: IntegrityRemediationContext
  ): Promise<Buffer | null>;
}

export interface IntegrityRemediationContext {
  reason: IntegrityIssueReason;
  providerName: string;
}

const { createLogger } = getSharedModule();

export class DocumentIntegrityChecker {
  private readonly logger = createLogger('DocumentIntegrityChecker');

  constructor(
    private readonly prisma: PrismaClient,
    private readonly providers: StorageProviderRegistry,
    private readonly pipeline: DocumentUploadPipeline
  ) {}

  async run(options: IntegrityCheckOptions = {}): Promise<void> {
    const batchSize = options.batchSize ?? 50;
    const statuses = options.statuses ?? ['ready'];

    let cursor: string | undefined;

    for (;;) {
      const documents = await this.prisma.document.findMany({
        take: batchSize,
        orderBy: { id: 'asc' },
        where: {
          status: { in: statuses },
        },
        ...(cursor
          ? {
              skip: 1,
              cursor: { id: cursor },
            }
          : {}),
      });

      if (documents.length === 0) {
        break;
      }

      for (const document of documents) {
        await this.checkDocument(document, options);
      }

      cursor = documents[documents.length - 1].id;
    }
  }

  private async checkDocument(
    document: DocumentRecord,
    options: IntegrityCheckOptions
  ): Promise<void> {
    const provider = this.providers.get(document.storageProvider);

    if (!provider) {
      this.logger.warn('Skipping document integrity check because provider is missing', {
        documentId: document.id,
        storageProvider: document.storageProvider,
      });
      return;
    }

    const exists = await provider.exists(document.path);
    if (!exists) {
      await this.handleIssue(document, provider.name, 'missing', options);
      return;
    }

    const checksum = await provider.getChecksum(document.path);
    if (checksum !== document.checksum) {
      await this.handleIssue(document, provider.name, 'checksum_mismatch', options, checksum);
      return;
    }

    await this.markHealthy(document, checksum);
  }

  private async handleIssue(
    document: DocumentRecord,
    providerName: string,
    reason: IntegrityIssueReason,
    options: IntegrityCheckOptions,
    actualChecksum?: string
  ): Promise<void> {
    this.logger.warn('Document integrity issue detected', {
      documentId: document.id,
      tenantId: document.tenantId,
      reason,
      providerName,
    });

    const remediationContext: IntegrityRemediationContext = { reason, providerName };

    if (options.remediator) {
      try {
        const buffer = await options.remediator.reupload(document, remediationContext);
        if (buffer) {
          const baseMetadata = mergeMetadata(document.metadata);
          await this.pipeline.upload({
            tenantId: document.tenantId,
            filename: document.filename,
            mimeType: document.mimeType,
            buffer,
            metadata: baseMetadata,
            documentId: document.id,
            storageProviderName: providerName,
          });
          this.logger.info('Document re-uploaded as part of remediation', {
            documentId: document.id,
            tenantId: document.tenantId,
            providerName,
          });
          return;
        }
      } catch (error) {
        this.logger.error('Failed to remediate document by re-uploading', error as Error);
      }
    }

    await this.markStale(document, reason, actualChecksum);
  }

  private async markHealthy(document: DocumentRecord, checksum: string): Promise<void> {
    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'ready',
        metadata: mergeMetadata(document.metadata, {
          integrity: {
            status: 'healthy',
            lastCheckedAt: new Date().toISOString(),
            checksum,
          },
        }),
      },
    });
  }

  private async markStale(
    document: DocumentRecord,
    reason: IntegrityIssueReason,
    actualChecksum?: string
  ): Promise<void> {
    await this.prisma.document.update({
      where: { id: document.id },
      data: {
        status: 'stale',
        metadata: mergeMetadata(document.metadata, {
          integrity: {
            status: 'stale',
            lastCheckedAt: new Date().toISOString(),
            reason,
            expected: document.checksum,
            actual: actualChecksum,
          },
        }),
      },
    });

    this.logger.warn('Document marked as stale after failed remediation', {
      documentId: document.id,
      tenantId: document.tenantId,
      reason,
    });
  }
}
