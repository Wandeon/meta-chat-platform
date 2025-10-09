"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityConstants = void 0;
exports.hashSecret = hashSecret;
exports.verifySecret = verifySecret;
exports.generateApiKey = generateApiKey;
exports.deriveApiKeyMetadata = deriveApiKeyMetadata;
exports.generateRotationToken = generateRotationToken;
const crypto_1 = require("crypto");
const util_1 = require("util");
const scryptAsync = (0, util_1.promisify)(crypto_1.scrypt);
// Wrapper to support scrypt with options parameter
async function scrypt(password, salt, keylen, options) {
    if (options) {
        return new Promise((resolve, reject) => {
            (0, crypto_1.scrypt)(password, salt, keylen, options, (err, derivedKey) => {
                if (err)
                    reject(err);
                else
                    resolve(derivedKey);
            });
        });
    }
    return scryptAsync(password, salt, keylen);
}
const DEFAULT_SALT_BYTES = 16;
const DEFAULT_KEY_BYTES = 64;
const DEFAULT_PREFIX_LENGTH = 10;
const DEFAULT_API_KEY_BYTES = 32;
const DEFAULT_ROTATION_TOKEN_BYTES = 24;
function toHex(buffer) {
    return buffer.toString('hex');
}
function normalizeOptions(options = {}) {
    return {
        keyLength: options.keyLength ?? DEFAULT_KEY_BYTES,
        cost: options.cost ?? 16384,
        blockSize: options.blockSize ?? 8,
        parallelization: options.parallelization ?? 1,
    };
}
async function hashSecret(secret, salt = toHex((0, crypto_1.randomBytes)(DEFAULT_SALT_BYTES)), options) {
    if (!secret) {
        throw new Error('Cannot hash an empty secret');
    }
    const normalized = normalizeOptions(options);
    const derived = await scrypt(secret, Buffer.from(salt, 'hex'), normalized.keyLength, {
        N: normalized.cost,
        r: normalized.blockSize,
        p: normalized.parallelization,
    });
    return {
        hash: toHex(derived),
        salt,
    };
}
async function verifySecret(candidate, expectedHash, salt, options) {
    if (!candidate || !expectedHash || !salt) {
        return false;
    }
    const { hash } = await hashSecret(candidate, salt, options);
    const expected = Buffer.from(expectedHash, 'hex');
    const actual = Buffer.from(hash, 'hex');
    if (expected.length !== actual.length) {
        return false;
    }
    return (0, crypto_1.timingSafeEqual)(actual, expected);
}
function generateApiKey(prefixLabel = 'mcp', randomBytesLength = DEFAULT_API_KEY_BYTES, prefixLength = DEFAULT_PREFIX_LENGTH) {
    const random = (0, crypto_1.randomBytes)(randomBytesLength).toString('base64url');
    const apiKey = `${prefixLabel}_${random}`;
    return deriveApiKeyMetadata(apiKey, prefixLength);
}
function deriveApiKeyMetadata(apiKey, prefixLength = DEFAULT_PREFIX_LENGTH) {
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
async function generateRotationToken(validityMinutes = 15, entropyBytes = DEFAULT_ROTATION_TOKEN_BYTES) {
    const token = (0, crypto_1.randomBytes)(entropyBytes).toString('base64url');
    const { hash, salt } = await hashSecret(token);
    const expiresAt = new Date(Date.now() + validityMinutes * 60 * 1000);
    return {
        token,
        hash,
        salt,
        expiresAt,
    };
}
exports.securityConstants = {
    DEFAULT_PREFIX_LENGTH,
    DEFAULT_API_KEY_BYTES,
    DEFAULT_ROTATION_TOKEN_BYTES,
};
//# sourceMappingURL=security.js.map