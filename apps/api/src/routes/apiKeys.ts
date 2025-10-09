import { Router } from 'express';
import createHttpError from 'http-errors';
import { generateApiKey, generateRotationToken, hashSecret, verifySecret } from '@meta-chat/shared';
import { authenticateAdmin } from '../middleware/auth';
import { prisma } from '../prisma';

const router = Router();

router.use(authenticateAdmin);

function assertCanManageAdmin(req: Parameters<typeof authenticateAdmin>[0], adminId: string) {
  if (!req.adminUser) {
    throw createHttpError(401, 'Missing admin context');
  }

  if (req.adminUser.id !== adminId && req.adminUser.role !== 'SUPER') {
    throw createHttpError(403, 'Insufficient permissions for admin user');
  }
}

function assertSuperAdmin(req: Parameters<typeof authenticateAdmin>[0]) {
  if (!req.adminUser) {
    throw createHttpError(401, 'Missing admin context');
  }

  if (req.adminUser.role !== 'SUPER') {
    throw createHttpError(403, 'Super admin privileges required');
  }
}

router.post('/admin/users/:adminId/api-keys', async (req, res, next) => {
  try {
    const { adminId } = req.params;
    assertCanManageAdmin(req, adminId);

    const label = typeof req.body?.label === 'string' ? req.body.label : undefined;

    const metadata = generateApiKey('adm');
    const hashed = await hashSecret(metadata.apiKey);

    const record = await prisma.adminApiKey.create({
      data: {
        adminId,
        label,
        prefix: metadata.prefix,
        hash: hashed.hash,
        salt: hashed.salt,
        lastFour: metadata.lastFour,
      },
    });

    res.status(201).json({
      id: record.id,
      apiKey: metadata.apiKey,
      lastFour: metadata.lastFour,
      prefix: metadata.prefix,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users/:adminId/api-keys/:keyId/rotation', async (req, res, next) => {
  try {
    const { adminId, keyId } = req.params;
    assertCanManageAdmin(req, adminId);

    const key = await prisma.adminApiKey.findFirst({
      where: {
        id: keyId,
        adminId,
        active: true,
      },
    });

    if (!key) {
      throw createHttpError(404, 'Admin API key not found');
    }

    const rotation = await generateRotationToken();
    await prisma.adminApiKey.update({
      where: { id: key.id },
      data: {
        rotationTokenHash: rotation.hash,
        rotationTokenSalt: rotation.salt,
        rotationIssuedAt: new Date(),
        rotationExpiresAt: rotation.expiresAt,
      },
    });

    res.json({
      rotationToken: rotation.token,
      expiresAt: rotation.expiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/admin/users/:adminId/api-keys/:keyId/rotation/confirm', async (req, res, next) => {
  try {
    const { adminId, keyId } = req.params;
    assertCanManageAdmin(req, adminId);

    const token = typeof req.body?.token === 'string' ? req.body.token : undefined;
    if (!token) {
      throw createHttpError(400, 'Rotation token is required');
    }

    const key = await prisma.adminApiKey.findFirst({
      where: {
        id: keyId,
        adminId,
        active: true,
      },
    });

    if (!key || !key.rotationTokenHash || !key.rotationTokenSalt || !key.rotationExpiresAt) {
      throw createHttpError(400, 'No pending rotation for this API key');
    }

    if (key.rotationExpiresAt.getTime() < Date.now()) {
      throw createHttpError(400, 'Rotation token has expired');
    }

    const validToken = await verifySecret(token, key.rotationTokenHash, key.rotationTokenSalt);
    if (!validToken) {
      throw createHttpError(400, 'Invalid rotation token');
    }

    const metadata = generateApiKey('adm');
    const hashed = await hashSecret(metadata.apiKey);

    await prisma.adminApiKey.update({
      where: { id: keyId },
      data: {
        hash: hashed.hash,
        salt: hashed.salt,
        prefix: metadata.prefix,
        lastFour: metadata.lastFour,
        rotatedAt: new Date(),
        rotationTokenHash: null,
        rotationTokenSalt: null,
        rotationIssuedAt: null,
        rotationExpiresAt: null,
      },
    });

    res.json({
      apiKey: metadata.apiKey,
      lastFour: metadata.lastFour,
      prefix: metadata.prefix,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/tenants/:tenantId/api-keys', async (req, res, next) => {
  try {
    assertSuperAdmin(req);
    const { tenantId } = req.params;
    const label = typeof req.body?.label === 'string' ? req.body.label : undefined;

    const metadata = generateApiKey('ten');
    const hashed = await hashSecret(metadata.apiKey);

    const record = await prisma.tenantApiKey.create({
      data: {
        tenantId,
        label,
        prefix: metadata.prefix,
        hash: hashed.hash,
        salt: hashed.salt,
        lastFour: metadata.lastFour,
      },
    });

    res.status(201).json({
      id: record.id,
      apiKey: metadata.apiKey,
      lastFour: metadata.lastFour,
      prefix: metadata.prefix,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/tenants/:tenantId/api-keys/:keyId/rotation', async (req, res, next) => {
  try {
    assertSuperAdmin(req);
    const { tenantId, keyId } = req.params;

    const key = await prisma.tenantApiKey.findFirst({
      where: {
        id: keyId,
        tenantId,
        active: true,
      },
    });

    if (!key) {
      throw createHttpError(404, 'Tenant API key not found');
    }

    const rotation = await generateRotationToken();
    await prisma.tenantApiKey.update({
      where: { id: key.id },
      data: {
        rotationTokenHash: rotation.hash,
        rotationTokenSalt: rotation.salt,
        rotationIssuedAt: new Date(),
        rotationExpiresAt: rotation.expiresAt,
      },
    });

    res.json({
      rotationToken: rotation.token,
      expiresAt: rotation.expiresAt.toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

router.post('/tenants/:tenantId/api-keys/:keyId/rotation/confirm', async (req, res, next) => {
  try {
    assertSuperAdmin(req);
    const { tenantId, keyId } = req.params;
    const token = typeof req.body?.token === 'string' ? req.body.token : undefined;

    if (!token) {
      throw createHttpError(400, 'Rotation token is required');
    }

    const key = await prisma.tenantApiKey.findFirst({
      where: {
        id: keyId,
        tenantId,
        active: true,
      },
    });

    if (!key || !key.rotationTokenHash || !key.rotationTokenSalt || !key.rotationExpiresAt) {
      throw createHttpError(400, 'No pending rotation for this API key');
    }

    if (key.rotationExpiresAt.getTime() < Date.now()) {
      throw createHttpError(400, 'Rotation token has expired');
    }

    const validToken = await verifySecret(token, key.rotationTokenHash, key.rotationTokenSalt);
    if (!validToken) {
      throw createHttpError(400, 'Invalid rotation token');
    }

    const metadata = generateApiKey('ten');
    const hashed = await hashSecret(metadata.apiKey);

    await prisma.tenantApiKey.update({
      where: { id: keyId },
      data: {
        hash: hashed.hash,
        salt: hashed.salt,
        prefix: metadata.prefix,
        lastFour: metadata.lastFour,
        rotatedAt: new Date(),
        rotationTokenHash: null,
        rotationTokenSalt: null,
        rotationIssuedAt: null,
        rotationExpiresAt: null,
      },
    });

    res.json({
      apiKey: metadata.apiKey,
      lastFour: metadata.lastFour,
      prefix: metadata.prefix,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
