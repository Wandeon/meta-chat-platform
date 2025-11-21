import cors from 'cors';
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('CorsMiddleware');

/**
 * Parse and validate CORS allowed origins from environment variable
 * @returns Array of allowed origin strings
 */
function getAllowedOrigins(): string[] {
  const origins = process.env.ALLOWED_ORIGINS || process.env.API_CORS_ORIGINS;
  
  // Default to localhost for development if not specified
  // SECURITY: Never use wildcard '*' - always use explicit origin allowlist
  const defaultOrigins = ['http://localhost:3000', 'http://localhost:5173'];
  
  if (!origins) {
    logger.warn('No ALLOWED_ORIGINS configured, using development defaults', { defaultOrigins });
    return defaultOrigins;
  }

  const allowedOrigins = origins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length === 0) {
    logger.warn('ALLOWED_ORIGINS is empty, using development defaults', { defaultOrigins });
    return defaultOrigins;
  }

  logger.info('CORS configured with allowed origins', { allowedOrigins });
  return allowedOrigins;
}

/**
 * Origin validation function for CORS
 * Can be used by both Express cors middleware and Socket.IO
 */
export function validateOrigin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void): void {
  const allowedOrigins = getAllowedOrigins();
  
  // Allow requests with no origin (e.g., mobile apps, Postman, curl, server-to-server)
  if (!origin) {
    return callback(null, true);
  }
  
  // Check if origin is in allowlist
  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    logger.warn('CORS request blocked from untrusted origin', { 
      origin, 
      allowedOrigins 
    });
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
}

/**
 * CORS middleware with origin allowlist validation
 * Only allows cross-origin requests from explicitly trusted origins
 */
export const corsMiddleware = cors({
  origin: validateOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-correlation-id'],
  exposedHeaders: ['x-request-id', 'x-correlation-id'],
  maxAge: 86400, // 24 hours
});
