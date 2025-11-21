import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import Redis from 'ioredis';
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('RateLimiter');

/**
 * Creates a Redis-based rate limiter for authentication endpoints
 * Limits to 5 requests per minute per IP address
 */
export function createAuthRateLimiter() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    logger.warn('Redis URL not configured, using in-memory rate limiting');
    // Fallback to in-memory rate limiting if Redis is not available
    return rateLimit({
      windowMs: 60 * 1000, // 1 minute
      max: 5, // 5 requests per minute
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many authentication attempts. Please try again later.',
        },
      },
      handler: (req, res) => {
        logger.warn('Rate limit exceeded', {
          ip: req.ip || req.socket.remoteAddress,
          path: req.path,
          method: req.method,
        });
        res.status(429).json({
          success: false,
          error: {
            code: 'rate_limit_exceeded',
            message: 'Too many authentication attempts. Please try again later.',
          },
        });
      },
    });
  }

  const redisClient = new Redis(redisUrl, {
    enableOfflineQueue: false,
    maxRetriesPerRequest: 3,
  });

  redisClient.on('error', (error) => {
    logger.error('Redis rate limiter error', error);
  });

  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5, // 5 requests per minute
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    store: new RedisStore({
      // @ts-expect-error - RedisStore types are not fully compatible with ioredis
      client: redisClient,
      prefix: 'rl:auth:', // Rate limit key prefix in Redis
    }),
    keyGenerator: (req) => {
      // Use IP address as the key for rate limiting
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/metrics';
    },
    handler: (req, res) => {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      logger.warn('Rate limit exceeded', {
        ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('user-agent'),
      });

      res.status(429).json({
        success: false,
        error: {
          code: 'rate_limit_exceeded',
          message: 'Too many authentication attempts. Please try again later.',
        },
      });
    },
  });
}
