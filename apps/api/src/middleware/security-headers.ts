import type { Request, Response, NextFunction } from 'express';

/**
 * Security Headers Middleware
 *
 * Implements Content-Security-Policy and other security headers
 * to protect against XSS, clickjacking, and other attacks.
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Content Security Policy - prevents XSS attacks
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'", // Allow inline styles for React components
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://chat.genai.hr wss://chat.genai.hr",
      "frame-ancestors 'none'", // Prevent clickjacking
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; ')
  );

  // X-Content-Type-Options - prevents MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // X-Frame-Options - prevents clickjacking (backup for CSP)
  res.setHeader('X-Frame-Options', 'DENY');

  // X-XSS-Protection - legacy XSS protection for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer-Policy - controls referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions-Policy - controls browser features
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );

  next();
}
