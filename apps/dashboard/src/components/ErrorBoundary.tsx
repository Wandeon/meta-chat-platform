import React, { ReactNode, ReactElement } from 'react';
import { reportBoundaryError } from '../utils/errorReporting';

interface Props {
  children: ReactNode;
  fallback?: ReactElement;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches React errors in the component tree
 * and displays a user-friendly error message with recovery options
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });

    // Call parent error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to monitoring service using centralized error reporting
    const componentName = this.props.componentName || 'Unknown Component';
    const severity = this.props.severity || 'high';
    reportBoundaryError(error, errorInfo, componentName, severity);
  }

  private handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-content">
            <div className="error-icon">⚠️</div>
            <h1>Oops! Something went wrong</h1>
            <p className="error-message">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>

            <details className="error-details">
              <summary>Error Details</summary>
              <pre className="error-stack">
                <code>
                  {this.state.error?.stack}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </code>
              </pre>
            </details>

            <div className="error-actions">
              <button
                onClick={this.handleRetry}
                className="btn btn-primary"
                type="button"
              >
                Try Again
              </button>
              <button
                onClick={this.handleReload}
                className="btn btn-secondary"
                type="button"
              >
                Reload Page
              </button>
            </div>

            <p className="error-support">
              If this problem persists, please contact support or check the browser console for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
