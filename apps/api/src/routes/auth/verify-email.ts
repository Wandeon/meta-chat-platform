import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { tenantProvisioning } from '../../services/TenantProvisioning';
import { emailService } from '../../services/EmailService';

const router = Router();
const prisma = new PrismaClient();

// Validation schema
const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/**
 * POST /api/auth/verify-email
 * Verify email address using token and auto-provision tenant
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

    // Retrieve verification token from database
    const tokenRecord = await prisma.$queryRaw<
      Array<{
        id: number;
        token: string;
        admin_id: string;
        expires_at: Date;
        used: boolean;
        created_at: Date;
      }>
    >`
      SELECT * FROM verification_tokens
      WHERE token = ${token}
      LIMIT 1
    `;

    if (!tokenRecord || tokenRecord.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Invalid verification token',
      });
    }

    const verificationToken = tokenRecord[0];

    // Check if token is already used
    if (verificationToken.used) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has already been used',
      });
    }

    // Check if token is expired
    if (new Date() > new Date(verificationToken.expires_at)) {
      return res.status(400).json({
        success: false,
        error: 'Verification token has expired',
      });
    }

    // Get user details
    const user = await prisma.adminUser.findUnique({
      where: { id: verificationToken.admin_id },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Check if user is already verified
    const alreadyVerified = await prisma.$queryRaw<
      Array<{ email_verified: boolean }>
    >`
      SELECT email_verified FROM admin_users WHERE id = ${user.id}
    `;

    if (alreadyVerified[0]?.email_verified) {
      return res.status(400).json({
        success: false,
        error: 'Email is already verified',
      });
    }

    // Mark token as used
    await prisma.$executeRaw`
      UPDATE verification_tokens
      SET used = true
      WHERE token = ${token}
    `;

    // Set user.email_verified = true
    await prisma.$executeRaw`
      UPDATE admin_users
      SET email_verified = true
      WHERE id = ${user.id}
    `;

    // Get company name for tenant provisioning
    const pendingSetup = await prisma.$queryRaw<
      Array<{ company_name: string }>
    >`
      SELECT company_name FROM pending_tenant_setups
      WHERE admin_id = ${user.id}
      LIMIT 1
    `;

    const companyName = pendingSetup[0]?.company_name || 'My Company';

    // Auto-provision tenant
    let tenantData;
    try {
      tenantData = await tenantProvisioning.setupCompleteTenant(user.id, companyName);
    } catch (provisionError) {
      console.error('Tenant provisioning error:', provisionError);
      // Even if tenant provisioning fails, the email is verified
      // We can retry tenant creation later
      return res.status(500).json({
        success: false,
        error: 'Email verified but tenant provisioning failed. Please contact support.',
        data: {
          emailVerified: true,
        },
      });
    }

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(user.email, user.name || '');
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request if welcome email fails
    }

    // Clean up pending setup
    await prisma.$executeRaw`
      DELETE FROM pending_tenant_setups WHERE admin_id = ${user.id}
    `;

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Your account is now active.',
      data: {
        email: user.email,
        name: user.name,
        emailVerified: true,
        tenantId: tenantData.tenantId,
        apiKey: tenantData.apiKey,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'An error occurred during email verification. Please try again.',
    });
  }
});

export default router;
