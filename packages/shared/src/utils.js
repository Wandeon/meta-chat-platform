"use strict";
// Utility functions
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
exports.generateId = generateId;
exports.sleep = sleep;
exports.retry = retry;
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.truncateText = truncateText;
exports.parseJSON = parseJSON;
exports.isObject = isObject;
exports.deepMerge = deepMerge;
function generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
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
class Logger {
    context;
    constructor(context) {
        this.context = context;
    }
    format(level, message, meta) {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
    }
    info(message, meta) {
        console.log(this.format('INFO', message, meta));
    }
    warn(message, meta) {
        console.warn(this.format('WARN', message, meta));
    }
    error(message, error) {
        const meta = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : error;
        console.error(this.format('ERROR', message, meta));
    }
    debug(message, meta) {
        if (process.env.LOG_LEVEL === 'debug') {
            console.debug(this.format('DEBUG', message, meta));
        }
    }
}
exports.Logger = Logger;
//# sourceMappingURL=utils.js.map