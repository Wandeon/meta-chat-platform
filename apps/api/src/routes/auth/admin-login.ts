import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getPrismaClient } from '@meta-chat/database';
import { verifyPassword } from '../../utils/password';
import jwt from 'jsonwebtoken';

const router = Router();
const prisma = getPrismaClient();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/admin-login
 * Admin login with email and password
 */
router.post('/admin-login', async (req: Request, res: Response) => {
  try {
    // Validate request
    const validationResult = loginSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validationResult.error.issues.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    const { email, password } = validationResult.data;

    // Find admin user by email
    const admin = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!admin || !admin.password) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isValid = await verifyPassword(password, admin.password);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    // Get JWT secret
    const jwtSecret = process.env.ADMIN_JWT_SECRET;
    if (!jwtSecret) {
      console.error('ADMIN_JWT_SECRET environment variable is not set');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
      });
    }

    // Generate JWT token with admin type
    const token = jwt.sign(
      {
        userId: admin.id,
        email: admin.email,
        role: admin.role,
        type: 'admin',
      },
      jwtSecret,
      {
        expiresIn: '7d',
        issuer: 'meta-chat-platform',
      }
    );

    // Return token and user info
    res.status(200).json({
      success: true,
      token,
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    });
  } catch (error: any) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during login. Please try again.',
    });
  }
});

export default router;
