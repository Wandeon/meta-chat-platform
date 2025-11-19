import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { emailService } from '../../services/EmailService';

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
    const existingUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists',
      });
    }

    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user (email_verified=false by default from migration)
    const user = await prisma.adminUser.create({
      data: {
        email,
        name,
        role: 'STANDARD',
        // Note: We're not storing password in the schema yet
        // You'll need to add a password field to the AdminUser model
      },
    });

    // Generate verification token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');

    // Token expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Store verification token in database
    await prisma.$executeRaw`
      INSERT INTO verification_tokens (token, admin_id, expires_at, used)
      VALUES (${token}, ${user.id}, ${expiresAt}, false)
    `;

    // Send verification email
    try {
      await emailService.sendVerificationEmail(email, token);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Rollback user creation if email fails
      await prisma.adminUser.delete({ where: { id: user.id } });
      await prisma.$executeRaw`DELETE FROM verification_tokens WHERE token = ${token}`;

      return res.status(500).json({
        success: false,
        error: 'Failed to send verification email. Please try again.',
      });
    }

    // Store password hash temporarily (we'll need to add this to the schema)
    // For now, we'll store it in metadata or create a separate table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS admin_user_passwords (
        admin_id VARCHAR(30) PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO admin_user_passwords (admin_id, password_hash)
      VALUES (${user.id}, ${passwordHash})
      ON CONFLICT (admin_id) DO UPDATE SET password_hash = ${passwordHash}
    `;

    // Also store company name for later tenant creation
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS pending_tenant_setups (
        admin_id VARCHAR(30) PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await prisma.$executeRaw`
      INSERT INTO pending_tenant_setups (admin_id, company_name)
      VALUES (${user.id}, ${companyName})
      ON CONFLICT (admin_id) DO UPDATE SET company_name = ${companyName}
    `;

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please check your email to verify your address.',
      data: {
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during signup. Please try again.',
    });
  }
});

export default router;
