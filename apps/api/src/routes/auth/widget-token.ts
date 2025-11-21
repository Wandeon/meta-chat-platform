import { Router } from 'express';
import jwt from 'jsonwebtoken';
import createHttpError from 'http-errors';
import { authenticateTenant } from '../../middleware/auth';

const router = Router();

/**
 * Exchange tenant API key for a JWT token for WebSocket authentication
 * POST /auth/widget-token
 * 
 * This endpoint allows the widget to exchange its API key for a short-lived JWT
 * that can be used to authenticate WebSocket connections.
 */
router.post('/widget-token', authenticateTenant, async (req, res, next) => {
  try {
    const secret = process.env.WEBCHAT_JWT_SECRET;
    if (!secret) {
      throw createHttpError(500, 'JWT authentication is not configured');
    }

    if (!req.tenant?.id) {
      throw createHttpError(401, 'Tenant authentication required');
    }

    // Generate JWT for WebSocket connection
    // Token expires in 1 hour
    const token = jwt.sign(
      { 
        tenantId: req.tenant.id,
        type: 'widget',
        apiKeyId: req.tenant.apiKeyId
      },
      secret,
      { expiresIn: '1h' }
    );

    const expiresAt = Date.now() + 3600000; // 1 hour in milliseconds

    res.json({
      success: true,
      data: {
        token,
        expiresAt,
        expiresIn: 3600 // seconds
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
