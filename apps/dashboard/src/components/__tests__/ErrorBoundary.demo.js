import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Error Boundary Demo Component
 */
export function ErrorBoundaryDemo() {
    const shouldThrowError = window.__DEMO_THROW_ERROR__;
    if (shouldThrowError) {
        throw new Error('Demo error thrown by ErrorBoundaryDemo. ' +
            'Run: delete window.__DEMO_THROW_ERROR__; and click Try Again to recover.');
    }
    return (_jsx("div", { style: { padding: '20px', textAlign: 'center' }, children: _jsx("p", { children: "Error Boundary Demo" }) }));
}
//# sourceMappingURL=ErrorBoundary.demo.js.map