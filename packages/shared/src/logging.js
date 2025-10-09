"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLogger = createLogger;
exports.getRequestContext = getRequestContext;
exports.withRequestContext = withRequestContext;
exports.addToRequestContext = addToRequestContext;
exports.setRequestContextValue = setRequestContextValue;
exports.getCorrelationId = getCorrelationId;
exports.ensureCorrelationId = ensureCorrelationId;
exports.createCorrelationId = createCorrelationId;
const async_hooks_1 = require("async_hooks");
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const contextStorage = new async_hooks_1.AsyncLocalStorage();
const baseLogger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL ?? 'info',
    messageKey: 'message',
    timestamp: pino_1.default.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label.toUpperCase() };
        },
    },
});
function createLoggerInstance(instance, scope) {
    const write = (level, message, meta) => {
        const requestContext = contextStorage.getStore() ?? {};
        const payload = { ...requestContext };
        if (meta instanceof Error) {
            payload.err = meta;
        }
        else if (meta) {
            Object.assign(payload, meta);
        }
        if (Object.keys(payload).length > 0) {
            instance[level](payload, message);
        }
        else {
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
function createLogger(scope, defaultMeta = {}) {
    const logger = baseLogger.child({ scope, ...defaultMeta });
    return createLoggerInstance(logger, scope);
}
function getRequestContext() {
    return contextStorage.getStore() ?? {};
}
function withRequestContext(context, fn) {
    const current = getRequestContext();
    const merged = { ...current, ...context };
    if (!merged.correlationId) {
        merged.correlationId = context.correlationId ?? createCorrelationId();
    }
    return contextStorage.run(merged, fn);
}
function addToRequestContext(context) {
    const store = contextStorage.getStore();
    if (store) {
        Object.assign(store, context);
        return;
    }
    contextStorage.enterWith({ ...context });
}
function setRequestContextValue(key, value) {
    addToRequestContext({ [key]: value });
}
function getCorrelationId() {
    return getRequestContext().correlationId;
}
function ensureCorrelationId() {
    const existing = getCorrelationId();
    if (existing) {
        return existing;
    }
    const correlationId = createCorrelationId();
    addToRequestContext({ correlationId });
    return correlationId;
}
function createCorrelationId() {
    return (0, crypto_1.randomUUID)();
}
//# sourceMappingURL=logging.js.map