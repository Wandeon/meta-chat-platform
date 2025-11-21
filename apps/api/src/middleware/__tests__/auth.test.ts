import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import { authenticateTenant, authenticateAdmin } from '../auth';
import { prisma } from '../../prisma';
import { hashSecret } from '@meta-chat/shared';

// Mock the prisma client
vi.mock('../../prisma', () => ({
  prisma: {
    tenantApiKey: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    adminApiKey: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    adminAuditLog: {
      create: vi.fn(),
    },
  },
}));

// Mock the shared module
vi.mock('@meta-chat/shared', async () => {
  const actual = await vi.importActual('@meta-chat/shared');
  return {
    ...actual,
    addToRequestContext: vi.fn(),
    createLogger: vi.fn(() => ({
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    })),
  };
});

describe('Auth Middleware Security Tests', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      header: vi.fn(),
      query: {},
      path: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      get: vi.fn((header) => (header === 'user-agent' ? 'test-agent' : undefined)),
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    mockNext = vi.fn();

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('API Key Format Validation', () => {
    it('should reject API keys with invalid format (too short)', async () => {
      (mockReq.header as any).mockReturnValue('short');

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          message: 'Invalid tenant API key',
        })
      );
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth_failure',
            description: 'Invalid API key format',
          }),
        })
      );
    });

    it('should reject API keys with invalid characters', async () => {
      (mockReq.header as any).mockReturnValue('invalid@key#with$special%chars');

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          message: 'Invalid tenant API key',
        })
      );
      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth_failure',
            description: 'Invalid API key format',
          }),
        })
      );
    });

    it('should reject empty API keys', async () => {
      (mockReq.header as any).mockReturnValue('');

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 401,
          message: 'Missing tenant API key',
        })
      );
      expect(prisma.adminAuditLog.create).toHaveBeenCalled();
    });

    it('should accept valid API key format', async () => {
      const validKey = 'mcp_abcdefghijklmnopqrstuvwxyz123456';
      (mockReq.header as any).mockReturnValue(validKey);

      // Mock DB response
      (prisma.tenantApiKey.findFirst as any).mockResolvedValue(null);

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      // Should have attempted DB lookup (format was valid)
      expect(prisma.tenantApiKey.findFirst).toHaveBeenCalled();
    });
  });

  describe('Audit Logging for Auth Failures', () => {
    it('should log audit entry when API key is missing', async () => {
      (mockReq.header as any).mockReturnValue(undefined);

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorType: 'tenant',
            action: 'auth_failure',
            description: 'Missing tenant API key',
            ipAddress: '127.0.0.1',
            userAgent: 'test-agent',
            metadata: expect.objectContaining({
              path: '/test',
              method: 'GET',
            }),
          }),
        })
      );
    });

    it('should log audit entry with IP and user agent on format failure', async () => {
      (mockReq.header as any).mockReturnValue('invalid-key');
      mockReq.ip = '192.168.1.100';

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ipAddress: '192.168.1.100',
            userAgent: 'test-agent',
          }),
        })
      );
    });

    it('should log audit entry when API key not found in DB', async () => {
      const validKey = 'mcp_abcdefghijklmnopqrstuvwxyz123456';
      (mockReq.header as any).mockReturnValue(validKey);
      (prisma.tenantApiKey.findFirst as any).mockResolvedValue(null);

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth_failure',
            description: 'API key not found',
          }),
        })
      );
    });

    it('should log audit entry when API key credentials are invalid', async () => {
      const validKey = 'mcp_abcdefghijklmnopqrstuvwxyz123456';
      (mockReq.header as any).mockReturnValue(validKey);

      const { hash, salt } = await hashSecret('different-key');
      (prisma.tenantApiKey.findFirst as any).mockResolvedValue({
        id: 'key-123',
        tenantId: 'tenant-123',
        hash,
        salt,
        active: true,
        expiresAt: null,
      });

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth_failure',
            description: 'Invalid API key credentials',
          }),
        })
      );
    });

    it('should log audit entry when API key is expired', async () => {
      const validKey = 'mcp_abcdefghijklmnopqrstuvwxyz123456';
      (mockReq.header as any).mockReturnValue(validKey);

      const { hash, salt } = await hashSecret(validKey);
      const expiredDate = new Date(Date.now() - 86400000); // Yesterday
      (prisma.tenantApiKey.findFirst as any).mockResolvedValue({
        id: 'key-123',
        tenantId: 'tenant-123',
        hash,
        salt,
        active: true,
        expiresAt: expiredDate,
      });

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'auth_failure',
            description: 'Expired API key',
          }),
        })
      );
    });
  });

  describe('Database Query Prevention', () => {
    it('should not query database for invalid format keys', async () => {
      (mockReq.header as any).mockReturnValue('invalid@key');

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      // Should NOT have queried the database
      expect(prisma.tenantApiKey.findFirst).not.toHaveBeenCalled();
    });

    it('should not query database for too-short keys', async () => {
      (mockReq.header as any).mockReturnValue('short');

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      // Should NOT have queried the database
      expect(prisma.tenantApiKey.findFirst).not.toHaveBeenCalled();
    });

    it('should query database for valid format keys', async () => {
      const validKey = 'mcp_abcdefghijklmnopqrstuvwxyz123456';
      (mockReq.header as any).mockReturnValue(validKey);
      (prisma.tenantApiKey.findFirst as any).mockResolvedValue(null);

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      // SHOULD have queried the database (format was valid)
      expect(prisma.tenantApiKey.findFirst).toHaveBeenCalled();
    });
  });

  describe('Admin Authentication', () => {
    it('should validate admin API key format', async () => {
      (mockReq.header as any).mockReturnValue('invalid-admin-key');

      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorType: 'admin',
            action: 'auth_failure',
            description: 'Invalid API key format',
          }),
        })
      );
      expect(prisma.adminApiKey.findFirst).not.toHaveBeenCalled();
    });

    it('should log admin auth failures', async () => {
      const validKey = 'admin_abcdefghijklmnopqrstuvwxyz12';
      (mockReq.header as any).mockReturnValue(validKey);
      (prisma.adminApiKey.findFirst as any).mockResolvedValue(null);

      await authenticateAdmin(mockReq as Request, mockRes as Response, mockNext);

      expect(prisma.adminAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            actorType: 'admin',
            action: 'auth_failure',
          }),
        })
      );
    });
  });

  describe('Successful Authentication', () => {
    it('should allow valid tenant API key', async () => {
      const validKey = 'mcp_abcdefghijklmnopqrstuvwxyz123456';
      (mockReq.header as any).mockReturnValue(validKey);

      const { hash, salt } = await hashSecret(validKey);
      (prisma.tenantApiKey.findFirst as any).mockResolvedValue({
        id: 'key-123',
        tenantId: 'tenant-123',
        hash,
        salt,
        active: true,
        expiresAt: null,
        tenant: { id: 'tenant-123' },
      });
      (prisma.tenantApiKey.update as any).mockResolvedValue({});

      await authenticateTenant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.tenant).toEqual({
        id: 'tenant-123',
        apiKeyId: 'key-123',
      });
      expect(mockNext).toHaveBeenCalledWith();
      expect(prisma.tenantApiKey.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'key-123' },
          data: expect.objectContaining({ lastUsedAt: expect.any(Date) }),
        })
      );
    });
  });
});
