import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import crypto from 'crypto';
import { emailService } from './EmailService';

const prisma = new PrismaClient();

export interface SignupData {
  email: string;
  password: string;
  companyName: string;
  name: string;
}

export interface SignupResult {
  admin: { id: string; email: string; name: string };
  verificationToken: string;
}

export interface VerifyEmailResult {
  user: { id: string; email: string; name: string; tenantId: string };
}

interface LoginResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    tenantId: string;
  };
  token: string;
}

/**
 * Transactional signup with automatic rollback on failure
 * Creates TenantUser and verification token in a single transaction
 * Email sending happens outside the transaction to avoid blocking
 */
export async function signupTransaction(data: SignupData): Promise<SignupResult> {
  const { email, password, companyName, name } = data;

  // Step 1: Create TenantUser, Tenant, and verification token in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // Hash password using the hashPassword utility
    const hashedPassword = await hashPassword(password);

    // Create TenantUser with Tenant in a single operation
    const tenantUser = await tx.tenantUser.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
        role: 'OWNER',
        tenant: {
          create: {
            name: companyName,
            enabled: true,
            subscriptionStatus: 'free',
            currentPlanId: 'free',
            settings: {},
            widgetConfig: {},
          },
        },
      },
      include: {
        tenant: true,
      },
    });

    // Generate verification token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create verification token linked to TenantUser
    await tx.verificationToken.create({
      data: {
        token,
        tenantUserId: tenantUser.id,
        expiresAt,
        used: false,
      },
    });

    return {
      admin: { id: tenantUser.id, email: tenantUser.email, name: tenantUser.name || '' },
      verificationToken: token,
    };
  });

  // Step 2: Send verification email (outside transaction)
  // If this fails, we still have the token in DB and can resend later
  try {
    await emailService.sendVerificationEmail(result.admin.email, result.verificationToken);
    console.log(`Verification email sent to ${result.admin.email}`);
  } catch (emailError) {
    console.error('Failed to send verification email:', emailError);
    // Don't throw - user account created successfully
    // User can request a new verification email later
    // The account exists but is not verified yet
  }

  return result;
}


/**
 * Verify email and mark TenantUser as verified
 * Tenant was already created during signup
 */
export async function verifyEmailTransaction(token: string): Promise<VerifyEmailResult | null> {
  return await prisma.$transaction(async (tx) => {
    // Find and validate token with tenantUser relation
    const verification = await tx.verificationToken.findUnique({
      where: { token },
      include: { 
        tenantUser: {
          include: { tenant: true }
        }
      },
    });

    if (!verification || !verification.tenantUser) {
      return null;
    }

    // Check if token is already used
    if (verification.used) {
      throw new Error('Verification token has already been used');
    }

    // Check if token is expired
    if (verification.expiresAt < new Date()) {
      throw new Error('Verification token has expired');
    }

    // Check if user is already verified
    if (verification.tenantUser.emailVerified) {
      throw new Error('Email is already verified');
    }

    // Mark token as used
    await tx.verificationToken.update({
      where: { id: verification.id },
      data: { used: true },
    });

    // Mark TenantUser email as verified
    const tenantUser = await tx.tenantUser.update({
      where: { id: verification.tenantUserId! },
      data: { emailVerified: true },
    });

    // Send welcome email (outside transaction error handling)
    try {
      await emailService.sendWelcomeEmail(tenantUser.email, tenantUser.name || '');
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      // Don't fail the transaction if welcome email fails
    }

    return {
      user: {
        id: tenantUser.id,
        email: tenantUser.email,
        name: tenantUser.name || '',
        tenantId: tenantUser.tenantId,
      },
    };
  });
}


/**
 * Authenticate tenant user with email and password
 */
export async function loginTenantUser(
  email: string,
  password: string
): Promise<LoginResult | null> {
  // Find user by email
  const user = await prisma.tenantUser.findUnique({
    where: { email },
  });

  if (!user) {
    return null; // Don't reveal whether email exists
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.password);
  if (!isValidPassword) {
    return null;
  }

  // Check if email is verified
  if (!user.emailVerified) {
    throw new Error('EMAIL_NOT_VERIFIED');
  }

  // Generate JWT token
  const token = generateToken({
    userId: user.id,
    tenantId: user.tenantId,
    email: user.email,
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    },
    token,
  };
}

/**
 * Resend verification email for unverified accounts
 */
export async function resendVerificationEmail(email: string): Promise<boolean> {
  const admin = await prisma.adminUser.findUnique({
    where: { email },
    include: { verificationTokens: { where: { used: false }, orderBy: { createdAt: 'desc' } } },
  });

  if (!admin) {
    return false;
  }

  if (admin.emailVerified) {
    throw new Error('Email is already verified');
  }

  // Check if there's an unexpired token
  const existingToken = admin.verificationTokens.find(
    (t) => t.expiresAt > new Date()
  );

  if (existingToken) {
    // Resend email with existing token
    await emailService.sendVerificationEmail(email, existingToken.token);
    return true;
  }

  // Create new token in transaction
  const newToken = await prisma.$transaction(async (tx) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await tx.verificationToken.create({
      data: {
        token,
        adminId: admin.id,
        expiresAt,
        used: false,
      },
    });

    return token;
  });

  await emailService.sendVerificationEmail(email, newToken);
  return true;
}

/**
 * Generate password reset token and send email
 */
export async function requestPasswordReset(email: string): Promise<boolean> {
  const user = await prisma.tenantUser.findUnique({
    where: { email },
  });

  // Always return true to prevent email enumeration
  if (!user) {
    return true;
  }

  // Generate reset token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: {
      tenantUserId: user.id,
      token,
      expiresAt,
      used: false,
    },
  });

  // Send password reset email
  try {
    await emailService.sendPasswordResetEmail(user.email, token);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    // Still return true to prevent email enumeration
  }

  return true;
}

/**
 * Reset password using token
 */
export async function resetPassword(
  token: string,
  newPassword: string
): Promise<boolean> {
  return await prisma.$transaction(async (tx) => {
    // Find and validate token
    const resetToken = await tx.passwordResetToken.findUnique({
      where: { token },
      include: { tenantUser: true },
    });

    if (!resetToken) {
      throw new Error('Invalid or expired reset token');
    }

    if (resetToken.used) {
      throw new Error('Reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new Error('Reset token has expired');
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await tx.tenantUser.update({
      where: { id: resetToken.tenantUserId },
      data: { password: hashedPassword },
    });

    // Mark token as used
    await tx.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    return true;
  });
}
