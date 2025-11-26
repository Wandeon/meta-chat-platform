import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { reportBoundaryError } from '../utils/errorReporting';
/**
 * ErrorBoundary component that catches React errors in the component tree
 * and displays a user-friendly error message with recovery options
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
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
    handleRetry = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };
    handleReload = () => {
        window.location.reload();
    };
    render() {
        if (this.state.hasError) {
            // Use custom fallback if provided
            if (this.props.fallback) {
                return this.props.fallback;
            }
            // Default error UI
            return (_jsx("div", { className: "error-boundary-container", children: _jsxs("div", { className: "error-boundary-content", children: [_jsx("div", { className: "error-icon", children: "\u26A0\uFE0F" }), _jsx("h1", { children: "Oops! Something went wrong" }), _jsx("p", { className: "error-message", children: this.state.error?.message || 'An unexpected error occurred' }), _jsxs("details", { className: "error-details", children: [_jsx("summary", { children: "Error Details" }), _jsx("pre", { className: "error-stack", children: _jsxs("code", { children: [this.state.error?.stack, this.state.errorInfo?.componentStack && (_jsxs(_Fragment, { children: ['\n\nComponent Stack:', this.state.errorInfo.componentStack] }))] }) })] }), _jsxs("div", { className: "error-actions", children: [_jsx("button", { onClick: this.handleRetry, className: "btn btn-primary", type: "button", children: "Try Again" }), _jsx("button", { onClick: this.handleReload, className: "btn btn-secondary", type: "button", children: "Reload Page" })] }), _jsx("p", { className: "error-support", children: "If this problem persists, please contact support or check the browser console for more details." })] }) }));
        }
        return this.props.children;
    }
}
//# sourceMappingURL=ErrorBoundary.js.map