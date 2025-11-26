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
export function logErrorToStorage(error: ErrorReport): void {
  try {
    const errors = JSON.parse(localStorage.getItem('app_errors') || '[]');
    errors.push(error);
    localStorage.setItem('app_errors', JSON.stringify(errors.slice(-10)));
  } catch (e) {
    console.error('Failed to store error in localStorage:', e);
  }
}

/**
 * Send error to monitoring service endpoint
 */
export async function reportErrorToService(error: ErrorReport): Promise<void> {
  const endpoint = import.meta.env.VITE_ERROR_REPORTING_ENDPOINT;

  if (!endpoint) {
    console.warn('Error reporting endpoint not configured');
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(error),
    });

    if (!response.ok) {
      console.error(`Error reporting failed with status ${response.status}`);
    }
  } catch (fetchError) {
    console.error('Failed to report error to monitoring service:', fetchError);
  }
}

/**
 * Report error from error boundary
 */
export function reportBoundaryError(
  error: Error,
  errorInfo: React.ErrorInfo,
  componentName: string,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'high'
): void {
  const errorReport: ErrorReport = {
    type: 'error_boundary',
    component: componentName,
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo.componentStack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    severity,
  };

  if (import.meta.env.DEV) {
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
    console.error('Error report:', errorReport);
  }

  logErrorToStorage(errorReport);

  reportErrorToService(errorReport).catch((e) => {
    console.error('Error reporting service error:', e);
  });
}

/**
 * Report runtime error (non-render errors)
 */
export function reportRuntimeError(
  error: Error,
  context: {
    action?: string;
    component?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    metadata?: Record<string, unknown>;
  } = {}
): void {
  const errorReport: ErrorReport = {
    type: 'runtime_error',
    component: context.component,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href,
    severity: context.severity || 'medium',
    metadata: {
      action: context.action,
      ...context.metadata,
    },
  };

  if (import.meta.env.DEV) {
    console.error('Runtime error:', error);
    console.error('Error report:', errorReport);
  }

  logErrorToStorage(errorReport);
  reportErrorToService(errorReport).catch((e) => {
    console.error('Error reporting service error:', e);
  });
}

/**
 * Get all stored errors from localStorage
 */
export function getStoredErrors(): ErrorReport[] {
  try {
    return JSON.parse(localStorage.getItem('app_errors') || '[]');
  } catch (e) {
    console.error('Failed to parse stored errors:', e);
    return [];
  }
}

/**
 * Clear all stored errors
 */
export function clearStoredErrors(): void {
  try {
    localStorage.removeItem('app_errors');
  } catch (e) {
    console.error('Failed to clear stored errors:', e);
  }
}

/**
 * Get errors by severity level
 */
export function getErrorsBySeverity(
  severity: 'low' | 'medium' | 'high' | 'critical'
): ErrorReport[] {
  return getStoredErrors().filter((e) => e.severity === severity);
}

/**
 * Get errors for a specific component
 */
export function getErrorsByComponent(componentName: string): ErrorReport[] {
  return getStoredErrors().filter((e) => e.component === componentName);
}

/**
 * Get error statistics
 */
export function getErrorStatistics(): {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  byComponent: Record<string, number>;
} {
  const errors = getStoredErrors();

  return {
    total: errors.length,
    byType: errors.reduce(
      (acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    bySeverity: errors.reduce(
      (acc, e) => {
        const sev = e.severity || 'unknown';
        acc[sev] = (acc[sev] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    byComponent: errors.reduce(
      (acc, e) => {
        const comp = e.component || 'Unknown';
        acc[comp] = (acc[comp] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
  };
}

/**
 * Export errors as JSON for debugging
 */
export function exportErrorsAsJSON(): string {
  const errors = getStoredErrors();
  const stats = getErrorStatistics();

  return JSON.stringify(
    {
      exportDate: new Date().toISOString(),
      statistics: stats,
      errors,
    },
    null,
    2
  );
}

/**
 * Download errors as a file
 */
export function downloadErrorsReport(): void {
  const data = exportErrorsAsJSON();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `error-report-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Install global error handler
 */
export function installGlobalErrorHandler(): void {
  window.addEventListener('error', (event) => {
    if (event.error) {
      reportRuntimeError(event.error, {
        action: 'uncaught_error',
        severity: 'high',
      });
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason?.message ?? String(event.reason) ?? 'Unknown Promise rejection';
    const error = new Error(reason as string);
    reportRuntimeError(error, {
      action: 'unhandled_promise_rejection',
      severity: 'high',
      metadata: { reason: event.reason },
    });
  });
}
