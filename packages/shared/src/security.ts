import { randomBytes, scrypt as scryptCallback, timingSafeEqual, ScryptOptions } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scryptCallback);

// Wrapper to support scrypt with options parameter
async function scrypt(
  password: string,
  salt: Buffer,
  keylen: number,
  options?: ScryptOptions
): Promise<Buffer> {
  if (options) {
    return new Promise((resolve, reject) => {
      scryptCallback(password, salt, keylen, options, (err, derivedKey) => {
        if (err) reject(err);
        else resolve(derivedKey);
      });
    });
  }
  return scryptAsync(password, salt, keylen) as Promise<Buffer>;
}

export interface HashSecretOptions {
  /**
   * Length of the derived key in bytes. Defaults to 64 which yields a 128
   * character hex string.
   */
  keyLength?: number;
  /**
   * Number of iterations for the scrypt algorithm. Defaults to 16384 which is
   * a good baseline for server-side hashing.
   */
  cost?: number;
  /**
   * Block size parameter for scrypt. Defaults to 8.
   */
  blockSize?: number;
  /**
   * Parallelization parameter for scrypt. Defaults to 1.
   */
  parallelization?: number;
}

export interface HashedSecretResult {
  hash: string;
  salt: string;
}

const DEFAULT_SALT_BYTES = 16;
const DEFAULT_KEY_BYTES = 64;
const DEFAULT_PREFIX_LENGTH = 10;
const DEFAULT_API_KEY_BYTES = 32;
const DEFAULT_ROTATION_TOKEN_BYTES = 24;

function toHex(buffer: Buffer): string {
  return buffer.toString('hex');
}

function normalizeOptions(options: HashSecretOptions = {}): Required<HashSecretOptions> {
  return {
    keyLength: options.keyLength ?? DEFAULT_KEY_BYTES,
    cost: options.cost ?? 16384,
    blockSize: options.blockSize ?? 8,
    parallelization: options.parallelization ?? 1,
  };
}

export async function hashSecret(
  secret: string,
  salt: string = toHex(randomBytes(DEFAULT_SALT_BYTES)),
  options?: HashSecretOptions,
): Promise<HashedSecretResult> {
  if (!secret) {
    throw new Error('Cannot hash an empty secret');
  }

  const normalized = normalizeOptions(options);
  const derived = await scrypt(
    secret,
    Buffer.from(salt, 'hex'),
    normalized.keyLength,
    {
      N: normalized.cost,
      r: normalized.blockSize,
      p: normalized.parallelization,
    }
  );

  return {
    hash: toHex(derived),
    salt,
  };
}

export async function verifySecret(
  candidate: string,
  expectedHash: string,
  salt: string,
  options?: HashSecretOptions,
): Promise<boolean> {
  if (!candidate || !expectedHash || !salt) {
    return false;
  }

  const { hash } = await hashSecret(candidate, salt, options);
  const expected = Buffer.from(expectedHash, 'hex');
  const actual = Buffer.from(hash, 'hex');

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}

export interface ApiKeyMetadata {
  apiKey: string;
  prefix: string;
  lastFour: string;
}

export function generateApiKey(
  prefixLabel: string = 'mcp',
  randomBytesLength: number = DEFAULT_API_KEY_BYTES,
  prefixLength: number = DEFAULT_PREFIX_LENGTH,
): ApiKeyMetadata {
  const random = randomBytes(randomBytesLength).toString('base64url');
  const apiKey = `${prefixLabel}_${random}`;
  return deriveApiKeyMetadata(apiKey, prefixLength);
}

export function deriveApiKeyMetadata(apiKey: string, prefixLength: number = DEFAULT_PREFIX_LENGTH): ApiKeyMetadata {
  if (!apiKey) {
    throw new Error('API key is required to derive metadata');
  }

  const sanitized = apiKey.replace(/[^a-zA-Z0-9]/g, '');
  if (sanitized.length < prefixLength) {
    throw new Error('API key is too short to derive prefix metadata');
  }

  return {
    apiKey,
    prefix: sanitized.substring(0, prefixLength).toLowerCase(),
    lastFour: sanitized.slice(-4),
  };
}

export interface RotationTokenMetadata {
  token: string;
  hash: string;
  salt: string;
  expiresAt: Date;
}

export async function generateRotationToken(
  validityMinutes: number = 15,
  entropyBytes: number = DEFAULT_ROTATION_TOKEN_BYTES,
): Promise<RotationTokenMetadata> {
  const token = randomBytes(entropyBytes).toString('base64url');
  const { hash, salt } = await hashSecret(token);
  const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);

  return {
    token,
    hash,
    salt,
    expiresAt,
  };
}

export const securityConstants = {
  DEFAULT_PREFIX_LENGTH,
  DEFAULT_API_KEY_BYTES,
  DEFAULT_ROTATION_TOKEN_BYTES,
};
