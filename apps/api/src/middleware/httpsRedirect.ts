import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to enforce HTTPS in production
 * Redirects HTTP requests to HTTPS
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction): void {
  // Check if HTTPS enforcement is enabled
  const enforceHttps = process.env.ENFORCE_HTTPS !== 'false';
  
  if (!enforceHttps || process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is secure
  const isSecure = 
    req.secure || // Express secure flag
    req.headers['x-forwarded-proto'] === 'https' || // Behind proxy (Caddy)
    req.connection.encrypted; // Direct TLS connection

  if (!isSecure) {
    // Log insecure access attempt
    console.warn('Insecure HTTP request blocked:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    // Return error for API requests (don't redirect)
    return res.status(403).json({
      success: false,
      error: 'HTTPS required',
      code: 'HTTPS_REQUIRED',
      message: 'This API requires HTTPS. Please use https:// instead of http://',
    });
  }

  next();
}

/**
 * Middleware to set Strict-Transport-Security header
 * Forces browsers to use HTTPS for all future requests
 */
export function hstsHeader(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV === 'production') {
    // HSTS: Force HTTPS for 1 year, include subdomains
    const maxAge = process.env.HSTS_MAX_AGE || '31536000';
    res.setHeader(
      'Strict-Transport-Security',
      `max-age=${maxAge}; includeSubDomains; preload`
    );
  }
  next();
}
