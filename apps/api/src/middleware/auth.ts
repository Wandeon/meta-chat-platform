import createHttpError from 'http-errors';
import type { NextFunction, Request, Response } from 'express';
import { addToRequestContext, deriveApiKeyMetadata, verifySecret } from '@meta-chat/shared';
import { prisma } from '../prisma';

const AUTH_HEADER = 'x-api-key';
const ADMIN_HEADER = 'x-admin-key';

interface TenantContext {
  id: string;
  apiKeyId: string;
}

interface AdminContext {
  id: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      adminUser?: AdminContext;
    }
  }
}

async function resolveTenantByApiKey(apiKey: string) {
  let prefix: string;
  try {
    ({ prefix } = deriveApiKeyMetadata(apiKey));
  } catch (error) {
    return null;
  }
  const candidate = await prisma.tenantApiKey.findFirst({
    where: {
      prefix,
      active: true,
    },
    include: {
      tenant: true,
    },
  });

  if (!candidate) {
    return null;
  }

  const isValid = await verifySecret(apiKey, candidate.hash, candidate.salt);
  if (!isValid) {
    return null;
  }

  if (candidate.expiresAt && candidate.expiresAt < new Date()) {
    return null;
  }

  await prisma.tenantApiKey.update({
    where: { id: candidate.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    tenantId: candidate.tenantId,
    apiKeyId: candidate.id,
  };
}

async function resolveAdminByApiKey(apiKey: string) {
  let prefix: string;
  try {
    ({ prefix } = deriveApiKeyMetadata(apiKey));
  } catch (error) {
    return null;
  }
  const candidate = await prisma.adminApiKey.findFirst({
    where: {
      prefix,
      active: true,
    },
    include: {
      admin: true,
    },
  });

  if (!candidate) {
    return null;
  }

  const isValid = await verifySecret(apiKey, candidate.hash, candidate.salt);
  if (!isValid) {
    return null;
  }

  if (candidate.expiresAt && candidate.expiresAt < new Date()) {
    return null;
  }

  await prisma.adminApiKey.update({
    where: { id: candidate.id },
    data: { lastUsedAt: new Date() },
  });

  return {
    adminId: candidate.adminId,
    role: candidate.admin.role,
    apiKeyId: candidate.id,
  };
}

export async function authenticateTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.header(AUTH_HEADER) ?? req.query.apiKey;
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    return next(createHttpError(401, 'Missing tenant API key'));
  }

  const resolved = await resolveTenantByApiKey(apiKey);
  if (!resolved) {
    return next(createHttpError(401, 'Invalid tenant API key'));
  }

  req.tenant = {
    id: resolved.tenantId,
    apiKeyId: resolved.apiKeyId,
  };

  addToRequestContext({ tenantId: resolved.tenantId });

  return next();
}

export async function authenticateAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.header(ADMIN_HEADER) ?? req.header(AUTH_HEADER);
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    return next(createHttpError(401, 'Missing admin API key'));
  }

  const resolved = await resolveAdminByApiKey(apiKey);
  if (!resolved) {
    return next(createHttpError(401, 'Invalid admin API key'));
  }

  req.adminUser = {
    id: resolved.adminId,
    role: resolved.role,
  };

  addToRequestContext({ adminId: resolved.adminId });

  return next();
}

export async function authenticateAdminOrTenant(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.header(ADMIN_HEADER) ?? req.header(AUTH_HEADER);
  if (typeof apiKey !== 'string' || apiKey.length === 0) {
    return next(createHttpError(401, 'Missing API key'));
  }

  // Try admin authentication first
  const adminResolved = await resolveAdminByApiKey(apiKey);
  if (adminResolved) {
    req.adminUser = {
      id: adminResolved.adminId,
      role: adminResolved.role,
    };
    addToRequestContext({ adminId: adminResolved.adminId });
    return next();
  }

  // Try tenant authentication
  const tenantResolved = await resolveTenantByApiKey(apiKey);
  if (tenantResolved) {
    req.tenant = {
      id: tenantResolved.tenantId,
      apiKeyId: tenantResolved.apiKeyId,
    };
    addToRequestContext({ tenantId: tenantResolved.tenantId });
    return next();
  }

  return next(createHttpError(401, 'Invalid API key'));
}
