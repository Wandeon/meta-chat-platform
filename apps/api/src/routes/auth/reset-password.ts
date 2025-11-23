import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { resetPassword } from '../../services/authService';

const router = Router();

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

/**
 * POST /api/auth/reset-password
 * Reset password using token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const validationResult = resetPasswordSchema.safeParse(req.body);
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

    const { token, newPassword } = validationResult.data;

    await resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);

    const errorMessage = error.message || 'Unknown error';

    if (errorMessage.includes('Invalid or expired')) {
      return res.status(400).json({
        success: false,
        error: 'Password reset link is invalid or has expired',
      });
    }

    if (errorMessage.includes('already been used')) {
      return res.status(400).json({
        success: false,
        error: 'This password reset link has already been used',
      });
    }

    res.status(500).json({
      success: false,
      error: 'An error occurred. Please try again.',
    });
  }
});

export default router;
