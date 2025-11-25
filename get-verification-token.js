const { PrismaClient } = require('@prisma/client');

// Load env
require('dotenv').config({ path: '/home/deploy/meta-chat-platform/.env.production' });

const prisma = new PrismaClient();

async function main() {
  try {
    // Find user
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

    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    console.log('User found:', user.email);
    console.log('Email verified:', user.emailVerified);

    if (user.VerificationToken && user.VerificationToken.length > 0) {
      const token = user.VerificationToken[0];
      console.log('Verification token:', token.token);
      console.log('Expires at:', token.expiresAt);
      console.log('\nVerification link:');
      console.log('https://chat.genai.hr/api/auth/verify-email?token=' + token.token);
    } else {
      console.log('No valid verification token found');
    }

    await prisma.();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
