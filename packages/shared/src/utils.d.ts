export declare function generateId(): string;
export declare function sleep(ms: number): Promise<void>;
export declare function retry<T>(fn: () => Promise<T>, maxAttempts?: number, initialDelay?: number, maxDelay?: number): Promise<T>;
export declare function sanitizePhoneNumber(phone: string): string;
export declare function truncateText(text: string, maxLength: number): string;
export declare function parseJSON<T>(json: string, fallback: T): T;
export declare function isObject(value: any): value is Record<string, any>;
export declare function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T;
export declare class Logger {
    private context;
    constructor(context: string);
    private format;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, error?: Error | any): void;
    debug(message: string, meta?: any): void;
}
//# sourceMappingURL=utils.d.ts.map