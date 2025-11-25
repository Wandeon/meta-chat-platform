import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminTokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'admin';
}

export function authenticateAdmin(req: Request, res: Response, next: NextFunction) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    console.error('ADMIN_JWT_SECRET not configured');
    return res.status(500).json({ success: false, error: 'Server configuration error' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, secret) as AdminTokenPayload;
    
    // Validate required fields
    if (payload.type !== 'admin' || !payload.userId || !payload.email) {
      return res.status(403).json({ success: false, error: 'Invalid admin token' });
    }
    
    (req as any).adminUser = {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ success: false, error: 'Token expired' });
    }
    if (err instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
}
