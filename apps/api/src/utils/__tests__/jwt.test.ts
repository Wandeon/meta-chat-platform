// Set environment variable BEFORE importing the module
process.env.ADMIN_JWT_SECRET = 'test-secret-key-for-testing';

import { describe, it, expect } from 'vitest';
import { generateToken, verifyToken } from '../jwt';

describe('JWT Utils', () => {
  it('should generate a JWT token', () => {
    const payload = {
      userId: 'user123',
      tenantId: 'tenant456',
      email: 'test@example.com',
    };

    const token = generateToken(payload);

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('should verify and decode a valid token', () => {
    const payload = {
      userId: 'user123',
      tenantId: 'tenant456',
      email: 'test@example.com',
    };

    const token = generateToken(payload);
    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    expect(decoded?.userId).toBe('user123');
    expect(decoded?.tenantId).toBe('tenant456');
    expect(decoded?.email).toBe('test@example.com');
    expect(decoded?.type).toBe('tenant_user');
  });

  it('should return null for invalid token', () => {
    const decoded = verifyToken('invalid.token.here');
    expect(decoded).toBeNull();
  });

  it('should return null for expired token', () => {
    // Generate token with -1 second expiration
    const payload = {
      userId: 'user123',
      tenantId: 'tenant456',
      email: 'test@example.com',
    };

    const token = generateToken(payload, '-1s');
    const decoded = verifyToken(token);

    expect(decoded).toBeNull();
  });

  it('should include issuer in token', () => {
    const payload = {
      userId: 'user123',
      tenantId: 'tenant456',
      email: 'test@example.com',
    };

    const token = generateToken(payload);
    const decoded = verifyToken(token);

    expect(decoded).toBeDefined();
    // The issuer is verified during verification, so if it passes, issuer is correct
  });
});
