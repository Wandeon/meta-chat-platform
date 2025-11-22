import { Router, Request, Response } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../../prisma';
import { generateApiKey, hashSecret } from '@meta-chat/shared';

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password is required'),
});

router.post('/login', async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const { email, password } = parsed.data;

  try {
    const admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.password) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (!admin.emailVerified) {
      return res.status(403).json({ success: false, error: 'Email not verified' });
    }

    const passwordOk = await bcrypt.compare(password, admin.password);
    if (!passwordOk) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Issue a new admin API key for this session
    const metadata = generateApiKey('adm');
    const hashed = await hashSecret(metadata.apiKey);

    const keyRecord = await prisma.adminApiKey.create({
      data: {
        adminId: admin.id,
        label: 'Login key',
        prefix: metadata.prefix,
        hash: hashed.hash,
        salt: hashed.salt,
        lastFour: metadata.lastFour,
        active: true,
      },
    });

    return res.status(200).json({
      success: true,
      admin: {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name,
      },
      apiKey: metadata.apiKey,
      apiKeyId: keyRecord.id,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
EOF'
