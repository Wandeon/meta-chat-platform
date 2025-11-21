import createHttpError from 'http-errors';
import type { NextFunction, Request, Response } from 'express';
import { addToRequestContext, deriveApiKeyMetadata, verifySecret } from '@meta-chat/shared';
import { prisma } from '../prisma';
import { createLogger } from '@meta-chat/shared';

const AUTH_HEADER = 'x-api-key';
const ADMIN_HEADER = 'x-admin-key';
const logger = createLogger('AuthMiddleware');

// API key format validation - must be alphanumeric with underscores/hyphens
// Expected format: prefix_base64url (e.g., mcp_xxxxx)
const API_KEY_FORMAT_REGEX = /^[a-zA-Z0-9_-]+$/;
const MIN_API_KEY_LENGTH = 20; // Minimum length for a valid API key

/**
 * Validates API key format before attempting database lookup
 * This prevents unnecessary DB queries for malformed keys
 */
function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || apiKey.length < MIN_API_KEY_LENGTH) {
    return false;
  }
  return API_KEY_FORMAT_REGEX.test(apiKey);
}

/**
 * Logs authentication failures for security audit
 */
async function logAuthFailure(
  reason: string,
  apiKey: string | undefined,
  req: Request,
  actorType: 'tenant' | 'admin',
): Promise<void> {
  try {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    await prisma.adminAuditLog.create({
      data: {
        actorType,
        action: 'auth_failure',
        target: actorType === 'tenant' ? 'tenant_api_key' : 'admin_api_key',
        description: reason,
        metadata: {
          reason,
          apiKeyPrefix: apiKey ? apiKey.substring(0, Math.min(10, apiKey.length)) : 'none',
          path: req.path,
          method: req.method,
        },
        ipAddress,
        userAgent,
      },
    });

    logger.warn('Authentication failure', {
      reason,
      actorType,
      ipAddress,
      userAgent,
      path: req.path,
      method: req.method,
    });
  } catch (error) {
    logger.error('Failed to log auth failure', error);
  }
}

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

async function resolveTenantByApiKey(apiKey: string, req?: Request) {
  // Validate API key format before DB lookup
  if (!validateApiKeyFormat(apiKey)) {
    if (req) {
      await logAuthFailure('Invalid API key format', apiKey, req, 'tenant');
    }
    return null;
  }

  let prefix: string;
  try {
    ({ prefix } = deriveApiKeyMetadata(apiKey));
  } catch (error) {
    if (req) {
      await logAuthFailure('Failed to derive API key metadata', apiKey, req, 'tenant');
    }
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
    if (req) {
      await logAuthFailure('API key not found', apiKey, req, 'tenant');
    }
    return null;
  }

  const isValid = await verifySecret(apiKey, candidate.hash, candidate.salt);
  if (!isValid) {
    if (req) {
      await logAuthFailure('Invalid API key credentials', apiKey, req, 'tenant');
    }
    return null;
  }

  if (candidate.expiresAt && candidate.expiresAt < new Date()) {
    if (req) {
      await logAuthFailure('Expired API key', apiKey, req, 'tenant');
    }
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

async function resolveAdminByApiKey(apiKey: string, req?: Request) {
  // Validate API key format before DB lookup
  if (!validateApiKeyFormat(apiKey)) {
    if (req) {
      await logAuthFailure('Invalid API key format', apiKey, req, 'admin');
    }
    return null;
  }

  let prefix: string;
  try {
    ({ prefix } = deriveApiKeyMetadata(apiKey));
  } catch (error) {
    if (req) {
      await logAuthFailure('Failed to derive API key metadata', apiKey, req, 'admin');
    }
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
    if (req) {
      await logAuthFailure('API key not found', apiKey, req, 'admin');
    }
    return null;
  }

  const isValid = await verifySecret(apiKey, candidate.hash, candidate.salt);
  if (!isValid) {
    if (req) {
      await logAuthFailure('Invalid API key credentials', apiKey, req, 'admin');
    }
    return null;
  }

  if (candidate.expiresAt && candidate.expiresAt < new Date()) {
    if (req) {
      await logAuthFailure('Expired API key', apiKey, req, 'admin');
    }
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
    await logAuthFailure('Missing tenant API key', undefined, req, 'tenant');
    return next(createHttpError(401, 'Missing tenant API key'));
  }

  const resolved = await resolveTenantByApiKey(apiKey, req);
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
    await logAuthFailure('Missing admin API key', undefined, req, 'admin');
    return next(createHttpError(401, 'Missing admin API key'));
  }

  const resolved = await resolveAdminByApiKey(apiKey, req);
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
    await logAuthFailure('Missing API key', undefined, req, 'tenant');
    return next(createHttpError(401, 'Missing API key'));
  }

  // Try admin authentication first
  const adminResolved = await resolveAdminByApiKey(apiKey, req);
  if (adminResolved) {
    req.adminUser = {
      id: adminResolved.adminId,
      role: adminResolved.role,
    };
    addToRequestContext({ adminId: adminResolved.adminId });
    return next();
  }

  // Try tenant authentication (don't log failure here, already logged in resolveAdminByApiKey)
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
