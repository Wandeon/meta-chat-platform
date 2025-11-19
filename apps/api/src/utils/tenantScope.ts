import { Request } from 'express';
import { Prisma } from '@prisma/client';
import createHttpError from 'http-errors';

// Type for requests with tenant context
export interface TenantRequest extends Request {
  tenant?: {
    id: string;
    name: string;
  };
}

// Ensure a query includes tenant filtering
export function withTenantScope<T extends { where?: any }>(
  tenantId: string,
  query: T
): T {
  if (!tenantId) {
    throw createHttpError(401, 'Tenant context required');
  }

  return {
    ...query,
    where: {
      ...query.where,
      tenantId
    }
  };
}

// Helper to validate tenant ownership of a resource
export async function validateTenantOwnership(
  req: TenantRequest,
  resourceId: string,
  model: any,
  resourceType: string = 'Resource'
): Promise<void> {
  if (!req.tenant) {
    throw createHttpError(401, 'Authentication required');
  }

  const resource = await model.findFirst({
    where: {
      id: resourceId,
      tenantId: req.tenant.id
    }
  });

  if (!resource) {
    throw createHttpError(404, );
  }
}

// Build tenant-scoped Prisma query
export function buildTenantQuery(
  tenantId: string,
  additionalWhere: any = {}
): Prisma.ConversationWhereInput {
  return {
    tenantId,
    ...additionalWhere
  };
}
