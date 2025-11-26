#!/usr/bin/env ts-node
/**
 * Cleanup expired authentication tokens
 * This script removes expired verification tokens and password reset tokens from the database
 *
 * Usage:
 *   npm run cleanup:tokens
 *   or
 *   ts-node scripts/cleanup-expired-tokens.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupExpiredTokens() {
  const now = new Date();

  console.log('🧹 Starting token cleanup...');
  console.log(`Current time: ${now.toISOString()}`);

  try {
    // Delete expired verification tokens
    const deletedVerificationTokens = await prisma.verificationToken.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`✅ Deleted ${deletedVerificationTokens.count} expired verification tokens`);

    // Delete expired password reset tokens
    const deletedPasswordResetTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    console.log(`✅ Deleted ${deletedPasswordResetTokens.count} expired password reset tokens`);

    // Delete used tokens older than 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const deletedUsedVerificationTokens = await prisma.verificationToken.deleteMany({
      where: {
        used: true,
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    });

    console.log(`✅ Deleted ${deletedUsedVerificationTokens.count} used verification tokens older than 7 days`);

    const deletedUsedPasswordResetTokens = await prisma.passwordResetToken.deleteMany({
      where: {
        used: true,
        createdAt: {
          lt: sevenDaysAgo
        }
      }
    });

    console.log(`✅ Deleted ${deletedUsedPasswordResetTokens.count} used password reset tokens older than 7 days`);

    const totalDeleted =
      deletedVerificationTokens.count +
      deletedPasswordResetTokens.count +
      deletedUsedVerificationTokens.count +
      deletedUsedPasswordResetTokens.count;

    console.log(`\n🎉 Cleanup complete! Total tokens removed: ${totalDeleted}`);

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanupExpiredTokens()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
