import { describe, expect, it } from 'vitest';
import {
  deriveApiKeyMetadata,
  generateApiKey,
  generateRotationToken,
  hashSecret,
  verifySecret,
} from '../security';

describe('security utilities', () => {
  it('hashes and verifies secrets with default parameters', async () => {
    const secret = 'super-secret-value';
    const { hash, salt } = await hashSecret(secret);

    expect(hash).toMatch(/^[a-f0-9]+$/);
    expect(hash.length).toBeGreaterThan(10);
    await expect(verifySecret(secret, hash, salt)).resolves.toBe(true);
    await expect(verifySecret('wrong', hash, salt)).resolves.toBe(false);
  });

  it('generates API key metadata with expected prefix and last four', () => {
    const metadata = generateApiKey('adm');
    expect(metadata.apiKey.startsWith('adm_')).toBe(true);
    expect(metadata.prefix).toHaveLength(10);
    expect(metadata.lastFour).toHaveLength(4);

    const derived = deriveApiKeyMetadata(metadata.apiKey);
    expect(derived.prefix).toBe(metadata.prefix);
    expect(derived.lastFour).toBe(metadata.lastFour);
  });

  it('rejects API keys that are too short', () => {
    expect(() => deriveApiKeyMetadata('abc')).toThrowError('API key is too short');
  });

  it('creates rotation tokens with future expiry and verifiable hash', async () => {
    const rotation = await generateRotationToken(5, 8);
    expect(rotation.expiresAt.getTime()).toBeGreaterThan(Date.now());
    await expect(verifySecret(rotation.token, rotation.hash, rotation.salt)).resolves.toBe(true);
  });
});
