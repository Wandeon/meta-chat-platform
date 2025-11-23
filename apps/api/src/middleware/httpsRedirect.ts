import { Request, Response, NextFunction } from 'express';

export function hstsHeader(req: Request, res: Response, next: NextFunction): void {
  // Only set HSTS header in production on HTTPS requests
  if (process.env.NODE_ENV === 'production') {
    const isSecure =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      (req as any).connection?.encrypted;

    if (isSecure) {
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );
    }
  }

  next();
}

export function httpsRedirect(req: Request, res: Response, next: NextFunction): void {
  // Allow disabling HTTPS enforcement via env var
  if (process.env.ENFORCE_HTTPS === 'false') {
    return next();
  }

  // Skip in development
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is already HTTPS
  const isSecure =
    req.secure ||
    req.headers['x-forwarded-proto'] === 'https' ||
    (req as any).connection?.encrypted;

  if (!isSecure) {
    console.warn('Insecure HTTP request blocked:', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    res.status(403).json({
      success: false,
      error: 'HTTPS required',
      code: 'HTTPS_REQUIRED',
      message: 'This API requires HTTPS. Please use https:// instead of http://',
    });
    return;
  }

  next();
}
