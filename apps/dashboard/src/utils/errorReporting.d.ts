/**
 * Error Reporting Utility
 * Provides centralized error logging and reporting functionality
 */
export interface ErrorReport {
    type: string;
    component?: string;
    message: string;
    stack?: string;
    componentStack?: string | null;
    timestamp: string;
    userAgent: string;
    url: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
}
/**
 * Log error to localStorage for debugging
 */
export declare function logErrorToStorage(error: ErrorReport): void;
/**
 * Send error to monitoring service endpoint
 */
export declare function reportErrorToService(error: ErrorReport): Promise<void>;
/**
 * Report error from error boundary
 */
export declare function reportBoundaryError(error: Error, errorInfo: React.ErrorInfo, componentName: string, severity?: 'low' | 'medium' | 'high' | 'critical'): void;
/**
 * Report runtime error (non-render errors)
 */
export declare function reportRuntimeError(error: Error, context?: {
    action?: string;
    component?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
}): void;
/**
 * Get all stored errors from localStorage
 */
export declare function getStoredErrors(): ErrorReport[];
/**
 * Clear all stored errors
 */
export declare function clearStoredErrors(): void;
/**
 * Get errors by severity level
 */
export declare function getErrorsBySeverity(severity: 'low' | 'medium' | 'high' | 'critical'): ErrorReport[];
/**
 * Get errors for a specific component
 */
export declare function getErrorsByComponent(componentName: string): ErrorReport[];
/**
 * Get error statistics
 */
export declare function getErrorStatistics(): {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
};
/**
 * Export errors as JSON for debugging
 */
export declare function exportErrorsAsJSON(): string;
/**
 * Download errors as a file
 */
export declare function downloadErrorsReport(): void;
/**
 * Install global error handler
 */
export declare function installGlobalErrorHandler(): void;
//# sourceMappingURL=errorReporting.d.ts.map