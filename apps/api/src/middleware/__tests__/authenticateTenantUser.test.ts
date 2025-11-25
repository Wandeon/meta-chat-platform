import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authenticateTenantUser } from '../authenticateTenantUser';
import { generateToken } from '../../utils/jwt';
import type { Request, Response, NextFunction } from 'express';

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function createMockRequest(headers: Record<string, string | undefined> = {}): Request {
  return {
    headers: headers as any,
  } as Request;
}

describe('authenticateTenantUser', () => {
  const secret = 'test-secret';

  beforeEach(() => {
    process.env.ADMIN_JWT_SECRET = secret;
  });

  it('attaches tenant user payload and calls next for valid token', () => {
    const token = generateToken({
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'user@example.com',
    });

    const req = createMockRequest({ authorization: `Bearer ${token}` });
    const res = createMockResponse();
    const next = vi.fn();

    authenticateTenantUser(req, res, next as unknown as NextFunction);

    expect(req.tenantUser).toMatchObject({
      userId: 'user-1',
      tenantId: 'tenant-1',
      email: 'user@example.com',
      type: 'tenant_user',
    });
    expect(next).toHaveBeenCalled();
    expect((res.status as any)).not.toHaveBeenCalled();
  });

  it('returns 401 when authorization header is missing', () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = vi.fn();

    authenticateTenantUser(req, res, next as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Authentication required',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 for invalid token', () => {
    const req = createMockRequest({ authorization: 'Bearer invalid' });
    const res = createMockResponse();
    const next = vi.fn();

    authenticateTenantUser(req, res, next as unknown as NextFunction);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Invalid or expired authentication token',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
