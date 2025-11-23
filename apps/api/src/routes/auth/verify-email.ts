import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { verifyEmailTransaction } from '../../services/authService';

const router = Router();

// Validation schema
const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/auth/verify-email
 * Verify email address using token and auto-provision tenant
 * Uses transactional approach to ensure all-or-nothing semantics
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = verifyEmailSchema.safeParse(req.body);
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

    const { token } = validationResult.data;

    // Execute transactional email verification
    // This verifies the token, marks email as verified, and sends welcome email
    // All in a single transaction - if any step fails, everything rolls back
    const result = await verifyEmailTransaction(token);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Invalid verification token',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is now active.',
      data: {
        email: result.user.email,
        name: result.user.name,
        emailVerified: true,
        tenantId: result.user.tenantId,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);

    // Handle specific error cases
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (errorMessage.includes('already been used')) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has already been used',
      });
    }

    if (errorMessage.includes('expired')) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired',
      });
    }

    if (errorMessage.includes('already verified')) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
      });
    }

    res.status(500).json({
      success: false,
      error: 'An error occurred during email verification. Please try again.',
    });
  }
});

export default router;
