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
export declare function createLogger(scope: string, defaultMeta?: LogMetadata): AppLogger;
export declare function getRequestContext(): LogContext;
export declare function withRequestContext<T>(context: LogContext, fn: () => T): T;
export declare function addToRequestContext(context: LogContext): void;
export declare function setRequestContextValue(key: string, value: unknown): void;
export declare function getCorrelationId(): string | undefined;
export declare function ensureCorrelationId(): string;
export declare function createCorrelationId(): string;
//# sourceMappingURL=logging.d.ts.map