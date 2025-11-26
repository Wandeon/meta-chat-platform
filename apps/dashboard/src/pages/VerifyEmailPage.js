import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
export function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying');
    const [error, setError] = useState(null);
    useEffect(() => {
        const verifyEmail = async () => {
            const token = searchParams.get('token');
            if (!token) {
                setStatus('error');
                setError('No verification token provided');
                return;
            }
            try {
                const response = await fetch(`${API_BASE}/api/auth/verify-email`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ token }),
                });
                if (!response.ok) {
                    let errorMessage;
                    try {
                        const errorData = await response.json();
                        errorMessage = errorData.error?.message || `Verification failed with status ${response.status}`;
                    }
                    catch {
                        errorMessage = `Verification failed with status ${response.status}`;
                    }
                    throw new Error(errorMessage);
                }
                setStatus('success');
                // Redirect to dashboard after 2 seconds
                setTimeout(() => {
                    navigate('/login', { replace: true });
                }, 2000);
            }
            catch (err) {
                setStatus('error');
                setError(err instanceof Error ? err.message : 'Unable to verify email');
            }
        };
        verifyEmail();
    }, [searchParams, navigate]);
    if (status === 'verifying') {
        return (_jsx("div", { style: { display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }, children: _jsxs("div", { style: {
                    width: '100%',
                    maxWidth: 400,
                    background: '#fff',
                    padding: '32px',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)',
                    textAlign: 'center',
                }, children: [_jsx("div", { style: {
                            width: 64,
                            height: 64,
                            margin: '0 auto 24px',
                            borderRadius: '50%',
                            background: '#dbeafe',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: _jsx("div", { style: {
                                width: 32,
                                height: 32,
                                border: '3px solid #3b82f6',
                                borderTopColor: 'transparent',
                                borderRadius: '50%',
                                animation: 'spin 1s linear infinite',
                            } }) }), _jsx("h1", { style: { marginBottom: 8, fontSize: '24px' }, children: "Verifying Email" }), _jsx("p", { style: { margin: 0, color: '#64748b', fontSize: '14px' }, children: "Please wait while we verify your email address..." }), _jsx("style", { children: `
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            ` })] }) }));
    }
    if (status === 'success') {
        return (_jsx("div", { style: { display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }, children: _jsxs("div", { style: {
                    width: '100%',
                    maxWidth: 400,
                    background: '#fff',
                    padding: '32px',
                    borderRadius: '16px',
                    boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)',
                    textAlign: 'center',
                }, children: [_jsx("div", { style: {
                            width: 64,
                            height: 64,
                            margin: '0 auto 24px',
                            borderRadius: '50%',
                            background: '#dcfce7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }, children: _jsx("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M20 6L9 17L4 12", stroke: "#16a34a", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("h1", { style: { marginBottom: 8, fontSize: '24px' }, children: "Email Verified!" }), _jsx("p", { style: { margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }, children: "Your email has been successfully verified. You will be redirected to the login page shortly." }), _jsx("div", { style: { marginTop: 24, paddingTop: 24, borderTop: '1px solid #e2e8f0' }, children: _jsx(Link, { to: "/login", style: {
                                color: '#3b82f6',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: 500,
                            }, children: "Go to login now" }) })] }) }));
    }
    return (_jsx("div", { style: { display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }, children: _jsxs("div", { style: {
                width: '100%',
                maxWidth: 400,
                background: '#fff',
                padding: '32px',
                borderRadius: '16px',
                boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)',
                textAlign: 'center',
            }, children: [_jsx("div", { style: {
                        width: 64,
                        height: 64,
                        margin: '0 auto 24px',
                        borderRadius: '50%',
                        background: '#fee2e2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }, children: _jsx("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M18 6L6 18M6 6l12 12", stroke: "#dc2626", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("h1", { style: { marginBottom: 8, fontSize: '24px' }, children: "Verification Failed" }), _jsx("p", { style: { margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5', marginBottom: 16 }, children: error || 'Unable to verify your email. The link may be expired or invalid.' }), _jsxs("div", { style: {
                        marginTop: 24,
                        paddingTop: 24,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }, children: [_jsx(Link, { to: "/signup", style: {
                                color: '#3b82f6',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: 500,
                            }, children: "Sign up again" }), _jsx(Link, { to: "/login", style: {
                                color: '#64748b',
                                textDecoration: 'none',
                                fontSize: '14px',
                            }, children: "Return to login" })] })] }) }));
}
//# sourceMappingURL=VerifyEmailPage.js.map