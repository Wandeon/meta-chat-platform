import { Request, Response, NextFunction } from 'express';
import { validateAndSanitizeSearchQuery } from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';

const logger = createLogger('SearchValidationMiddleware');

/**
 * Middleware to validate search queries and prevent SQL injection attacks.
 * 
 * Applies to endpoints that accept search/query parameters.
 * Validates and sanitizes the input before passing to the handler.
 */
export function validateSearchInput(req: Request, res: Response, next: NextFunction): void {
  // Check common parameter names for search queries
  const searchParam = req.query.q || req.query.query || req.query.search || req.body.query || req.body.message;

  // If no search parameter found, skip validation
  if (!searchParam) {
    return next();
  }

  const searchQuery = String(searchParam);

  // Validate and sanitize the search query
  const validation = validateAndSanitizeSearchQuery(searchQuery);

  if (!validation.isValid) {
    logger.warn('Invalid search query rejected', {
      query: searchQuery,
      error: validation.error,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    res.status(400).json({
      error: 'Invalid search query',
      message: validation.error,
    });
    return;
  }

  // Replace the original query with the sanitized version
  if (req.query.q) req.query.q = validation.sanitized;
  if (req.query.query) req.query.query = validation.sanitized;
  if (req.query.search) req.query.search = validation.sanitized;
  if (req.body.query) req.body.query = validation.sanitized;
  if (req.body.message && typeof req.body.message === 'string') {
    // For message body, we sanitize but don't replace entirely
    // to preserve user intent in chat messages
    const messageValidation = validateAndSanitizeSearchQuery(req.body.message);
    if (!messageValidation.isValid) {
      logger.warn('Invalid message content rejected', {
        message: req.body.message,
        error: messageValidation.error,
        ip: req.ip,
      });
      res.status(400).json({
        error: 'Invalid message content',
        message: messageValidation.error,
      });
      return;
    }
  }

  logger.debug('Search query validated', {
    original: searchQuery,
    sanitized: validation.sanitized,
  });

  next();
}

/**
 * Rate limiting specifically for search endpoints to prevent abuse.
 */
export const searchRateLimiter = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 30, // 30 requests per minute per IP
};
