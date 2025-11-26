import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export function LandingPage() {
    return (_jsx("div", { style: {
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }, children: _jsxs("div", { style: {
                background: 'white',
                borderRadius: '12px',
                padding: '48px',
                maxWidth: '500px',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }, children: [_jsx("h1", { style: { fontSize: '2.5rem', marginBottom: '16px', color: '#1e293b' }, children: "Meta Chat Platform" }), _jsx("p", { style: { fontSize: '1.125rem', color: '#64748b', marginBottom: '32px' }, children: "Build and deploy AI-powered chat experiences with ease" }), _jsxs("div", { style: { display: 'flex', gap: '16px', justifyContent: 'center' }, children: [_jsx(Link, { to: "/login", className: "primary-button", style: { textDecoration: 'none' }, children: "Sign In" }), _jsx(Link, { to: "/signup", className: "secondary-button", style: { textDecoration: 'none' }, children: "Create Account" })] })] }) }));
}
//# sourceMappingURL=LandingPage.js.map