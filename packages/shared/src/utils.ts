// Utility functions

function bytesToUuid(bytes: ArrayLike<number>): string {
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export function generateId(): string {
  const globalCrypto =
    typeof globalThis !== 'undefined'
      ? ((globalThis.crypto ||
          // Node.js compatibility: global crypto may be exposed under webcrypto
          ((typeof require !== 'undefined' &&
            require('crypto').webcrypto) ||
            undefined)) as any)
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

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  initialDelay: number = 1000,
  maxDelay: number = 60000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxAttempts - 1) {
        const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
        const jitter = delay * 0.1 * (Math.random() * 2 - 1);
        await sleep(delay + jitter);
      }
    }
  }

  throw lastError!;
}

export function sanitizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function parseJSON<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function isObject(value: any): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key] = deepMerge(targetValue as any, sourceValue as any);
    } else if (sourceValue !== undefined) {
      result[key] = sourceValue as any;
    }
  }

  return result;
}

export class Logger {
  constructor(private context: string) {}

  private format(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${message}${metaStr}`;
  }

  info(message: string, meta?: any): void {
    console.log(this.format('INFO', message, meta));
  }

  warn(message: string, meta?: any): void {
    console.warn(this.format('WARN', message, meta));
  }

  error(message: string, error?: Error | any): void {
    const meta = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : error;
    console.error(this.format('ERROR', message, meta));
  }

  debug(message: string, meta?: any): void {
    if (process.env.LOG_LEVEL === 'debug') {
      console.debug(this.format('DEBUG', message, meta));
    }
  }
}
