import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const updateMock = vi.fn();
const tenantFindFirstMock = vi.fn();
const adminFindFirstMock = vi.fn();

vi.mock('../prisma', () => ({
  prisma: {
    tenantApiKey: {
      findFirst: tenantFindFirstMock,
      update: updateMock,
    },
    adminApiKey: {
      findFirst: adminFindFirstMock,
      update: updateMock,
    },
  },
}));

let prisma: typeof import('../prisma').prisma;
let authenticateTenant: typeof import('../middleware/auth').authenticateTenant;
let authenticateAdmin: typeof import('../middleware/auth').authenticateAdmin;

beforeAll(async () => {
  ({ prisma } = await import('../prisma'));
  ({ authenticateAdmin, authenticateTenant } = await import('../middleware/auth'));
});

function buildReq(headers: Record<string, string | undefined> = {}): Request {
  return {
    header: (name: string) => headers[name.toLowerCase()] ?? headers[name],
    query: {},
  } as unknown as Request;
}

function noop(): void {}

describe('authentication middleware', () => {
  beforeEach(() => {
    updateMock.mockReset();
    tenantFindFirstMock.mockReset();
    adminFindFirstMock.mockReset();
  });

  it('authenticates a tenant API key and populates context', async () => {
    const metadata = generateApiKey('ten');
    const hashed = await hashSecret(metadata.apiKey);
    tenantFindFirstMock.mockResolvedValue({
      id: 'key-1',
      tenantId: 'tenant-1',
      hash: hashed.hash,
      salt: hashed.salt,
      active: true,
      expiresAt: null,
    });

    const req = buildReq({ 'x-api-key': metadata.apiKey }) as Request & { tenant?: any };
    await authenticateTenant(req, {} as Response, noop as NextFunction);

    expect(req.tenant).toEqual({ id: 'tenant-1', apiKeyId: 'key-1' });
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'key-1' }, data: { lastUsedAt: expect.any(Date) } });
  });

  it('authenticates an admin API key and enforces roles', async () => {
    const metadata = generateApiKey('adm');
    const hashed = await hashSecret(metadata.apiKey);
    adminFindFirstMock.mockResolvedValue({
      id: 'admin-key',
      adminId: 'admin-1',
      hash: hashed.hash,
      salt: hashed.salt,
      active: true,
      expiresAt: null,
      admin: {
        role: 'SUPER',
      },
    });

    const req = buildReq({ 'x-admin-key': metadata.apiKey }) as Request & { adminUser?: any };
    await authenticateAdmin(req, {} as Response, noop as NextFunction);

    expect(req.adminUser).toEqual({ id: 'admin-1', role: 'SUPER' });
    expect(updateMock).toHaveBeenCalledWith({ where: { id: 'admin-key' }, data: { lastUsedAt: expect.any(Date) } });
  });

  it('rejects invalid credentials', async () => {
    tenantFindFirstMock.mockResolvedValue(null);
    const next = vi.fn();
    const req = buildReq({ 'x-api-key': 'invalid' });

    await authenticateTenant(req, {} as Response, next as NextFunction);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: 'Invalid tenant API key' }));
  });
});
