import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('AuthenticateTenantUser');
const prisma = getPrismaClient();

interface TenantUserPayload {
  tenantId: string;
  userId: string;
  [key: string]: any;
}

declare global {
  namespace Express {
    interface Request {
      tenantUser?: {
        tenantId: string;
        userId: string;
      };
    }
  }
}

/**
 * Middleware to authenticate tenant users via JWT token
 * Expects Authorization header with Bearer token format
 */
export async function authenticateTenantUser(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('Missing or invalid Authorization header', {
        path: req.path,
        method: req.method,
      });
      return next(createHttpError(401, 'Missing or invalid authorization token'));
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Get JWT secret from environment
    const secret = process.env.WEBCHAT_JWT_SECRET;
    if (!secret) {
      logger.error('WEBCHAT_JWT_SECRET not configured');
      return next(createHttpError(500, 'Authentication not configured'));
    }

    // Verify and decode JWT token
    let payload: TenantUserPayload;
    try {
      payload = jwt.verify(token, secret) as TenantUserPayload;
    } catch (error) {
      logger.warn('Invalid JWT token', {
        error: error instanceof Error ? error.message : 'Unknown error',
        path: req.path,
      });
      return next(createHttpError(401, 'Invalid or expired token'));
    }

    // Extract tenantId and userId from payload
    // Support multiple payload formats for flexibility
    const tenantId = payload.tenantId || payload.tid;
    const userId = payload.userId || payload.sub;

    if (!tenantId || !userId) {
      logger.warn('JWT token missing required claims', {
        hasTenantId: !!tenantId,
        hasUserId: !!userId,
      });
      return next(createHttpError(401, 'Invalid token payload'));
    }

    // Verify tenant exists and is enabled
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, enabled: true },
    });

    if (!tenant) {
      logger.warn('Tenant not found', { tenantId });
      return next(createHttpError(401, 'Invalid tenant'));
    }

    if (!tenant.enabled) {
      logger.warn('Disabled tenant attempted access', { tenantId });
      return next(createHttpError(403, 'Tenant account is disabled'));
    }

    // Attach authenticated tenant user to request
    req.tenantUser = {
      tenantId,
      userId,
    };

    logger.info('Tenant user authenticated', {
      tenantId,
      userId,
      path: req.path,
      method: req.method,
    });

    next();
  } catch (error) {
    logger.error('Authentication error', error);
    return next(createHttpError(500, 'Authentication failed'));
  }
}
