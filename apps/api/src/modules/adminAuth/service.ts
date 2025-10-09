import { randomBytes } from 'crypto';
import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import {
  ADMIN_KEY_PREFIX,
  AdminKey,
  AdminKeyStatus,
  createAdminKey,
  getPrismaClient,
  markAdminKeyUsed,
  parseAdminKey,
  recordAdminAuditLog,
  revokeAdminKey as revokeAdminKeyRecord,
  rotateAdminKey as rotateAdminKeyRecord,
  verifyAdminKeySecret,
} from '@meta-chat/database';
import { createLogger } from '@meta-chat/shared';
import { AdminAuthContext, AdminKeyRotationResult, AdminSession, AdminTokenPayload } from './types';
import type { Prisma } from '@meta-chat/database';

interface AdminAuthServiceConfig {
  jwtSecret: string;
  jwtTtlSeconds: number;
  jwtIssuer?: string;
  jwtAudience?: string | string[];
  defaultScope: string[];
}

interface CreateKeyOptions {
  expiresAt?: Date | null;
  metadata?: Prisma.InputJsonValue;
  actorId?: string;
  actorType?: string;
  context?: AdminAuthContext;
}

interface RotateKeyOptions {
  actorId?: string;
  actorType?: string;
  metadata?: Prisma.InputJsonValue;
  context?: AdminAuthContext;
}

interface RevokeKeyOptions {
  actorId?: string;
  actorType?: string;
  reason?: string;
  context?: AdminAuthContext;
}

interface AuthenticateOptions {
  scope?: string[];
  context?: AdminAuthContext;
}

const DEFAULT_SCOPE = ['admin:read'];

export class AdminAuthService {
  private readonly prisma = getPrismaClient();
  private readonly logger = createLogger('AdminAuthService');
  private readonly config: AdminAuthServiceConfig;

  constructor(config: Partial<AdminAuthServiceConfig> = {}) {
    const ttlFromEnv = Number.parseInt(process.env.ADMIN_JWT_TTL_SECONDS ?? '', 10);
    const defaultScopeFromEnv = process.env.ADMIN_JWT_DEFAULT_SCOPE
      ? process.env.ADMIN_JWT_DEFAULT_SCOPE.split(',').map(scope => scope.trim()).filter(Boolean)
      : undefined;

    this.config = {
      jwtSecret: config.jwtSecret ?? process.env.ADMIN_JWT_SECRET ?? '',
      jwtTtlSeconds: config.jwtTtlSeconds ?? (Number.isFinite(ttlFromEnv) ? ttlFromEnv : 900),
      jwtIssuer: config.jwtIssuer ?? process.env.ADMIN_JWT_ISSUER ?? 'meta-chat-api',
      jwtAudience: config.jwtAudience ?? process.env.ADMIN_JWT_AUDIENCE ?? 'admin',
      defaultScope: config.defaultScope ?? defaultScopeFromEnv ?? DEFAULT_SCOPE,
    };

    if (!this.config.jwtSecret) {
      throw new Error('ADMIN_JWT_SECRET must be configured to use the AdminAuthService.');
    }
  }

  async createKey(name: string, options: CreateKeyOptions = {}): Promise<AdminKeyRotationResult> {
    const result = await createAdminKey({
      name,
      createdBy: options.actorId,
      expiresAt: options.expiresAt ?? null,
      metadata: options.metadata,
    });

    await recordAdminAuditLog({
      adminKeyId: result.record.id,
      actorId: options.actorId ?? result.record.id,
      actorType: options.actorType ?? 'admin_service',
      action: 'admin.key.create',
      target: name,
      description: 'Created admin key',
      metadata: {
        expiresAt: result.record.expiresAt?.toISOString() ?? null,
        prefix: ADMIN_KEY_PREFIX,
      },
      ipAddress: options.context?.ipAddress,
      userAgent: options.context?.userAgent,
    });

    return {
      token: result.token,
      secret: result.secret,
      key: result.record,
    };
  }

