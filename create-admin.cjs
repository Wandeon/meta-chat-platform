#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    // Generate a random API key
    const prefix = 'adm';
    const randomPart = crypto.randomBytes(32).toString('base64url');
    const apiKey = `${prefix}_${randomPart}`;

    // Hash the API key with scrypt
    const salt = crypto.randomBytes(16).toString('hex');
    const hashedSecret = crypto.scryptSync(apiKey, salt, 64).toString('hex');

    // Create admin user
    const admin = await prisma.adminUser.create({
      data: {
        email: 'admin@genai.hr',
        name: 'System Admin',
        role: 'SUPER',
      },
    });

    console.log('✅ Admin user created:', admin.email);

    // Create admin API key
    const adminKey = await prisma.adminKey.create({
      data: {
        name: 'Initial Admin Key',
        hashedSecret: `${hashedSecret}:${salt}`,
        status: 'active',
      },
    });

    console.log('✅ Admin API key created');
    console.log('');
    console.log('='.repeat(80));
    console.log('🔑 SAVE THIS API KEY - IT WILL NOT BE SHOWN AGAIN:');
    console.log('');
    console.log(`   ${apiKey}`);
    console.log('');
    console.log('='.repeat(80));
    console.log('');
    console.log('Use this key to log into the dashboard at https://chat.genai.hr');

  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ Admin user already exists');
    } else {
      console.error('❌ Error creating admin:', error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
