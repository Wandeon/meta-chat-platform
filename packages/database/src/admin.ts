import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import { Prisma, AdminAuditLog, AdminKey, AdminKeyStatus } from '@prisma/client';
import { getPrismaClient } from './client';
import { Logger } from '@meta-chat/shared';

const prisma = getPrismaClient();
const logger = new Logger('AdminKeys');

const ADMIN_KEY_SECRET_BYTES = 32;
const ADMIN_KEY_HASH_BYTES = 64;
export const ADMIN_KEY_PREFIX = 'adm';

function getPepper(): string {
  return process.env.ADMIN_KEY_PEPPER ?? '';
}

function deriveKey(secret: string, salt: Buffer): Buffer {
  const pepper = getPepper();
  return scryptSync(`${secret}${pepper}`, salt, ADMIN_KEY_HASH_BYTES);
}

export function generateAdminKeySecret(): { secret: string; hashedSecret: string } {
  const secret = randomBytes(ADMIN_KEY_SECRET_BYTES).toString('base64url');
  const salt = randomBytes(16);
  const derived = deriveKey(secret, salt);
  return { secret, hashedSecret: `${salt.toString('hex')}:${derived.toString('hex')}` };
}

export function formatAdminKey(id: string, secret: string): string {
  return `${ADMIN_KEY_PREFIX}_${id}.${secret}`;
}

export function parseAdminKey(presentedKey: string): { id: string; secret: string } {
  const [rawId, secret] = presentedKey.split('.');
  if (!rawId || !secret) {
    throw new Error('Invalid admin key format');
  }

  const prefix = `${ADMIN_KEY_PREFIX}_`;
  const id = rawId.startsWith(prefix) ? rawId.slice(prefix.length) : rawId;
  if (!id) {
    throw new Error('Invalid admin key identifier');
  }

  return { id, secret };
}

export function verifyAdminKeySecret(secret: string, hashedSecret: string): boolean {
  try {
    const [saltHex, derivedHex] = hashedSecret.split(':');
    if (!saltHex || !derivedHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(derivedHex, 'hex');
    const actual = deriveKey(secret, salt);

    if (expected.length !== actual.length) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  } catch (error) {
    logger.error('Failed to verify admin key secret', error as Error);
    return false;
  }
}

export interface CreateAdminKeyInput {
  name: string;
  createdBy?: string;
  expiresAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
}

export interface CreateAdminKeyResult {
  record: AdminKey;
  secret: string;
  token: string;
}

export async function createAdminKey(input: CreateAdminKeyInput): Promise<CreateAdminKeyResult> {
  const { secret, hashedSecret } = generateAdminKeySecret();

  const record = await prisma.adminKey.create({
    data: {
      name: input.name,
      hashedSecret,
      createdBy: input.createdBy,
      expiresAt: input.expiresAt ?? undefined,
      metadata: input.metadata ?? undefined,
    },
  });

  return {
    record,
    secret,
    token: formatAdminKey(record.id, secret),
  };
}

export async function revokeAdminKey(
  id: string,
  options: { revokedBy?: string; reason?: string } = {}
): Promise<AdminKey> {
  const now = new Date();

  const record = await prisma.adminKey.update({
    where: { id },
    data: {
      status: AdminKeyStatus.revoked,
      revokedAt: now,
      revokedBy: options.revokedBy,
    },
  });

  return record;
}

export async function rotateAdminKey(
  id: string,
  options: { rotatedBy?: string; metadata?: Prisma.InputJsonValue }
): Promise<CreateAdminKeyResult> {
  const { secret, hashedSecret } = generateAdminKeySecret();
  const now = new Date();

  const record = await prisma.adminKey.update({
    where: { id },
    data: {
      hashedSecret,
      status: AdminKeyStatus.active,
      revokedAt: null,
      revokedBy: null,
      metadata: options.metadata ?? undefined,
      rotatedAt: now,
      rotatedBy: options.rotatedBy ?? undefined,
    },
  });

  return {
    record,
    secret,
    token: formatAdminKey(record.id, secret),
  };
}

export async function markAdminKeyUsed(id: string): Promise<AdminKey> {
  return prisma.adminKey.update({
    where: { id },
    data: {
      lastUsedAt: new Date(),
    },
  });
}

export interface AdminAuditLogInput {
  adminKeyId?: string | null;
  actorId?: string | null;
  actorType: string;
  action: string;
  target?: string | null;
  description?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function recordAdminAuditLog(
  input: AdminAuditLogInput
): Promise<AdminAuditLog> {
  const record = await prisma.adminAuditLog.create({
    data: {
      adminKeyId: input.adminKeyId ?? undefined,
      actorId: input.actorId ?? undefined,
      actorType: input.actorType,
      action: input.action,
      target: input.target ?? undefined,
      description: input.description ?? undefined,
      metadata: input.metadata ?? undefined,
      ipAddress: input.ipAddress ?? undefined,
      userAgent: input.userAgent ?? undefined,
    },
  });

  return record;
}
