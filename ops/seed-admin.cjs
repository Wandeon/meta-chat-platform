#!/usr/bin/env node
const { PrismaClient } = require('@prisma/client');
const { generateApiKey, hashSecret } = require('@meta-chat/shared');

function parseArgs(argv) {
  const args = {
    email: '',
    name: '',
    role: 'SUPER',
    label: 'bootstrap',
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    const next = argv[i + 1];
    switch (current) {
      case '--email':
        args.email = next || '';
        i += 1;
        break;
      case '--name':
        args.name = next || '';
        i += 1;
        break;
      case '--role':
        args.role = (next || '').toUpperCase();
        i += 1;
        break;
      case '--label':
        args.label = next || '';
        i += 1;
        break;
      case '-h':
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        console.error(`Unknown option: ${current}`);
        printUsage();
        process.exit(1);
    }
  }

  if (!args.email) {
    console.error('The --email option is required.');
    printUsage();
    process.exit(1);
  }

  if (!['SUPER', 'STANDARD'].includes(args.role)) {
    console.error('Invalid role. Expected SUPER or STANDARD.');
    process.exit(1);
  }

  return args;
}

function printUsage() {
  console.log(`Usage: node ops/seed-admin.cjs --email <email> [--name <name>] [--role SUPER|STANDARD] [--label <label>]`);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required.');
    process.exit(1);
  }
  const { email, name, role, label } = parseArgs(process.argv.slice(2));

  const prisma = new PrismaClient();
  try {
    let admin = await prisma.adminUser.findUnique({ where: { email } });
    if (!admin) {
      admin = await prisma.adminUser.create({
        data: {
          email,
          name: name || null,
          role,
        },
      });
      console.log(`Created admin user ${email} with role ${role}`);
    } else {
      if (role && admin.role !== role) {
        admin = await prisma.adminUser.update({
          where: { id: admin.id },
          data: { role },
        });
        console.log(`Updated admin role for ${email} to ${role}`);
      }
      if (name && admin.name !== name) {
        admin = await prisma.adminUser.update({
          where: { id: admin.id },
          data: { name },
        });
        console.log(`Updated admin name for ${email}`);
      }
    }

    const existingKey = await prisma.adminApiKey.findFirst({
      where: {
        adminId: admin.id,
        label,
        active: true,
      },
    });

    const metadata = generateApiKey('adm');
    const hashed = await hashSecret(metadata.apiKey);

    if (existingKey) {
      await prisma.adminApiKey.update({
        where: { id: existingKey.id },
        data: {
          hash: hashed.hash,
          salt: hashed.salt,
          prefix: metadata.prefix,
          lastFour: metadata.lastFour,
          rotatedAt: new Date(),
        },
      });
      console.log(`Rotated existing admin API key (label: ${label}).`);
    } else {
      await prisma.adminApiKey.create({
        data: {
          adminId: admin.id,
          label,
          prefix: metadata.prefix,
          hash: hashed.hash,
          salt: hashed.salt,
          lastFour: metadata.lastFour,
        },
      });
      console.log(`Created new admin API key (label: ${label}).`);
    }

    console.log('--- Credentials ---');
    console.log(`Admin email: ${email}`);
    if (name) {
      console.log(`Admin name: ${name}`);
    }
    console.log(`Admin role: ${role}`);
    console.log(`API key: ${metadata.apiKey}`);
    console.log(`API key prefix: ${metadata.prefix}`);
    console.log(`API key last four: ${metadata.lastFour}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Failed to seed admin credentials:', error);
  process.exit(1);
});
