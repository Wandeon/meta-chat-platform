import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '7d'; // 7 days

export interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  type?: string;
  iat?: number;
  exp?: number;
}

/**
 * Get JWT secret from environment variable
 */
function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    throw new Error('ADMIN_JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Generate a JWT token for a tenant user
 */
export function generateToken(
  payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>,
  expiresIn: string = JWT_EXPIRES_IN
): string {
  return jwt.sign(
    { ...payload, type: 'tenant_user' },
    getJwtSecret(),
    { expiresIn: expiresIn as any, issuer: 'meta-chat-platform' }
  );
}

/**
 * Verify and decode a JWT token
 * Returns null if token is invalid or expired
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'meta-chat-platform',
    }) as TokenPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}
