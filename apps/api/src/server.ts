import 'dotenv/config';

import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer, Server as HttpServer } from 'http';
import { AddressInfo } from 'net';
import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import amqp, { Channel } from 'amqplib';
import Redis from 'ioredis';
import jwt from 'jsonwebtoken';
import { Server as SocketIOServer } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import createHttpError from 'http-errors';

import { getPrismaClient } from '@meta-chat/database';
import { createLogger, ensureCorrelationId, withRequestContext } from '@meta-chat/shared';

import apiKeyRouter from './routes/apiKeys';
import tenantRouter from './routes/tenants';
import channelRouter from './routes/channels';
import documentRouter from './routes/documents';
import conversationRouter from './routes/conversations';
import webhookRouter from './routes/webhooks';
import chatRouter from './routes/chat';
import mcpServerRouter from './routes/mcpServers';
import ollamaRouter from './routes/ollama';
import widgetConfigRouter from './routes/public/widget-config';
import authRouter from './routes/auth';
import billingRouter from "./routes/billing";
import stripeWebhookRouter from "./routes/webhooks/stripe";
import analyticsRouter from "./routes/analytics";

import { createWebhookIntegrationsRouter } from './routes/webhookIntegrations';
import { metricsRegistry, httpRequestDuration } from './metrics';
import { TenantQueuePublisher } from './queues/task-publisher';
import { WebhookAckStrategy } from './webhooks/ack-strategy';
import type { Request, Response, NextFunction } from 'express';
import { HealthCheck } from '@meta-chat/shared';

type RawBodyRequest = Request & { rawBody?: Buffer };

const prisma = getPrismaClient();
const logger = createLogger('ApiServer');
const HEALTH_CHECK_CACHE_TTL_MS =
  Number.parseInt(process.env.HEALTH_CHECK_CACHE_TTL_MS ?? '', 10) || 3000;

let cachedHealthCheck: { value: HealthCheck; expiresAt: number } | null = null;
let inFlightHealthCheck: Promise<HealthCheck> | null = null;

interface SocketServer {
  io: SocketIOServer;
  close(): Promise<void>;
  redisClients: {
    publisher: Redis | null;
    subscriber: Redis | null;
  };
}

