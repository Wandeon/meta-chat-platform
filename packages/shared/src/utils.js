"use strict";
// Utility functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.sleep = sleep;
exports.retry = retry;
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.truncateText = truncateText;
exports.parseJSON = parseJSON;
exports.isObject = isObject;
exports.deepMerge = deepMerge;
function bytesToUuid(bytes) {
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
function generateId() {
    const globalCrypto = typeof globalThis !== 'undefined'
        ? (globalThis.crypto ||
            // Node.js compatibility: global crypto may be exposed under webcrypto
            ((typeof require !== 'undefined' &&
                require('crypto').webcrypto) ||
                undefined))
        : undefined;
    if (globalCrypto?.randomUUID) {
        return globalCrypto.randomUUID();
    }
    if (globalCrypto?.getRandomValues) {
        const bytes = new Uint8Array(16);
        globalCrypto.getRandomValues(bytes);
        // Per RFC 4122, set version to 4 and variant to RFC 4122
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        return bytesToUuid(bytes);
    }
    // Fallback for environments without crypto support
    const random = () => Math.floor(Math.random() * 256);
    const bytes = Array.from({ length: 16 }, random);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return bytesToUuid(bytes);
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function retry(fn, maxAttempts = 3, initialDelay = 1000, maxDelay = 60000) {
    let lastError;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt < maxAttempts - 1) {
                const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
                const jitter = delay * 0.1 * (Math.random() * 2 - 1);
                await sleep(delay + jitter);
            }
        }
    }
    throw lastError;
}
function sanitizePhoneNumber(phone) {
    return phone.replace(/\D/g, '');
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
function parseJSON(json, fallback) {
    try {
        return JSON.parse(json);
    }
    catch {
        return fallback;
    }
}
function isObject(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function deepMerge(target, source) {
    const result = { ...target };
    for (const key in source) {
        const sourceValue = source[key];
        const targetValue = result[key];
        if (isObject(sourceValue) && isObject(targetValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        }
        else if (sourceValue !== undefined) {
            result[key] = sourceValue;
        }
    }
    return result;
}
//# sourceMappingURL=utils.js.map