import { describe, expect, it } from 'vitest';
import type { Request } from 'express';
import { requireTenantId } from '../tenant';

function buildReq(input: Partial<Request> & { tenant?: { id: string } } = {}): Request {
  return {
    tenant: input.tenant,
    query: input.query ?? {},
    body: input.body ?? {},
  } as unknown as Request;
}

describe('requireTenantId', () => {
  it('returns tenant from auth context', () => {
    const req = buildReq({ tenant: { id: 'tenant-auth' } });
    expect(requireTenantId(req)).toBe('tenant-auth');
  });

  it('returns tenant from query when allowed', () => {
    const req = buildReq({ query: { tenantId: 'tenant-query' } as any });
    expect(requireTenantId(req, { allowQuery: true })).toBe('tenant-query');
  });

  it('rejects mismatched auth and query tenants', () => {
    const req = buildReq({ tenant: { id: 'tenant-auth' }, query: { tenantId: 'other' } as any });
    expect(() => requireTenantId(req, { allowQuery: true })).toThrow(/Tenant ID mismatch/);
  });

  it('rejects missing tenant when none supplied', () => {
    const req = buildReq();
    expect(() => requireTenantId(req)).toThrow(/tenantId is required/);
  });

  it('prefers auth tenant when body matches', () => {
    const req = buildReq({ tenant: { id: 'tenant-auth' }, body: { tenantId: 'tenant-auth' } });
    expect(requireTenantId(req, { allowBody: true })).toBe('tenant-auth');
  });
});
