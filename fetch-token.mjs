import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const envContent = fs.readFileSync('/home/deploy/meta-chat-platform/apps/api/.env.production', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) env[key] = value;
  }
});

Object.assign(process.env, env);

const prisma = new PrismaClient();

try {
  const user = await prisma.adminUser.findUnique({
    where: { email: 'mislav@metrica.hr' },
    include: {
      VerificationToken: {
        where: { used: false },
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (user?.VerificationToken?.[0]) {
    console.log(user.VerificationToken[0].token);
  }
} catch (e) {
  console.error(e.message);
} finally {
  await prisma.();
}
