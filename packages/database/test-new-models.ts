#!/usr/bin/env tsx
/**
 * Test script to verify new Prisma models work correctly
 *
 * This tests the following newly added models:
 * - VerificationToken
 * - AnalyticsDaily
 * - MessageMetrics
 * - WidgetAnalytics
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testModels() {
  console.log('Testing new Prisma models...\n');

  try {
    // Test 1: VerificationToken model
    console.log('1. Testing VerificationToken model...');
    const tokenCount = await prisma.verificationToken.count();
    console.log(`   ✓ VerificationToken count: ${tokenCount}`);

    // Test 2: AnalyticsDaily model
    console.log('2. Testing AnalyticsDaily model...');
    const analyticsCount = await prisma.analyticsDaily.count();
    console.log(`   ✓ AnalyticsDaily count: ${analyticsCount}`);

    // Test 3: MessageMetrics model
    console.log('3. Testing MessageMetrics model...');
    const metricsCount = await prisma.messageMetrics.count();
    console.log(`   ✓ MessageMetrics count: ${metricsCount}`);

    // Test 4: WidgetAnalytics model
    console.log('4. Testing WidgetAnalytics model...');
    const widgetCount = await prisma.widgetAnalytics.count();
    console.log(`   ✓ WidgetAnalytics count: ${widgetCount}`);

    // Test 5: AdminUser with relations
    console.log('5. Testing AdminUser with verificationTokens relation...');
    const adminWithTokens = await prisma.adminUser.findFirst({
      include: {
        verificationTokens: true,
      },
    });
    console.log(`   ✓ AdminUser found with ${adminWithTokens?.verificationTokens.length || 0} verification tokens`);

    // Test 6: Tenant with new relations
    console.log('6. Testing Tenant with new analytics relations...');
    const tenantWithAnalytics = await prisma.tenant.findFirst({
      include: {
        analyticsDaily: {
          take: 5,
          orderBy: { date: 'desc' },
        },
        messageMetrics: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        widgetAnalytics: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    console.log(`   ✓ Tenant found with:`);
    console.log(`     - ${tenantWithAnalytics?.analyticsDaily.length || 0} analytics records`);
    console.log(`     - ${tenantWithAnalytics?.messageMetrics.length || 0} message metrics`);
    console.log(`     - ${tenantWithAnalytics?.widgetAnalytics.length || 0} widget analytics`);

    // Test 7: Conversation with messageMetrics relation
    console.log('7. Testing Conversation with messageMetrics relation...');
    const conversationWithMetrics = await prisma.conversation.findFirst({
      include: {
        messageMetrics: true,
      },
    });
    console.log(`   ✓ Conversation found with ${conversationWithMetrics?.messageMetrics.length || 0} metrics`);

    console.log('\n✅ All model tests passed successfully!');
    console.log('\nSummary:');
    console.log('========');
    console.log(`- verification_tokens: ${tokenCount} records`);
    console.log(`- analytics_daily: ${analyticsCount} records`);
    console.log(`- message_metrics: ${metricsCount} records`);
    console.log(`- widget_analytics: ${widgetCount} records`);

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testModels();
