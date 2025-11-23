import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { loginTenantUser } from '../../services/authService';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
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

    // Attempt login
    const result = await loginTenantUser(email, password);

    if (!result) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }

    res.status(200).json({
      success: true,
      token: result.token,
      user: result.user,
    });
  } catch (error: any) {
    console.error('Login error:', error);

    if (error.message === 'EMAIL_NOT_VERIFIED') {
      return res.status(403).json({
        success: false,
        error: 'Please verify your email address before logging in',
      });
    }

    res.status(500).json({
      success: false,
      error: 'An error occurred during login. Please try again.',
    });
  }
});

export default router;
