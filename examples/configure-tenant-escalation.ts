#!/usr/bin/env tsx
/**
 * Configure Tenant Confidence Escalation
 *
 * This script shows how to configure confidence-based escalation
 * settings for different types of tenants.
 *
 * Run: npx tsx examples/configure-tenant-escalation.ts
 */

import { getPrismaClient } from '../packages/database/src';

const prisma = getPrismaClient();

async function configureTenant(
  tenantId: string,
  escalationConfig: {
    enabled: boolean;
    mode: 'standard' | 'strict' | 'lenient';
    immediateEscalationThreshold?: number;
    suggestReviewThreshold?: number;
    addDisclaimers?: boolean;
    disclaimerText?: string;
    selfAssessmentStrategy?: 'explicit_marker' | 'chain_of_thought' | 'uncertainty_acknowledgment';
    highStakesDomains?: string[];
  }
) {
  // Fetch current settings
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  });

  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  // Merge with existing settings
  const currentSettings = (tenant.settings as any) || {};
  const updatedSettings = {
    ...currentSettings,
    confidenceEscalation: escalationConfig,
  };

  // Update tenant
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { settings: updatedSettings },
  });

  console.log(`✅ Updated tenant ${tenantId} with confidence escalation config:`, escalationConfig);
}

async function main() {
  console.log('🔧 Configuring Tenant Confidence Escalation Settings\n');

  // Example 1: Medical/Healthcare Tenant - Strict Mode
  console.log('Example 1: Medical Tenant (Strict Mode)');
  await configureTenant('medical-tenant-1', {
    enabled: true,
    mode: 'strict',
    disclaimerText: '\n\n⚠️ This information is for educational purposes only. Always consult with a licensed healthcare provider for medical advice.',
    highStakesDomains: ['prescription', 'dosage', 'surgery', 'emergency', 'diagnosis'],
  });

  // Example 2: Legal Services Tenant - Strict Mode
  console.log('\nExample 2: Legal Services Tenant (Strict Mode)');
  await configureTenant('legal-tenant-1', {
    enabled: true,
    mode: 'strict',
    disclaimerText: '\n\n⚠️ This is not legal advice. Please consult with a licensed attorney for your specific situation.',
    highStakesDomains: ['lawsuit', 'contract', 'liability', 'compliance'],
    selfAssessmentStrategy: 'chain_of_thought', // More explicit reasoning
  });

  // Example 3: E-commerce Support - Standard Mode
  console.log('\nExample 3: E-commerce Support Tenant (Standard Mode)');
  await configureTenant('ecommerce-tenant-1', {
    enabled: true,
    mode: 'standard',
    addDisclaimers: true,
  });

  // Example 4: Casual Chat Bot - Lenient Mode
  console.log('\nExample 4: Casual Chat Tenant (Lenient Mode)');
  await configureTenant('casual-chat-tenant-1', {
    enabled: true,
    mode: 'lenient',
    addDisclaimers: false, // Don't add disclaimers for casual chat
  });

  // Example 5: Custom Thresholds
  console.log('\nExample 5: Custom Thresholds Tenant');
  await configureTenant('custom-tenant-1', {
    enabled: true,
    mode: 'standard',
    immediateEscalationThreshold: 0.35, // 35% instead of default 30%
    suggestReviewThreshold: 0.7, // 70% instead of default 60%
    addDisclaimers: true,
    disclaimerText: '\n\n💡 Tip: This answer may not cover all edge cases. Contact us if you need specific guidance.',
  });

  // Example 6: Disable for specific tenant
  console.log('\nExample 6: Disable Confidence Escalation');
  await configureTenant('no-escalation-tenant-1', {
    enabled: false,
    mode: 'standard', // Doesn't matter when disabled
  });

  console.log('\n✅ All tenant configurations complete!\n');

  // Show summary
  console.log('📊 Configuration Summary:');
  console.log('─'.repeat(60));

  const tenants = await prisma.tenant.findMany({
    select: { id: true, name: true, settings: true },
  });

  for (const tenant of tenants) {
    const settings = tenant.settings as any;
    const escalation = settings?.confidenceEscalation;

    if (escalation) {
      console.log(`\n${tenant.name} (${tenant.id}):`);
      console.log(`  Enabled: ${escalation.enabled ? '✅' : '❌'}`);
      if (escalation.enabled) {
        console.log(`  Mode: ${escalation.mode}`);
        if (escalation.immediateEscalationThreshold) {
          console.log(`  Immediate Threshold: ${(escalation.immediateEscalationThreshold * 100).toFixed(0)}%`);
        }
        if (escalation.suggestReviewThreshold) {
          console.log(`  Review Threshold: ${(escalation.suggestReviewThreshold * 100).toFixed(0)}%`);
        }
        if (escalation.highStakesDomains?.length > 0) {
          console.log(`  High-Stakes Domains: ${escalation.highStakesDomains.join(', ')}`);
        }
      }
    }
  }

  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
