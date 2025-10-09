#!/usr/bin/env node
/**
 * Generate secure random secrets for production deployment
 *
 * Usage:
 *   node scripts/generate-secrets.js
 *   node scripts/generate-secrets.js --format env
 */

const crypto = require('crypto');

function generateSecret(bytes = 32, encoding = 'base64') {
  return crypto.randomBytes(bytes).toString(encoding);
}

function generateHex(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function generatePassword(length = 32) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*-_+=';
  let password = '';
  const randomBytes = crypto.randomBytes(length);

  for (let i = 0; i < length; i++) {
    password += chars[randomBytes[i] % chars.length];
  }

  return password;
}

const secrets = {
  'DATABASE_PASSWORD': generatePassword(32),
  'REDIS_PASSWORD': generatePassword(24),
  'RABBITMQ_PASSWORD': generatePassword(24),
  'ENCRYPTION_KEY': generateSecret(32, 'base64'),
  'ADMIN_JWT_SECRET': generateSecret(64, 'base64'),
  'ADMIN_KEY_PEPPER': generateHex(32),
  'WEBCHAT_JWT_SECRET': generateSecret(64, 'base64'),
  'WEBCHAT_HMAC_SECRET': generateSecret(64, 'base64'),
};

const args = process.argv.slice(2);
const format = args.includes('--format') ? args[args.indexOf('--format') + 1] : 'table';

console.log('');
console.log('='.repeat(80));
console.log('Meta Chat Platform - Production Secrets Generator');
console.log('='.repeat(80));
console.log('');
console.log('⚠️  SECURITY WARNING:');
console.log('  - Store these secrets securely (password manager, secrets vault)');
console.log('  - Never commit them to version control');
console.log('  - Rotate them regularly (recommended: every 90 days)');
console.log('  - Use different values for each environment');
console.log('');
console.log('='.repeat(80));
console.log('');

if (format === 'env') {
  // Output as environment variables
  console.log('# Copy these to your .env.production file:');
  console.log('');
  for (const [key, value] of Object.entries(secrets)) {
    console.log(`${key}="${value}"`);
  }
} else if (format === 'json') {
  // Output as JSON
  console.log(JSON.stringify(secrets, null, 2));
} else {
  // Default table format
  console.log('Generated Secrets:');
  console.log('');
  const maxKeyLength = Math.max(...Object.keys(secrets).map(k => k.length));

  for (const [key, value] of Object.entries(secrets)) {
    console.log(`  ${key.padEnd(maxKeyLength + 2)} ${value}`);
  }
}

console.log('');
console.log('='.repeat(80));
console.log('');
console.log('Next Steps:');
console.log('');
console.log('  1. Copy .env.production.example to .env.production');
console.log('  2. Replace placeholder secrets with values generated above');
console.log('  3. Add your API keys (OpenAI, Anthropic, etc.)');
console.log('  4. Set file permissions: chmod 600 .env.production');
console.log('  5. Verify configuration: npm run check:env');
console.log('');
console.log('='.repeat(80));
console.log('');
