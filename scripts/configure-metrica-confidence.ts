#!/usr/bin/env tsx
/**
 * Configure Metrica tenant with confidence escalation
 */

import { getPrismaClient } from '../packages/database/src';

const prisma = getPrismaClient();

async function configureMetricaTenant() {
  console.log('🔍 Looking for Metrica tenant...\n');

  // Find all tenants
  const allTenants = await prisma.tenant.findMany({
    select: { id: true, name: true, settings: true },
  });

  console.log('Found tenants:');
  allTenants.forEach((t) => console.log(`  - ${t.name} (${t.id})`));
  console.log('');

  // Look for Metrica tenant (case insensitive)
  const metricaTenant = allTenants.find((t) => t.name.toLowerCase().includes('metrica'));

  if (!metricaTenant) {
    console.log('❌ Metrica tenant not found. Creating one...\n');

    // Create Metrica tenant
    const newTenant = await prisma.tenant.create({
      data: {
        name: 'Metrica',
        enabled: true,
        settings: {
          brandName: 'Metrica',
          tone: 'professional',
          locale: ['en-US', 'hr-HR'],
          enableRag: true,
          enableFunctionCalling: true,
          enableHumanHandoff: true,
          humanHandoffKeywords: ['speak to human', 'talk to agent', 'human support'],
          confidenceEscalation: {
            enabled: true,
            mode: 'standard',
            addDisclaimers: true,
            selfAssessmentStrategy: 'explicit_marker',
          },
          ragConfig: {
            topK: 5,
            minSimilarity: 0.5,
            hybridWeights: {
              keyword: 0.3,
              vector: 0.7,
            },
          },
          llm: {
            provider: 'openai',
            model: 'gpt-4o',
            temperature: 0.7,
            topP: 1.0,
            maxTokens: 2000,
            systemPrompt: '',
          },
        },
      },
    });

    console.log('✅ Created Metrica tenant:', newTenant.id);
    console.log('\nConfiguration:');
    console.log(JSON.stringify(newTenant.settings, null, 2));
  } else {
    console.log(`✅ Found Metrica tenant: ${metricaTenant.id}\n`);

    // Get current settings
    const currentSettings = (metricaTenant.settings as any) || {};

    // Merge with confidence escalation settings
    const updatedSettings = {
      ...currentSettings,
      enableHumanHandoff: true, // Ensure this is enabled
      confidenceEscalation: {
        enabled: true,
        mode: 'standard',
        addDisclaimers: true,
        selfAssessmentStrategy: 'explicit_marker',
        // Keep any existing custom settings
        ...(currentSettings.confidenceEscalation || {}),
      },
    };

    // Update tenant
    const updated = await prisma.tenant.update({
      where: { id: metricaTenant.id },
      data: { settings: updatedSettings },
    });

    console.log('✅ Updated Metrica tenant with confidence escalation settings\n');
    console.log('Configuration:');
    console.log(JSON.stringify(updated.settings, null, 2));
  }

  console.log('\n✨ Done! Confidence escalation is now enabled for Metrica tenant.');
  console.log('\nWhat was configured:');
  console.log('  ✅ Confidence-based escalation: ENABLED');
  console.log('  ✅ Mode: Standard (escalates when confidence <30%)');
  console.log('  ✅ Add disclaimers: YES');
  console.log('  ✅ Strategy: Explicit Marker');
  console.log('\nYou can now:');
  console.log('  1. Go to the dashboard at https://chat.genai.hr');
  console.log('  2. Navigate to Tenants > Metrica > Settings');
  console.log('  3. Adjust confidence escalation settings in the UI');
  console.log('  4. Test by sending messages through the chat');
}

configureMetricaTenant()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
