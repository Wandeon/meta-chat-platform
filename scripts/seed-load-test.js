const crypto = require('crypto');
const { promisify } = require('util');
const { PrismaClient } = require('@prisma/client');

const scrypt = promisify(crypto.scrypt);

function deriveMetadata(apiKey) {
  const sanitized = apiKey.replace(/[^a-zA-Z0-9]/g, '');
  if (sanitized.length < 10) {
    throw new Error('Admin key must contain at least 10 alphanumeric characters');
  }
  return {
    prefix: sanitized.substring(0, 10).toLowerCase(),
    lastFour: sanitized.slice(-4),
  };
}

async function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(secret, Buffer.from(salt, 'hex'), 64);
  return { hash: derived.toString('hex'), salt };
}

async function main() {
  const adminKey = process.env.PERF_ADMIN_KEY;
  if (!adminKey) {
    console.warn('PERF_ADMIN_KEY not provided; skipping load-test seed');
    return;
  }

  const tenantId = process.env.PERF_TENANT_ID || 'tenant-load-test';
  const prisma = new PrismaClient();
  try {
    await prisma.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: {
        id: tenantId,
        name: 'Load Test Tenant',
        settings: {},
      },
    });

    const admin = await prisma.adminUser.upsert({
      where: { email: 'perf-admin@meta.chat' },
      update: { role: 'SUPER' },
      create: {
        email: 'perf-admin@meta.chat',
        name: 'Perf Admin',
        role: 'SUPER',
      },
    });

    const { hash, salt } = await hashSecret(adminKey);
    const metadata = deriveMetadata(adminKey);

    await prisma.adminApiKey.upsert({
      where: { id: 'perf-admin-key' },
      update: {
        adminId: admin.id,
        hash,
        salt,
        prefix: metadata.prefix,
        lastFour: metadata.lastFour,
        active: true,
      },
      create: {
        id: 'perf-admin-key',
        adminId: admin.id,
        label: 'Load test key',
        hash,
        salt,
        prefix: metadata.prefix,
        lastFour: metadata.lastFour,
      },
    });

    console.log('Load-test fixtures created.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
