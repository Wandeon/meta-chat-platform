import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
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
 * Creates admin user and verification token in a single transaction
 * Email sending happens outside the transaction to avoid blocking
 */
export async function signupTransaction(data: SignupData): Promise<SignupResult> {
  const { email, password, companyName, name } = data;

  // Step 1: Create admin, verification token, and store pending tenant setup in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    // Hash password with bcrypt (12 rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create admin user with email_verified=false
    const admin = await tx.adminUser.create({
      data: {
        email,
        password: hashedPassword,
        name,
        emailVerified: false,
        role: 'STANDARD',
      },
    });

    // Generate verification token (32 bytes = 64 hex characters)
    const token = crypto.randomBytes(32).toString('hex');
    
    // Token expires in 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Create verification token
    await tx.verificationToken.create({
      data: {
        token,
        adminId: admin.id,
        expiresAt,
        used: false,
      },
    });

    // Store company name for later tenant creation (using raw SQL for now)
    // This will be used during email verification to create the tenant
    await tx.$executeRaw`
      CREATE TABLE IF NOT EXISTS pending_tenant_setups (
        admin_id VARCHAR(30) PRIMARY KEY REFERENCES admin_users(id) ON DELETE CASCADE,
        company_name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await tx.$executeRaw`
      INSERT INTO pending_tenant_setups (admin_id, company_name)
      VALUES (${admin.id}, ${companyName})
      ON CONFLICT (admin_id) DO UPDATE SET company_name = ${companyName}
    `;

    return {
      admin: { id: admin.id, email: admin.email, name: admin.name || '' },
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
    // Admin can request a new verification email later
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
