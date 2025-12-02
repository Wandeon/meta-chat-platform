import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requestPasswordReset } from '../../services/authService';

const router = Router();

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address').transform((value) => value.toLowerCase()),
});

/**
 * POST /api/auth/forgot-password
 * Request password reset email
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  const validationResult = forgotPasswordSchema.safeParse(req.body);
  const responseBody = {
    success: true,
    message: 'If an account exists with this email, you will receive a password reset link.',
  };

  if (!validationResult.success) {
    console.warn('Invalid forgot password request payload', validationResult.error.flatten());
    return res.status(200).json(responseBody);
  }

  try {
    const { email } = validationResult.data;
    await requestPasswordReset(email);
  } catch (error) {
    console.error('Forgot password error:', error);
  }

  // Always return success to prevent email enumeration
  res.status(200).json(responseBody);
});

export default router;