function parseOrigins(): (string | RegExp)[] | boolean {
  const origins = process.env.API_CORS_ORIGINS;
  if (!origins) {
    return true;
  }

  return origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function registerRequestContext(app: express.Express): void {
  app.use((req: RawBodyRequest, res, next) => {
    const requestId = req.header('x-request-id') ?? randomUUID();
    const correlationId = req.header('x-correlation-id') ?? requestId;

    res.setHeader('x-request-id', requestId);
    res.setHeader('x-correlation-id', correlationId);

    withRequestContext({ requestId, correlationId }, () => {
      ensureCorrelationId();
      next();
    });
  });
}

function registerBodyParsers(app: express.Express): void {
  app.use(
    express.json({
      limit: process.env.API_BODY_LIMIT ?? '5mb',
      verify: (req, _res, buf) => {
        (req as RawBodyRequest).rawBody = Buffer.from(buf);
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
}

function registerCors(app: express.Express): void {
  const origins = parseOrigins();
  app.use(
    cors({
      origin: origins,
      credentials: true,
    }),
  );
}

function registerRateLimiting(app: express.Express): void {
  const windowMs = Number.parseInt(process.env.API_RATE_LIMIT_WINDOW_MS ?? '', 10) || 60_000;
  const max = Number.parseInt(process.env.API_RATE_LIMIT_MAX ?? '', 10) || 120;

  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api', limiter);
}

function registerLogging(app: express.Express): void {
  const requestLogger = logger.child('Http');

  app.use((req, res, next) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
      const routePath = req.baseUrl + (req.route?.path ?? '') || req.originalUrl.split('?')[0];
      const statusCode = res.statusCode;

      httpRequestDuration
        .labels(req.method, routePath || 'unknown', String(statusCode))
        .observe(durationMs / 1000);

      requestLogger.info('HTTP request completed', {
        method: req.method,
        route: routePath,
        statusCode,
        durationMs,
        tenantId: req.tenant?.id,
        adminId: req.adminUser?.id,
      });
    });

    next();
  });
}

async function getHealthStatus(
  redisClients: { publisher: Redis | null; subscriber: Redis | null },
  deps: { publisher: TenantQueuePublisher; ackStrategy: WebhookAckStrategy },
): Promise<HealthCheck> {
  const now = Date.now();
  if (cachedHealthCheck && cachedHealthCheck.expiresAt > now) {
    return cachedHealthCheck.value;
  }

  if (!inFlightHealthCheck) {
    inFlightHealthCheck = checkHealth(redisClients, deps).then((result) => {
      cachedHealthCheck = {
        value: result,
        expiresAt: Date.now() + HEALTH_CHECK_CACHE_TTL_MS,
      };
      return result;
    }).finally(() => {
      inFlightHealthCheck = null;
    });
  }

  return inFlightHealthCheck;
}

async function checkHealth(
  redisClients: { publisher: Redis | null; subscriber: Redis | null },
  deps: { publisher: TenantQueuePublisher; ackStrategy: WebhookAckStrategy },
): Promise<HealthCheck> {
  const services: HealthCheck['services'] = {
    database: 'down',
    redis: 'down',
    rabbitmq: 'down',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    services.database = 'up';
  } catch (error) {
    logger.error('Database health check failed', error);
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    services.redis = 'up';
  } else if (redisClients.publisher) {
    try {
      await redisClients.publisher.ping();
      services.redis = 'up';
    } catch (error) {
      logger.error('Redis health check failed', error);
    }
  }

  const rabbitUrl = process.env.RABBITMQ_URL;
  if (!rabbitUrl) {
    services.rabbitmq = 'up';
  } else {
    try {
      await deps.publisher.init();
      const connection = deps.publisher.getConnection();
      if (!connection) {
        throw new Error('RabbitMQ connection unavailable');
      }

      let channel: Channel | null = null;
      try {
        channel = await connection.createChannel();
        await channel.assertQueue('', { exclusive: true, autoDelete: true });
        services.rabbitmq = 'up';
      } finally {
        if (channel) {
          await channel.close().catch((error) => {
            logger.warn('Failed to close health check channel', error);
          });
        }
      }
    } catch (error) {
      logger.error('RabbitMQ health check failed', error);
    }
  }

  const allUp = Object.values(services).every((service) => service === 'up');
  const anyUp = Object.values(services).some((service) => service === 'up');

  const status: HealthCheck['status'] = allUp ? 'healthy' : anyUp ? 'degraded' : 'unhealthy';

  return {
    status,
    services,
    timestamp: new Date().toISOString(),
  };
}

function registerRoutes(
  app: express.Express,
  deps: { publisher: TenantQueuePublisher; ackStrategy: WebhookAckStrategy },
  redisClients: { publisher: Redis | null; subscriber: Redis | null },
): void {
  app.get('/health', async (_req, res) => {
    const health = await getHealthStatus(redisClients, deps);
    res.json(health);
  });

  app.get('/metrics', async (_req, res) => {
    res.setHeader('Content-Type', metricsRegistry.contentType);
    res.send(await metricsRegistry.metrics());
  });

  app.use('/api/security', apiKeyRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/tenants', tenantRouter);
  app.use('/api/channels', channelRouter);
  app.use('/api/documents', documentRouter);
  app.use('/api/conversations', conversationRouter);
  app.use('/api/webhooks', webhookRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/mcp-servers', mcpServerRouter);
  app.use('/api/ollama', ollamaRouter);
  app.use('/api/integrations', createWebhookIntegrationsRouter(deps));
  app.use('/api/public/widget', widgetConfigRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/webhooks", stripeWebhookRouter);

  app.use((req, _res, next) => {
    next(createHttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
  });
}

function registerErrorHandling(app: express.Express): void {
  app.use((error: any, req: Request, res: Response, _next: NextFunction) => {
    const status = error.status ?? 500;
    const code = error.code ?? (status === 500 ? 'internal_error' : 'error');

    logger.error('Request failed', error);

    res.status(status).json({
      success: false,
      error: {
        code,
        message: error.message ?? 'Internal Server Error',
        details: error.errors ?? error.details,
      },
    });
  });
}

async function createSocketServer(httpServer: HttpServer): Promise<SocketServer> {
  const socketLogger = logger.child('Socket');
  const corsOrigins = parseOrigins();
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
  });

  let redisPublisher: Redis | null = null;
  let redisSubscriber: Redis | null = null;

  if (process.env.REDIS_URL) {
    redisPublisher = new Redis(process.env.REDIS_URL);
    redisSubscriber = redisPublisher.duplicate();
    io.adapter(createAdapter(redisPublisher, redisSubscriber));
  }

  io.use((socket, next) => {
    const auth = socket.handshake.auth ?? {};
    const token = typeof auth.token === 'string' ? auth.token : undefined;
    const signature = typeof auth.signature === 'string' ? auth.signature : undefined;
    const tenantId = typeof auth.tenantId === 'string' ? auth.tenantId : undefined;
    const userId = typeof auth.userId === 'string' ? auth.userId : undefined;
    const timestamp = typeof auth.timestamp === 'string' ? auth.timestamp : undefined;

    try {
      if (token) {
        const secret = process.env.WEBCHAT_JWT_SECRET;
        if (!secret) {
          throw new Error('JWT authentication unavailable');
        }

        const payload = jwt.verify(token, secret) as jwt.JwtPayload;
        const resolvedTenant = (payload as any).tenantId ?? payload.tid;
        const resolvedUser = (payload as any).userId ?? payload.sub;

        if (!resolvedTenant || !resolvedUser) {
          throw new Error('Invalid JWT payload');
        }

        socket.data.tenantId = resolvedTenant;
        socket.data.userId = resolvedUser;
        return next();
      }

      const secret = process.env.WEBCHAT_HMAC_SECRET;
      if (!secret) {
        throw new Error('HMAC authentication unavailable');
      }

      if (!tenantId || !userId || !timestamp || !signature) {
        throw new Error('Missing HMAC authentication parameters');
      }

      const expected = createHmac('sha256', secret).update(`${tenantId}:${userId}:${timestamp}`).digest('hex');
      const provided = signature.replace(/^sha256=/, '');

      if (expected.length !== provided.length) {
        throw new Error('Invalid signature length');
      }

      if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(provided, 'hex'))) {
        throw new Error('Invalid signature');
      }

      socket.data.tenantId = tenantId;
      socket.data.userId = userId;
      return next();
    } catch (error) {
      socketLogger.warn('Socket authentication failed', error as Error);
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const tenantId = socket.data.tenantId as string | undefined;
    const userId = socket.data.userId as string | undefined;

    if (tenantId) {
      void socket.join(tenantId);
    }

    if (tenantId && userId) {
      void socket.join(`${tenantId}:${userId}`);
    }

    socketLogger.info('Socket client connected', {
      socketId: socket.id,
      tenantId,
      userId,
    });

    socket.on('disconnect', (reason) => {
      socketLogger.info('Socket client disconnected', {
        socketId: socket.id,
        tenantId,
        userId,
        reason,
      });
    });
  });

  return {
    io,
    redisClients: { publisher: redisPublisher, subscriber: redisSubscriber },
    async close() {
      await io.close();
      if (redisPublisher) {
        await redisPublisher.quit();
      }
      if (redisSubscriber) {
        await redisSubscriber.quit();
      }
    },
  };
}

export async function createApp() {
  const app = express();
  app.set('trust proxy', 1);

  registerRequestContext(app);
  registerCors(app);
  registerBodyParsers(app);
  registerRateLimiting(app);
  registerLogging(app);

  const publisher = new TenantQueuePublisher();
  const ackStrategy = new WebhookAckStrategy();

  try {
    await prisma.$connect();
  } catch (error) {
    logger.error('Failed to connect to database', error);
  }

  return { app, publisher, ackStrategy };
}

export async function startServer() {
  const { app, publisher, ackStrategy } = await createApp();
  const httpServer = createHttpServer(app);
  const socketServer = await createSocketServer(httpServer);

  registerRoutes(app, { publisher, ackStrategy }, socketServer.redisClients);
  registerErrorHandling(app);

  const port = Number.parseInt(process.env.PORT ?? '', 10) || 3000;

  await new Promise<void>((resolve) => {
    httpServer.listen(port, () => {
      const address = httpServer.address() as AddressInfo | null;
      logger.info('API server listening', {
        port: address?.port ?? port,
      });
      resolve();
    });
  });

  const shutdown = async () => {
    logger.info('Shutting down API server');
    await socketServer.close();
    await publisher.close().catch((error) => logger.error('Failed to close publisher', error));
    await ackStrategy.close().catch((error) => logger.error('Failed to close ack strategy', error));
    await prisma.$disconnect();
    httpServer.close();
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);

  return { app, httpServer, io: socketServer.io, shutdown };
}

if (require.main === module) {
  startServer().catch((error) => {
    logger.error('Failed to start API server', error);
    process.exit(1);
  });
}
