import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../utils/password';
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
  admin: { id: string; email: string; name: string };
  tenant: { id: string; name: string };
  apiKey: string;
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
 * Verify email and activate account in a transaction
 * Creates tenant and API key as part of the verification process
 */
export async function verifyEmailTransaction(token: string): Promise<VerifyEmailResult | null> {
  return await prisma.$transaction(async (tx) => {
    // Find and validate token
    const verification = await tx.verificationToken.findUnique({
      where: { token },
      include: { admin: true },
    });

    if (!verification) {
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
    if (verification.admin.emailVerified) {
      throw new Error('Email is already verified');
    }

    // Mark token as used
    await tx.verificationToken.update({
      where: { id: verification.id },
      data: { used: true },
    });

    // Verify admin email
    const admin = await tx.adminUser.update({
      where: { id: verification.adminId },
      data: { emailVerified: true },
    });

    // Get company name for tenant provisioning
    const pendingSetup = await tx.$queryRaw<
      Array<{ company_name: string }>
    >`
      SELECT company_name FROM pending_tenant_setups
      WHERE admin_id = ${admin.id}
      LIMIT 1
    `;

    const companyName = pendingSetup[0]?.company_name || 'My Company';

    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        enabled: true,
        subscriptionStatus: 'free',
        currentPlanId: 'free',
        settings: {},
        widgetConfig: {},
      },
    });

    // Generate API key for the tenant
    const apiKeyPrefix = 'mcp';
    const apiKeySecret = crypto.randomBytes(32).toString('hex');
    const apiKeyString = `${apiKeyPrefix}_${apiKeySecret}`;
    
    // Hash the API key
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(apiKeySecret + salt).digest('hex');
    const lastFour = apiKeySecret.slice(-4);

    await tx.tenantApiKey.create({
      data: {
        tenantId: tenant.id,
        label: 'Default API Key',
        prefix: apiKeyPrefix,
        hash,
        salt,
        lastFour,
        active: true,
      },
    });

    // Clean up pending setup
    await tx.$executeRaw`
      DELETE FROM pending_tenant_setups WHERE admin_id = ${admin.id}
    `;

    return {
      admin: { id: admin.id, email: admin.email, name: admin.name || '' },
      tenant: { id: tenant.id, name: tenant.name },
      apiKey: apiKeyString,
    };
  });
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
