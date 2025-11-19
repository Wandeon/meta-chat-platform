import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Scoping Utilities
 * 
 * Helper functions to ensure all database queries are properly scoped to a tenant,
 * preventing cross-tenant data access vulnerabilities.
 */

/**
 * Helper to add tenantId to Prisma where clauses
 * 
 * @example
 * const conversation = await prisma.conversation.findFirst({
 *   where: scopeToTenant({ id: conversationId }, req.tenant.id),
 * });
 */
export function scopeToTenant<T extends Record<string, any>>(
  where: T,
  tenantId: string
): T & { tenantId: string } {
  return {
    ...where,
    tenantId,
  };
}

/**
 * Middleware to ensure tenant context is present
 * Use this before routes that require tenant scoping
 * 
 * @example
 * router.use(requireTenantScope);
 */
export function requireTenantScope(req: Request, res: Response, next: NextFunction): void {
  if (\!req.tenant || \!req.tenant.id) {
    res.status(403).json({
      success: false,
      error: 'Tenant context required',
      code: 'NO_TENANT_CONTEXT',
    });
    return;
  }
  next();
}

/**
 * Extract tenant ID from request
 * Checks both req.tenant (from auth middleware) and req.query.tenantId
 * 
 * @throws Error if tenantId is not found or invalid
 */
export function getTenantId(req: Request): string {
  // Priority 1: Authenticated tenant from middleware
  if (req.tenant?.id) {
    return req.tenant.id;
  }

  // Priority 2: Query parameter (for admin routes)
  const { tenantId } = req.query;
  if (tenantId && typeof tenantId === 'string') {
    return tenantId;
  }

  // Priority 3: Body parameter
  const bodyTenantId = (req.body as any)?.tenantId;
  if (bodyTenantId && typeof bodyTenantId === 'string') {
    return bodyTenantId;
  }

  throw new Error('Tenant ID not found in request');
}

/**
 * Validate that a resource belongs to the requesting tenant
 * 
 * @param resource - The database resource to validate
 * @param expectedTenantId - The tenant ID that should own this resource
 * @returns The resource if valid
 * @throws Error with 404 status if resource doesn't belong to tenant
 */
export function validateTenantOwnership<T extends { tenantId: string }>(
  resource: T | null,
  expectedTenantId: string
): T {
  if (\!resource) {
    const error = new Error('Resource not found') as any;
    error.status = 404;
    throw error;
  }

  if (resource.tenantId \!== expectedTenantId) {
    const error = new Error('Resource not found') as any;
    error.status = 404;
    throw error;
  }

  return resource;
}

/**
 * Create a safe delete operation that only deletes if owned by tenant
 * Uses deleteMany with tenantId filter to prevent cross-tenant deletion
 * 
 * @example
 * const deleted = await safeTenantDelete(
 *   prisma.document,
 *   documentId,
 *   tenantId
 * );
 */
export async function safeTenantDelete<T extends { deleteMany: any }>(
  model: T,
  id: string,
  tenantId: string
): Promise<boolean> {
  const result = await model.deleteMany({
    where: {
      id,
      tenantId,
    },
  });

  return result.count > 0;
}