  async authenticateWithKey(
    presentedKey: string,
    options: AuthenticateOptions = {}
  ): Promise<AdminSession> {
    const context = options.context ?? {};
    let keyId: string | undefined;
    let secret: string | undefined;

    try {
      const parsed = parseAdminKey(presentedKey);
      keyId = parsed.id;
      secret = parsed.secret;
    } catch (error) {
      this.logger.warn('Rejected malformed admin key');
      await recordAdminAuditLog({
        actorId: keyId,
        actorType: 'admin_key',
        action: 'admin.authenticate.failed',
        description: 'Malformed admin key provided',
        metadata: {
          reason: 'malformed',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new Error('Invalid admin key');
    }

    const adminKey = await this.prisma.adminKey.findUnique({ where: { id: keyId } });

    if (!adminKey) {
      await recordAdminAuditLog({
        actorId: keyId,
        actorType: 'admin_key',
        action: 'admin.authenticate.failed',
        description: 'Admin key not found',
        metadata: {
          reason: 'missing',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new Error('Invalid admin key');
    }

    if (adminKey.status !== AdminKeyStatus.active) {
      await recordAdminAuditLog({
        adminKeyId: adminKey.id,
        actorId: adminKey.id,
        actorType: 'admin_key',
        action: 'admin.authenticate.failed',
        description: `Admin key is ${adminKey.status}`,
        metadata: {
          reason: 'inactive',
          status: adminKey.status,
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new Error('Admin key is not active');
    }

    if (adminKey.expiresAt && adminKey.expiresAt.getTime() <= Date.now()) {
      await recordAdminAuditLog({
        adminKeyId: adminKey.id,
        actorId: adminKey.id,
        actorType: 'admin_key',
        action: 'admin.authenticate.failed',
        description: 'Admin key has expired',
        metadata: {
          reason: 'expired',
          expiresAt: adminKey.expiresAt.toISOString(),
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new Error('Admin key has expired');
    }

    if (!secret || !verifyAdminKeySecret(secret, adminKey.hashedSecret)) {
      await recordAdminAuditLog({
        adminKeyId: adminKey.id,
        actorId: adminKey.id,
        actorType: 'admin_key',
        action: 'admin.authenticate.failed',
        description: 'Admin key secret mismatch',
        metadata: {
          reason: 'invalid_secret',
        },
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });
      throw new Error('Invalid admin key');
    }

    const updatedKey = await markAdminKeyUsed(adminKey.id);
    const scope = options.scope ?? this.config.defaultScope;
    const session = this.signSession(adminKey.id, scope);

    await recordAdminAuditLog({
      adminKeyId: adminKey.id,
      actorId: adminKey.id,
      actorType: 'admin_key',
      action: 'admin.authenticate.success',
      description: 'Issued short-lived admin session token',
      metadata: {
        scope,
        tokenExpiresAt: session.expiresAt.toISOString(),
        jti: session.payload.jti,
      },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      key: updatedKey,
      payload: session.payload,
    };
  }

  async verifyToken(token: string): Promise<AdminSession> {
    const verifyOptions: VerifyOptions = {
      algorithms: ['HS256'],
      issuer: this.config.jwtIssuer,
      audience: this.getVerifyAudience(),
    };

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, this.config.jwtSecret, verifyOptions) as JwtPayload;
    } catch (error) {
      this.logger.warn('Failed to verify admin token', error as Error);
      throw new Error('Invalid admin token');
    }

    const payload = this.normalizePayload(decoded);

    if (payload.type !== 'admin') {
      throw new Error('Token is not an admin token');
    }

    const adminKey = await this.prisma.adminKey.findUnique({ where: { id: payload.sub } });

    if (!adminKey) {
      throw new Error('Admin key for token not found');
    }

    if (adminKey.status !== AdminKeyStatus.active) {
      throw new Error('Admin key is not active');
    }

    if (adminKey.expiresAt && adminKey.expiresAt.getTime() <= Date.now()) {
      throw new Error('Admin key has expired');
    }

    const expiresAt = new Date((payload.exp ?? Math.floor(Date.now() / 1000)) * 1000);

    return {
      token,
      expiresAt,
      key: adminKey,
      payload,
    };
  }

  async rotateKey(id: string, options: RotateKeyOptions = {}): Promise<AdminKeyRotationResult> {
    const existing = await this.prisma.adminKey.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Admin key not found');
    }

    const result = await rotateAdminKeyRecord(id, {
      rotatedBy: options.actorId,
      metadata: options.metadata,
    });

    await recordAdminAuditLog({
      adminKeyId: id,
      actorId: options.actorId ?? id,
      actorType: options.actorType ?? 'admin_service',
      action: 'admin.key.rotate',
      target: existing.name,
      description: 'Rotated admin key secret',
      metadata: {
        rotatedAt: result.record.rotatedAt?.toISOString() ?? new Date().toISOString(),
      },
      ipAddress: options.context?.ipAddress,
      userAgent: options.context?.userAgent,
    });

    return {
      token: result.token,
      secret: result.secret,
      key: result.record,
    };
  }

  async revokeKey(id: string, options: RevokeKeyOptions = {}): Promise<AdminKey> {
    const existing = await this.prisma.adminKey.findUnique({ where: { id } });
    if (!existing) {
      throw new Error('Admin key not found');
    }

    if (existing.status === AdminKeyStatus.revoked) {
      return existing;
    }

    const record = await revokeAdminKeyRecord(id, {
      revokedBy: options.actorId,
      reason: options.reason,
    });

    await recordAdminAuditLog({
      adminKeyId: id,
      actorId: options.actorId ?? id,
      actorType: options.actorType ?? 'admin_service',
      action: 'admin.key.revoke',
      target: existing.name,
      description: options.reason ?? 'Revoked admin key',
      metadata: {
        reason: options.reason ?? null,
      },
      ipAddress: options.context?.ipAddress,
      userAgent: options.context?.userAgent,
    });

    return record;
  }

  async logAction(
    action: string,
    details: {
      adminKeyId?: string;
      actorId?: string;
      actorType?: string;
      target?: string;
      description?: string;
      metadata?: Prisma.InputJsonValue;
    },
    context: AdminAuthContext = {}
  ): Promise<void> {
    await recordAdminAuditLog({
      adminKeyId: details.adminKeyId,
      actorId: details.actorId,
      actorType: details.actorType ?? 'admin_service',
      action,
      target: details.target,
      description: details.description,
      metadata: details.metadata,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  private signSession(keyId: string, scope: string[]): {
    token: string;
    payload: AdminTokenPayload;
    expiresAt: Date;
  } {
    const jti = randomBytes(12).toString('hex');
    const issuedAtSeconds = Math.floor(Date.now() / 1000);
    const expiresAt = new Date((issuedAtSeconds + this.config.jwtTtlSeconds) * 1000);

    const signOptions: SignOptions = {
      algorithm: 'HS256',
      expiresIn: this.config.jwtTtlSeconds,
      issuer: this.config.jwtIssuer,
      audience: this.config.jwtAudience,
      jwtid: jti,
      subject: keyId,
    };

    const token = jwt.sign({ type: 'admin', scope }, this.config.jwtSecret, signOptions);

    const payload: AdminTokenPayload = {
      sub: keyId,
      jti,
      type: 'admin',
      scope,
      iss: this.config.jwtIssuer,
      aud: this.config.jwtAudience,
      iat: issuedAtSeconds,
      exp: Math.floor(expiresAt.getTime() / 1000),
    };

    return {
      token,
      payload,
      expiresAt,
    };
  }

  private normalizePayload(payload: JwtPayload): AdminTokenPayload {
    const scope = Array.isArray(payload.scope)
      ? (payload.scope as string[])
      : typeof payload.scope === 'string'
        ? payload.scope.split(' ').filter(Boolean)
        : this.config.defaultScope;

    const sub = typeof payload.sub === 'string' ? payload.sub : '';
    const jti = typeof payload.jti === 'string' ? payload.jti : '';

    if (!sub || !jti) {
      throw new Error('Invalid admin token payload');
    }

    return {
      sub,
      jti,
      type: (payload.type as AdminTokenPayload['type']) ?? 'admin',
      scope,
      iss: typeof payload.iss === 'string' ? payload.iss : this.config.jwtIssuer,
      aud: payload.aud ?? this.config.jwtAudience,
      iat: payload.iat,
      exp: payload.exp,
    };
  }

  private getVerifyAudience(): VerifyOptions['audience'] {
    const { jwtAudience } = this.config;
    if (!jwtAudience) {
      return undefined;
    }

    if (Array.isArray(jwtAudience)) {
      if (jwtAudience.length === 0) {
        return undefined;
      }

      const [first, ...rest] = jwtAudience;
      return [first, ...rest] as [string | RegExp, ...(string | RegExp)[]];
    }

    return jwtAudience;
  }
}
