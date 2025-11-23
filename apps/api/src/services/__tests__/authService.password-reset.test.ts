import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMocks = vi.hoisted(() => ({
  findUniqueMock: vi.fn(),
  updateManyMock: vi.fn(),
  updateUserMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock('@prisma/client', () => {
  const { findUniqueMock, updateManyMock, updateUserMock, transactionMock } = prismaMocks;

  const PrismaClient = vi.fn().mockImplementation(() => ({
    passwordResetToken: {
      findUnique: findUniqueMock,
      updateMany: updateManyMock,
    },
    tenantUser: {
      update: updateUserMock,
    },
    $transaction: (cb: any) => transactionMock(cb),
  }));

  return { PrismaClient };
});

vi.mock('../../utils/password', () => ({
  hashPassword: vi.fn().mockResolvedValue('hashed-password'),
  verifyPassword: vi.fn(),
}));

import { resetPassword } from '../authService';
import { hashPassword } from '../../utils/password';

describe('resetPassword', () => {
  beforeEach(() => {
    prismaMocks.findUniqueMock.mockReset();
    prismaMocks.updateManyMock.mockReset();
    prismaMocks.updateUserMock.mockReset();
    prismaMocks.transactionMock.mockReset();

    prismaMocks.transactionMock.mockImplementation(async (cb: any) =>
      cb({
        passwordResetToken: {
          findUnique: prismaMocks.findUniqueMock,
          updateMany: prismaMocks.updateManyMock,
        },
        tenantUser: {
          update: prismaMocks.updateUserMock,
        },
      })
    );

    prismaMocks.findUniqueMock.mockResolvedValue({
      id: 'reset-token-id',
      token: 'reset-token',
      tenantUserId: 'user-1',
      used: false,
      expiresAt: new Date(Date.now() + 60 * 1000),
    });

    prismaMocks.updateManyMock.mockResolvedValue({ count: 1 });
    prismaMocks.updateUserMock.mockResolvedValue({ id: 'user-1' });
  });

  it('marks the reset token as used before updating the password', async () => {
    await resetPassword('reset-token', 'NewPassword123!');

    expect(hashPassword).toHaveBeenCalledWith('NewPassword123!');
    expect(prismaMocks.updateManyMock).toHaveBeenCalledWith({
      where: { id: 'reset-token-id', used: false },
      data: { used: true },
    });
    expect(prismaMocks.updateUserMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { password: 'hashed-password' },
    });
  });

  it('prevents reuse of already used reset tokens', async () => {
    prismaMocks.updateManyMock.mockResolvedValue({ count: 0 });

    await expect(resetPassword('reset-token', 'AnotherPassword123!')).rejects.toThrow(
      'Reset token has already been used'
    );

    expect(prismaMocks.updateUserMock).not.toHaveBeenCalled();
  });
});
