import rateLimit from 'express-rate-limit';
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
    return `ip:${req.ip}`;
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
