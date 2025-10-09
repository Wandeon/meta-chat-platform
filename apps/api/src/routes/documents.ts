import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateTenant } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();

const metadataSchema = z.record(z.string(), z.any()).default({});

const listQuerySchema = z.object({
  status: z.string().optional(),
});

const createDocumentSchema = z.object({
  filename: z.string().min(1),
  mimeType: z.string().min(1),
  size: z.number().int().nonnegative(),
  path: z.string().min(1),
  checksum: z.string().min(1),
  storageProvider: z.string().min(1).default('local'),
  metadata: metadataSchema.optional(),
});

const updateDocumentSchema = z
  .object({
    filename: z.string().min(1).optional(),
    mimeType: z.string().min(1).optional(),
    status: z.string().optional(),
    version: z.number().int().positive().optional(),
    metadata: metadataSchema.optional(),
  })
  .strict();

router.use(authenticateTenant);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = parseWithSchema(listQuerySchema, req.query);
    const documents = await prisma.document.findMany({
      where: {
        tenantId: req.tenant!.id,
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
    const payload = parseWithSchema(createDocumentSchema, req.body);

    const document = await prisma.document.create({
      data: {
        tenantId: req.tenant!.id,
        filename: payload.filename,
        mimeType: payload.mimeType,
        size: payload.size,
        path: payload.path,
        checksum: payload.checksum,
        storageProvider: payload.storageProvider ?? 'local',
        metadata: payload.metadata ?? {},
      },
    });

    respondCreated(res, document);
  }),
);

router.get(
  '/:documentId',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId: req.tenant!.id,
      },
    });

    if (!document) {
      throw createHttpError(404, 'Document not found');
    }

    respondSuccess(res, document);
  }),
);

router.put(
  '/:documentId',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;
    const payload = parseWithSchema(updateDocumentSchema, req.body);

    const existing = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId: req.tenant!.id,
      },
    });

    if (!existing) {
      throw createHttpError(404, 'Document not found');
    }

    const document = await prisma.document.update({
      where: { id: documentId },
      data: {
        filename: payload.filename ?? existing.filename,
        mimeType: payload.mimeType ?? existing.mimeType,
        status: payload.status ?? existing.status,
        version: payload.version ?? existing.version,
        metadata: payload.metadata ?? existing.metadata,
      },
    });

    respondSuccess(res, document);
  }),
);

router.delete(
  '/:documentId',
  asyncHandler(async (req, res) => {
    const { documentId } = req.params;

    const existing = await prisma.document.findFirst({
      where: {
        id: documentId,
        tenantId: req.tenant!.id,
      },
    });

    if (!existing) {
      throw createHttpError(404, 'Document not found');
    }

    await prisma.document.delete({ where: { id: documentId } });

    respondSuccess(res, { id: documentId, deleted: true });
  }),
);

export default router;
