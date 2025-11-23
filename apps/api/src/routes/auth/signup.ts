import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { signupTransaction } from '../../services/authService';

const router = Router();
const prisma = new PrismaClient();

// Validation schema
const signupSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  name: z.string().min(1, 'Name is required').max(255),
  companyName: z.string().min(1, 'Company name is required').max(255),
});

/**
 * POST /api/auth/signup
 * Self-service signup endpoint with email verification
 * Uses transactional approach to prevent orphaned records
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validationResult = signupSchema.safeParse(req.body);
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

    const { email, password, name, companyName } = validationResult.data;

    // Check if user already exists
    const existingUser = await prisma.tenantUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
        code: 'EMAIL_EXISTS',
      });
    }

    // Execute transactional signup
    // This creates the admin user and verification token in a single transaction
    // If any step fails, all changes are automatically rolled back
    const result = await signupTransaction({
      email,
      password,
      name,
      companyName,
    });

    res.status(200).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your address.',
      data: {
        email: result.admin.email,
        name: result.admin.name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Don't expose internal errors to the client
    res.status(500).json({
      success: false,
      error: 'An error occurred during signup. Please try again.',
      code: 'SIGNUP_FAILED',
    });
  }
});

export default router;
