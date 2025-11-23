#!/usr/bin/env tsx
/**
 * Cleans up expired verification and password reset tokens.
 * - Removes expired verification tokens
 * - Removes expired password reset tokens
 * - Removes used tokens older than 7 days
 */

import { getPrismaClient } from '../packages/database/src';

const prisma = getPrismaClient();

async function cleanupExpiredTokens() {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  console.log('🧹 Starting expired token cleanup');
  console.log(`Current time: ${now.toISOString()}`);

  const [expiredVerification, usedVerification, expiredReset, usedReset] =
    await prisma.$transaction([
      prisma.verificationToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.verificationToken.deleteMany({
        where: {
          used: true,
          createdAt: { lt: sevenDaysAgo },
        },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { expiresAt: { lt: now } },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          used: true,
          createdAt: { lt: sevenDaysAgo },
        },
      }),
    ]);

  console.log('\nCleanup summary:');
  console.log(`- Expired verification tokens removed: ${expiredVerification.count}`);
  console.log(`- Used verification tokens (older than 7 days) removed: ${usedVerification.count}`);
  console.log(`- Expired password reset tokens removed: ${expiredReset.count}`);
  console.log(`- Used password reset tokens (older than 7 days) removed: ${usedReset.count}`);

  console.log('\n✅ Token cleanup complete');
}

cleanupExpiredTokens()
  .catch((error) => {
    console.error('❌ Token cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
