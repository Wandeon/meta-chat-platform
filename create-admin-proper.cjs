#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const { generateApiKey, hashSecret } = require('./packages/shared/dist/security');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Check if admin already exists
    const existing = await prisma.adminUser.findUnique({
      where: { email: 'admin@genai.hr' }
    });

    if (!existing) {
      console.error('❌ Admin user not found. Run create-admin.cjs first');
      process.exit(1);
    }

    // Generate a proper API key
    const keyMetadata = generateApiKey('adm', 32, 10);
    console.log('Generated API key:', keyMetadata.apiKey);

    // Hash it properly
    const { hash, salt } = await hashSecret(keyMetadata.apiKey);
    console.log('Hash generated successfully');

    // Delete old admin keys
    await prisma.adminKey.deleteMany({});
    console.log('Deleted old admin keys');

    // Create admin API key with proper hash and salt
    const adminKey = await prisma.adminKey.create({
      data: {
        name: 'Production Admin Key',
        hashedSecret: hash,
        metadata: {
          salt,
          prefix: keyMetadata.prefix,
          lastFour: keyMetadata.lastFour,
        },
        status: 'active',
      },
    });

    console.log('✅ Admin API key created');
    console.log('');
    console.log('='.repeat(80));
    console.log('🔑 SAVE THIS API KEY - IT WILL NOT BE SHOWN AGAIN:');
    console.log('');
    console.log(`   ${keyMetadata.apiKey}`);
    console.log('');
    console.log('='.repeat(80));
    console.log('');
    console.log('Use this key to log into the dashboard at https://chat.genai.hr');

  } catch (error) {
    console.error('❌ Error creating admin key:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
