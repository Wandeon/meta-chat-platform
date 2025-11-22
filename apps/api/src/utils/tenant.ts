import createHttpError from 'http-errors';
import type { Request } from 'express';

/**
 * Resolve the tenantId for a request using authenticated context first, then request params.
 * If both are present they must match, otherwise reject the request.
 */
export function requireTenantId(req: Request, options: { allowQuery?: boolean; allowBody?: boolean } = {}): string {
  const tenantFromAuth = req.tenant?.id;
  const tenantFromQuery = options.allowQuery ? (req.query.tenantId ? String(req.query.tenantId) : undefined) : undefined;
  const tenantFromBody = options.allowBody ? (req.body && typeof (req.body as any).tenantId === 'string' ? (req.body as any).tenantId : undefined) : undefined;

  const tenantFromRequest = tenantFromAuth ?? tenantFromQuery ?? tenantFromBody;

  // If multiple sources are present they must agree
  const candidates = [tenantFromAuth, tenantFromQuery, tenantFromBody].filter(Boolean) as string[];
  const unique = new Set(candidates);
  if (unique.size > 1) {
    throw createHttpError(403, 'Tenant ID mismatch between credentials and request');
  }

  if (!tenantFromRequest) {
    throw createHttpError(400, 'tenantId is required');
  }

  return tenantFromRequest;
}
