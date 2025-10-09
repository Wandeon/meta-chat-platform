import { afterEach, beforeAll, vi } from 'vitest';

const createMockLogger = () => {
  const logger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(),
  };

  logger.child.mockImplementation(() => createMockLogger());

  return logger;
};

// shared mocks and hooks applied for Vitest projects

vi.mock('@meta-chat/shared', async () => {
  const actual = await vi.importActual<typeof import('../../packages/shared/src')>(
    '../../packages/shared/src/index.ts'
  );

  if (process.env.VITEST_MODE !== 'unit') {
    return actual;
  }

  return {
    ...actual,
    createLogger: vi.fn(() => createMockLogger()),
  };
});

vi.mock('@prisma/client', async () => {
  if (process.env.VITEST_MODE !== 'unit') {
    const actual = await vi.importActual<typeof import('@prisma/client')>('@prisma/client');
    return actual;
  }

  class PrismaClient {
    public $queryRaw = vi.fn();
    public $executeRaw = vi.fn();
    public $executeRawUnsafe = vi.fn();
    public $disconnect = vi.fn();
    public tenantApiKey = {
      findFirst: vi.fn(),
      update: vi.fn(),
    };
    public adminApiKey = {
      findFirst: vi.fn(),
      update: vi.fn(),
    };
  }

  return { PrismaClient };
});

beforeAll(() => {
  process.env.TZ = 'UTC';
});

afterEach(() => {
  if (global.gc) {
    try {
      global.gc();
    } catch {
      // ignore GC failures in non-heap snapshots
    }
  }
});
