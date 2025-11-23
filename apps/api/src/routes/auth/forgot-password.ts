import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requestPasswordReset } from '../../services/authService';

const router = Router();

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const validationResult = forgotPasswordSchema.safeParse(req.body);
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

    const { email } = validationResult.data;

    await requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
});

export default router;
