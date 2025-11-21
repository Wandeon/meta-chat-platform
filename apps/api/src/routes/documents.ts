import { Router } from 'express';
import createHttpError from 'http-errors';
import crypto from 'crypto';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdminOrTenant } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';
import { processDocument, getEmbeddingConfig } from '../services/documentProcessor';
import { requireTenantId } from '../utils/tenant';

const prisma = getPrismaClient();
const router = Router();

const metadataSchema = z.record(z.string(), z.any()).default({});

const listQuerySchema = z.object({
  status: z.string().optional(),
});

const createDocumentSchema = z.object({
  name: z.string().min(1),
  source: z.string().optional(),
  metadata: metadataSchema.optional(),
});

const updateDocumentSchema = z.object({
  name: z.string().min(1).optional(),
  source: z.string().optional(),
  metadata: metadataSchema.optional(),
  status: z.string().optional(),
});

router.use(authenticateAdminOrTenant);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseWithSchema(listQuerySchema, req.query);
    const tenantId = requireTenantId(req, { allowQuery: true });
    const documents = await prisma.document.findMany({
      where: {
        tenantId,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });

    respondSuccess(res, documents);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(createDocumentSchema.extend({ tenantId: z.string() }), req.body);
    const tenantId = requireTenantId(req, { allowBody: true });

    // Extract content from metadata
    const content = payload.metadata?.content || '';
    if (!content || typeof content !== 'string') {
      throw createHttpError(400, 'Document content is required in metadata.content');
    }

    // Generate file storage details
    const contentBuffer = Buffer.from(content, 'utf-8');
    const checksum = crypto.createHash('sha256').update(contentBuffer).digest('hex');
    const timestamp = Date.now();
    const sanitizedName = payload.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    const filename = `${sanitizedName}.txt`;
    const path = `documents/${tenantId}/${timestamp}-${filename}`;

    // Determine mime type from metadata or default
    const mimeType = (payload.metadata?.fileType as string) || 'text/plain';
    const size = (payload.metadata?.fileSize as number) || contentBuffer.length;

    const document = await prisma.document.create({
      data: {
        tenantId,
        filename: filename,
        mimeType: mimeType,
        size: size,
        path: path,
        checksum: checksum,
        storageProvider: 'local',
        status: 'pending',
        metadata: {
          ...payload.metadata,
          name: payload.name,
          source: payload.source,
        },
      },
    });

    // Trigger document processing asynchronously
    const embeddingConfig = await getEmbeddingConfig(tenantId);
    processDocument(document.id, { embeddingConfig }).catch((error) => {
      console.error(`Failed to process document ${document.id}:`, error);
    });

    respondCreated(res, document);
  }),
);

router.get(
  '/:documentId',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const tenantId = requireTenantId(req, { allowQuery: true });

    // Use findFirst with tenantId to enforce tenant isolation
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId,
      },
    });

    if (!document) {
      throw createHttpError(404, 'Document not found');
    }

    respondSuccess(res, document);
  }),
);

const updateDocumentHandler = asyncHandler(async (req, res) => {
  const { documentId } = req.params;
  const tenantId = requireTenantId(req, { allowQuery: true, allowBody: true });
  const payload = parseWithSchema(updateDocumentSchema, req.body);

  // Use findFirst with tenantId to enforce tenant isolation
  const existing = await prisma.document.findFirst({
    where: {
      id: documentId,
      tenantId,
    },
  });

  if (!existing) {
    throw createHttpError(404, 'Document not found');
  }

  // If content is being updated, regenerate file details
  const updatedData: any = {
    status: payload.status ?? existing.status,
    metadata: payload.metadata ? { ...existing.metadata, ...payload.metadata } : existing.metadata,
  };

  if (payload.name) {
    const sanitizedName = payload.name.replace(/[^a-zA-Z0-9-_]/g, '_');
    updatedData.filename = `${sanitizedName}.txt`;
    updatedData.metadata = { ...updatedData.metadata, name: payload.name };
  }

  if (payload.source !== undefined) {
    updatedData.metadata = { ...updatedData.metadata, source: payload.source };
  }

  // If content changed, update checksum and size
  if (payload.metadata?.content) {
    const content = payload.metadata.content as string;
    const contentBuffer = Buffer.from(content, 'utf-8');
    updatedData.checksum = crypto.createHash('sha256').update(contentBuffer).digest('hex');
    updatedData.size = contentBuffer.length;
    updatedData.version = existing.version + 1;
  }

  const document = await prisma.document.update({
    where: { id: documentId },
    data: updatedData,
  });

  respondSuccess(res, document);
});

router.put('/:documentId', updateDocumentHandler);
router.patch('/:documentId', updateDocumentHandler);

router.delete(
  '/:documentId',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const tenantId = requireTenantId(req, { allowQuery: true });

    // Use deleteMany with tenantId to enforce tenant isolation
    const result = await prisma.document.deleteMany({
      where: {
        id: documentId,
        tenantId,
      },
    });

    if (result.count === 0) {
      throw createHttpError(404, 'Document not found');
    }

    respondSuccess(res, { id: documentId, deleted: true });
  }),
);

export default router;
