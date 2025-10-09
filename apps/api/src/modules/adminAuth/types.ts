import { AdminKey } from '@meta-chat/database';

export interface AdminAuthContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface AdminTokenPayload {
  sub: string;
  jti: string;
  type: 'admin';
  scope: string[];
  iss?: string;
  aud?: string | string[];
  iat?: number;
  exp?: number;
}

export interface AdminSession {
  token: string;
  expiresAt: Date;
  key: AdminKey;
  payload: AdminTokenPayload;
}

export interface AdminKeyRotationResult {
  token: string;
  secret: string;
  key: AdminKey;
}
