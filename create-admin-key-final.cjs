#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const { generateApiKey, hashSecret } = require('./packages/shared/dist/security');

const prisma = new PrismaClient();

async function createAdminApiKey() {
  try {
    // Find the admin user
    const admin = await prisma.adminUser.findUnique({
      where: { email: 'admin@genai.hr' }
    });

    if (!admin) {
      console.error('❌ Admin user not found at admin@genai.hr');
      process.exit(1);
    }

    console.log('✅ Found admin user:', admin.email);

    // Generate a proper API key
    const keyMetadata = generateApiKey('adm', 32, 10);
    console.log('✅ Generated API key');

    // Hash it properly
    const { hash, salt } = await hashSecret(keyMetadata.apiKey);
    console.log('✅ Hashed API key');

    // Delete old admin API keys for this admin
    await prisma.adminApiKey.deleteMany({
      where: { adminId: admin.id }
    });
    console.log('✅ Deleted old admin API keys');

    // Create admin API key in the correct table
    const adminApiKey = await prisma.adminApiKey.create({
      data: {
        adminId: admin.id,
        label: 'Production Admin Key',
        prefix: keyMetadata.prefix,
        hash,
        salt,
        lastFour: keyMetadata.lastFour,
        active: true,
      },
    });

    console.log('✅ Admin API key created in database');
    console.log('');
    console.log('='.repeat(80));
    console.log('🔑 SAVE THIS API KEY - IT WILL NOT BE SHOWN AGAIN:');
    console.log('');
    console.log(`   ${keyMetadata.apiKey}`);
    console.log('');
    console.log('='.repeat(80));
    console.log('');
    console.log('Details:');
    console.log(`  - Admin: ${admin.email}`);
    console.log(`  - Prefix: ${keyMetadata.prefix}`);
    console.log(`  - Last 4: ${keyMetadata.lastFour}`);
    console.log('');
    console.log('Use this key to access the dashboard at: https://chat.genai.hr');
    console.log('');

  } catch (error) {
    console.error('❌ Error creating admin API key:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminApiKey();
