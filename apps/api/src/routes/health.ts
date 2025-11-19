import { Router } from 'express';
import { getPrismaClient } from '@meta-chat/database';
import { totalmem } from 'os';

const router = Router();
const prisma = getPrismaClient();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'up' | 'down';
      latency?: number;
    };
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    process: {
      pid: number;
      uptime: number;
      version: string;
    };
  };
  errors?: string[];
}

router.get('/health', async (req, res) => {
  const errors: string[] = [];
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

  // Check database connection
  let dbStatus: 'up' | 'down' = 'down';
  let dbLatency: number | undefined;
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - dbStart;
    dbStatus = 'up';

    if (dbLatency > 1000) {
      errors.push('Database response time > 1s');
      overallStatus = 'degraded';
    }
  } catch (error: any) {
    errors.push(`Database connection failed: ${error.message}`);
    overallStatus = 'unhealthy';
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const totalMem = totalmem();
  const usedMem = memUsage.heapUsed;
  const memPercentage = (usedMem / totalMem) * 100;

  if (memPercentage > 90) {
    errors.push('Memory usage > 90%');
    overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
  }

  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: {
        status: dbStatus,
        latency: dbLatency,
      },
      memory: {
        used: Math.round(usedMem / 1024 / 1024), // MB
        total: Math.round(totalMem / 1024 / 1024), // MB
        percentage: Math.round(memPercentage * 100) / 100,
      },
      process: {
        pid: process.pid,
        uptime: Math.round(process.uptime()),
        version: process.version,
      },
    },
    errors: errors.length > 0 ? errors : undefined,
  };

  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(result);
});

// Simple liveness probe (for Kubernetes/Docker)
router.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Readiness probe (checks if ready to accept traffic)
router.get('/health/ready', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready' });
  } catch (error: any) {
    res.status(503).json({ status: 'not ready', error: error.message });
  }
});

export default router;
