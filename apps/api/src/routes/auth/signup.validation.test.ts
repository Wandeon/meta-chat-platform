import express from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import mime from 'mime';

mime.getType = mime.getType ?? mime.lookup;
mime.charsets = mime.charsets ?? { lookup: () => 'UTF-8' };
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

const mockPrisma = vi.hoisted(() => ({
  adminUser: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
  tenant: {
    create: vi.fn(),
  },
  verificationToken: {
    create: vi.fn(),
  },
  $transaction: vi.fn(async (handler: any) => handler()),
}));

const signupTransaction = vi.hoisted(() => vi.fn());

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn(() => mockPrisma),
}));

vi.mock('../../services/authService', () => ({
  signupTransaction,
}));

import signupRouter from './signup';

const createApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', signupRouter);
  return app;
};

const invalidPasswords = [
  {
    description: 'too short',
    payload: { email: 'test1@example.com', password: 'Short1!', name: 'Test', companyName: 'Test Co' },
    message: 'Password must be at least 8 characters',
  },
  {
    description: 'missing uppercase',
    payload: { email: 'test2@example.com', password: 'lowercase123!', name: 'Test', companyName: 'Test Co' },
    message: 'Password must contain at least one uppercase letter',
  },
  {
    description: 'missing lowercase',
    payload: { email: 'test3@example.com', password: 'UPPERCASE123!', name: 'Test', companyName: 'Test Co' },
    message: 'Password must contain at least one lowercase letter',
  },
  {
    description: 'missing number',
    payload: { email: 'test4@example.com', password: 'NoNumbers!', name: 'Test', companyName: 'Test Co' },
    message: 'Password must contain at least one number',
  },
  {
    description: 'missing special character',
    payload: { email: 'test5@example.com', password: 'NoSpecial123', name: 'Test', companyName: 'Test Co' },
    message: 'Password must contain at least one special character',
  },
];

describe('POST /api/auth/signup password validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  invalidPasswords.forEach(({ description, payload, message }) => {
    it(`rejects passwords that are ${description}`, async () => {
      const app = createApp();

      const response = await request(app).post('/api/auth/signup').send(payload);

      expect(response.status).toBe(400);
      expect(response.body).toMatchObject({ success: false, error: 'Validation failed' });
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password', message }),
        ]),
      );

      expect(mockPrisma.adminUser.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.adminUser.create).not.toHaveBeenCalled();
      expect(mockPrisma.tenant.create).not.toHaveBeenCalled();
      expect(mockPrisma.verificationToken.create).not.toHaveBeenCalled();
      expect(signupTransaction).not.toHaveBeenCalled();
    });
  });
});
