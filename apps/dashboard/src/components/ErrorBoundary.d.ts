import React, { ReactNode, ReactElement } from 'react';
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
export declare class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props);
    static getDerivedStateFromError(error: Error): Partial<State>;
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    private handleRetry;
    private handleReload;
    render(): ReactNode;
}
export {};
//# sourceMappingURL=ErrorBoundary.d.ts.map