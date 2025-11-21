import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { Request, Response } from 'express';

/**
 * Rate limiting middleware for widget and chat endpoints
 * Prevents spam and DoS attacks by limiting request frequency
 */

// Strict rate limiter for public widget config endpoint
// Prevents enumeration attacks and excessive polling
export const widgetConfigLimiter = rateLimit({
  windowMs: parseInt(process.env.WIDGET_CONFIG_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.WIDGET_CONFIG_RATE_LIMIT_MAX_REQUESTS || '60', 10), // 60 requests per minute per IP
  message: {
    success: false,
    error: 'Too many configuration requests. Please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const getApiWindowMs = () => parseInt(process.env.API_RATE_LIMIT_WINDOW_MS || '60000', 10);
const getApiMax = () => parseInt(process.env.API_RATE_LIMIT_MAX || '120', 10);

const getSystemWindowMs = () => parseInt(process.env.SYSTEM_RATE_LIMIT_WINDOW_MS || '60000', 10);
const getSystemMax = () => parseInt(process.env.SYSTEM_RATE_LIMIT_MAX || '60', 10);

const extractIpAddress = (req: Request): string => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (Array.isArray(forwardedFor)) {
    return forwardedFor[0];
  }

  if (typeof forwardedFor === 'string') {
    const forwardedIp = forwardedFor.split(',')[0].trim();
    if (forwardedIp) {
      return forwardedIp;
    }
  }

  return req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? 'unknown';
};

const rateLimitKey = (req: Request): string => {
  const adminKey = req.header('x-admin-key');
  if (adminKey) {
    return `admin-key:${adminKey}`;
  }

  const apiKey = req.header('x-api-key');
  if (apiKey) {
    return `api-key:${apiKey}`;
  }

  if (req.adminUser?.id) {
    return `admin:${req.adminUser.id}`;
  }

  if (req.tenant?.id) {
    return `tenant:${req.tenant.id}`;
  }

  const ip = ipKeyGenerator(extractIpAddress(req));
  const userAgent = req.get('user-agent') ?? 'unknown';
  return `ip:${ip}|ua:${userAgent}`;
};

export const buildApiLimiter = () =>
  rateLimit({
    windowMs: getApiWindowMs(),
    max: getApiMax(),
    keyGenerator: rateLimitKey,
    message: {
      success: false,
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const buildSystemStatusLimiter = () =>
  rateLimit({
    windowMs: getSystemWindowMs(),
    max: getSystemMax(),
    keyGenerator: rateLimitKey,
    message: {
      success: false,
      error: 'System status checks are being rate limited.',
      code: 'RATE_LIMIT_EXCEEDED',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

export const apiLimiter = buildApiLimiter();
export const systemStatusLimiter = buildSystemStatusLimiter();

// Combined limiter for chat endpoints - applies both IP and tenant-based limits
// This provides defense in depth
export const chatLimiter = rateLimit({
  windowMs: parseInt(process.env.CHAT_RATE_LIMIT_WINDOW_MS || '60000', 10), // 1 minute
  max: parseInt(process.env.CHAT_RATE_LIMIT_MAX_REQUESTS || '50', 10), // 50 requests per minute
  
  keyGenerator: (req: Request) => {
    // For authenticated requests, use tenant ID
    if (req.tenant?.id) {
      return `tenant:${req.tenant.id}`;
    }
    
    // For admin requests, use admin ID
    if (req.adminUser?.id) {
      return `admin:${req.adminUser.id}`;
    }
    
    // Try to get tenant ID from request body
    const body = req.body as { tenantId?: string };
    if (body?.tenantId) {
      return `tenant:${body.tenantId}`;
    }

    // Fall back to IP address
    return `ip:${ipKeyGenerator(extractIpAddress(req))}`;
  },
  
  message: {
    success: false,
    error: 'Too many chat requests. Please wait before sending more messages.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  
  standardHeaders: true,
  legacyHeaders: false,
  
  // Custom handler to log rate limit violations
  handler: (req: Request, res: Response) => {
    console.warn('[RATE_LIMIT] Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      tenant: req.tenant?.id || 'unknown',
      timestamp: new Date().toISOString(),
    });
    
    res.status(429).json({
      success: false,
      error: 'Too many chat requests. Please wait before sending more messages.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: res.getHeader('Retry-After'),
    });
  },
});
