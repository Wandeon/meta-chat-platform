import { AsyncLocalStorage } from 'async_hooks';
import { randomUUID } from 'crypto';
import pino, { Logger as PinoLogger } from 'pino';

export interface LogContext {
  correlationId?: string;
  requestId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export type LogMetadata = Record<string, unknown>;

export interface AppLogger {
  info(message: string, meta?: LogMetadata | Error): void;
  warn(message: string, meta?: LogMetadata | Error): void;
  error(message: string, meta?: LogMetadata | Error): void;
  debug(message: string, meta?: LogMetadata | Error): void;
  child(scope: string, defaultMeta?: LogMetadata): AppLogger;
}

const contextStorage = new AsyncLocalStorage<LogContext>();

const baseLogger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  messageKey: 'message',
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label.toUpperCase() };
    },
  },
});

function createLoggerInstance(instance: PinoLogger, scope: string): AppLogger {
  const write = (level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: LogMetadata | Error) => {
    const requestContext = contextStorage.getStore() ?? {};
    const payload: Record<string, unknown> = { ...requestContext };

    if (meta instanceof Error) {
      payload.err = meta;
    } else if (meta) {
      Object.assign(payload, meta);
    }

    if (Object.keys(payload).length > 0) {
      instance[level](payload, message);
    } else {
      instance[level](message);
    }
  };

  return {
    info: (message, meta) => write('info', message, meta),
    warn: (message, meta) => write('warn', message, meta),
    error: (message, meta) => write('error', message, meta),
    debug: (message, meta) => write('debug', message, meta),
    child: (childScope, defaultMeta = {}) => {
      const scopedName = childScope ? `${scope}.${childScope}` : scope;
      const childLogger = instance.child({ scope: scopedName, ...defaultMeta });
      return createLoggerInstance(childLogger, scopedName);
    },
  };
}

export function createLogger(scope: string, defaultMeta: LogMetadata = {}): AppLogger {
  const logger = baseLogger.child({ scope, ...defaultMeta });
  return createLoggerInstance(logger, scope);
}

export function getRequestContext(): LogContext {
  return contextStorage.getStore() ?? {};
}

export function withRequestContext<T>(context: LogContext, fn: () => T): T {
  const current = getRequestContext();
  const merged: LogContext = { ...current, ...context };

  if (!merged.correlationId) {
    merged.correlationId = context.correlationId ?? createCorrelationId();
  }

  return contextStorage.run(merged, fn);
}

export function addToRequestContext(context: LogContext): void {
  const store = contextStorage.getStore();

  if (store) {
    Object.assign(store, context);
    return;
  }

  contextStorage.enterWith({ ...context });
}

export function setRequestContextValue(key: string, value: unknown): void {
  addToRequestContext({ [key]: value });
}

export function getCorrelationId(): string | undefined {
  return getRequestContext().correlationId as string | undefined;
}

export function ensureCorrelationId(): string {
  const existing = getCorrelationId();

  if (existing) {
    return existing;
  }

  const correlationId = createCorrelationId();
  addToRequestContext({ correlationId });
  return correlationId;
}

export function createCorrelationId(): string {
  return randomUUID();
}
