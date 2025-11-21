import createHttpError from 'http-errors';
import type { NextFunction, Request, Response } from 'express';

/**
 * Tenant Context Middleware
 * 
 * Ensures all requests have proper tenant isolation by:
 * 1. Extracting tenantId from authenticated API key
 * 2. Validating tenant access for non-admin requests
 * 3. Making tenantId available in request context
 * 
 * This middleware MUST be used after authentication middleware.
 */

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      isAdmin?: boolean;
    }
  }
}

/**
 * Extracts and validates tenant context from authenticated request.
 * 
 * For tenant API keys: Sets req.tenantId to the authenticated tenant's ID
 * For admin API keys: Allows access to all tenants but requires explicit tenantId in query/body
 * 
 * Security:
 * - Tenant users can ONLY access their own tenant's data
 * - Admin users must explicitly specify tenantId for each request
 * - All downstream handlers can trust req.tenantId is valid and authorized
 */
export async function extractTenantContext(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  // Check if authenticated (tenant or admin)
  if (!req.tenant && !req.adminUser) {
    return next(createHttpError(401, 'Authentication required'));
  }

  // If authenticated with tenant API key
  if (req.tenant) {
    req.tenantId = req.tenant.id;
    req.isAdmin = false;
    return next();
  }

  // If authenticated with admin API key
  if (req.adminUser) {
    req.isAdmin = true;
    
    // Admin must explicitly provide tenantId
    const tenantId = req.query.tenantId || req.body.tenantId;
    if (!tenantId || typeof tenantId !== 'string') {
      return next(createHttpError(400, 'Admin requests must include tenantId parameter'));
    }
    
    req.tenantId = tenantId;
    return next();
  }

  return next(createHttpError(401, 'Invalid authentication state'));
}

/**
 * Enforces tenant isolation by ensuring requests can only access specified tenant's data.
 * 
 * Security:
 * - Validates that tenant users cannot manipulate tenantId in request
 * - Ensures all queries will be scoped to req.tenantId
 * - Prevents cross-tenant data access
 */
export function enforceTenantIsolation(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Ensure tenantId is set by extractTenantContext middleware
  if (!req.tenantId) {
    return next(createHttpError(500, 'Tenant context not initialized'));
  }

  // For non-admin users, prevent tenantId manipulation
  if (!req.isAdmin) {
    // If tenantId provided in query/body, it must match authenticated tenant
    const requestedTenantId = req.query.tenantId || req.body.tenantId;
    if (requestedTenantId && requestedTenantId !== req.tenantId) {
      return next(createHttpError(403, 'Cannot access other tenant data'));
    }
  }

  next();
}
