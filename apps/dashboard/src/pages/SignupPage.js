import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Link } from 'react-router-dom';
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
export function SignupPage() {
    const [formData, setFormData] = useState({
        company: '',
        email: '',
        password: '',
        confirmPassword: '',
        terms: false,
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };
    const validatePassword = (password) => {
        if (password.length < 8) {
            return { valid: false, message: 'Password must be at least 8 characters long' };
        }
        if (!/[A-Z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one uppercase letter' };
        }
        if (!/[a-z]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one lowercase letter' };
        }
        if (!/[0-9]/.test(password)) {
            return { valid: false, message: 'Password must contain at least one number' };
        }
        return { valid: true };
    };
    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);
        // Client-side validation
        if (!formData.company.trim()) {
            setError('Company name is required');
            return;
        }
        if (!formData.email.trim()) {
            setError('Email is required');
            return;
        }
        if (!validateEmail(formData.email)) {
            setError('Please enter a valid email address');
            return;
        }
        const passwordValidation = validatePassword(formData.password);
        if (!passwordValidation.valid) {
            setError(passwordValidation.message || 'Invalid password');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }
        if (!formData.terms) {
            setError('You must accept the terms and conditions');
            return;
        }
        // Submit to API
        setIsSubmitting(true);
        try {
            const response = await fetch(`${API_BASE}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    company: formData.company.trim(),
                    email: formData.email.trim(),
                    password: formData.password,
                }),
            });
            if (!response.ok) {
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error?.message || `Signup failed with status ${response.status}`;
                }
                catch {
                    errorMessage = `Signup failed with status ${response.status}`;
                }
                throw new Error(errorMessage);
            }
            setSuccess(true);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to complete signup');
        }
        finally {
            setIsSubmitting(false);
        }
    };
    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setError(null);
    };
    if (success) {
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
                        }, children: _jsx("svg", { width: "32", height: "32", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M20 6L9 17L4 12", stroke: "#16a34a", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }) }), _jsx("h1", { style: { marginBottom: 8, fontSize: '24px' }, children: "Check Your Email" }), _jsxs("p", { style: { margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }, children: ["We've sent a verification link to ", _jsx("strong", { children: formData.email }), ". Please check your email and click the link to verify your account."] }), _jsx("div", { style: { marginTop: 24, paddingTop: 24, borderTop: '1px solid #e2e8f0' }, children: _jsx(Link, { to: "/login", style: {
                                color: '#3b82f6',
                                textDecoration: 'none',
                                fontSize: '14px',
                                fontWeight: 500,
                            }, children: "Return to login" }) })] }) }));
    }
    return (_jsx("div", { style: { display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }, children: _jsxs("form", { onSubmit: handleSubmit, style: {
                width: '100%',
                maxWidth: 400,
                background: '#fff',
                padding: '32px',
                borderRadius: '16px',
                boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)',
                display: 'grid',
                gap: '16px',
            }, children: [_jsxs("div", { children: [_jsx("h1", { style: { marginBottom: 8, fontSize: '24px' }, children: "Create Account" }), _jsx("p", { style: { margin: 0, color: '#64748b', fontSize: '14px' }, children: "Sign up for Meta Chat Platform" })] }), _jsxs("label", { style: { display: 'grid', gap: 8 }, children: [_jsx("span", { style: { fontWeight: 500, fontSize: '14px' }, children: "Company Name" }), _jsx("input", { type: "text", value: formData.company, onChange: (e) => handleChange('company', e.target.value), placeholder: "Your Company", autoComplete: "organization", disabled: isSubmitting, style: {
                                font: 'inherit',
                                fontSize: '16px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                padding: '10px 12px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                opacity: isSubmitting ? 0.6 : 1,
                            }, onFocus: (e) => (e.target.style.borderColor = '#3b82f6'), onBlur: (e) => (e.target.style.borderColor = '#cbd5e1') })] }), _jsxs("label", { style: { display: 'grid', gap: 8 }, children: [_jsx("span", { style: { fontWeight: 500, fontSize: '14px' }, children: "Email" }), _jsx("input", { type: "email", value: formData.email, onChange: (e) => handleChange('email', e.target.value), placeholder: "you@company.com", autoComplete: "email", disabled: isSubmitting, style: {
                                font: 'inherit',
                                fontSize: '16px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                padding: '10px 12px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                opacity: isSubmitting ? 0.6 : 1,
                            }, onFocus: (e) => (e.target.style.borderColor = '#3b82f6'), onBlur: (e) => (e.target.style.borderColor = '#cbd5e1') })] }), _jsxs("label", { style: { display: 'grid', gap: 8 }, children: [_jsx("span", { style: { fontWeight: 500, fontSize: '14px' }, children: "Password" }), _jsx("input", { type: "password", value: formData.password, onChange: (e) => handleChange('password', e.target.value), placeholder: "At least 8 characters", autoComplete: "new-password", disabled: isSubmitting, style: {
                                font: 'inherit',
                                fontSize: '16px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                padding: '10px 12px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                opacity: isSubmitting ? 0.6 : 1,
                            }, onFocus: (e) => (e.target.style.borderColor = '#3b82f6'), onBlur: (e) => (e.target.style.borderColor = '#cbd5e1') })] }), _jsxs("label", { style: { display: 'grid', gap: 8 }, children: [_jsx("span", { style: { fontWeight: 500, fontSize: '14px' }, children: "Confirm Password" }), _jsx("input", { type: "password", value: formData.confirmPassword, onChange: (e) => handleChange('confirmPassword', e.target.value), placeholder: "Re-enter your password", autoComplete: "new-password", disabled: isSubmitting, style: {
                                font: 'inherit',
                                fontSize: '16px',
                                borderRadius: 8,
                                border: '1px solid #cbd5e1',
                                padding: '10px 12px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                opacity: isSubmitting ? 0.6 : 1,
                            }, onFocus: (e) => (e.target.style.borderColor = '#3b82f6'), onBlur: (e) => (e.target.style.borderColor = '#cbd5e1') })] }), _jsxs("label", { style: { display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }, children: [_jsx("input", { type: "checkbox", checked: formData.terms, onChange: (e) => handleChange('terms', e.target.checked), disabled: isSubmitting, style: {
                                marginTop: 2,
                                cursor: 'pointer',
                                opacity: isSubmitting ? 0.6 : 1,
                            } }), _jsx("span", { style: { fontSize: '14px', color: '#64748b' }, children: "I accept the terms and conditions" })] }), error && (_jsx("div", { style: {
                        color: '#dc2626',
                        background: '#fee2e2',
                        padding: '10px 12px',
                        borderRadius: 8,
                        fontSize: '14px',
                    }, children: error })), _jsx("button", { className: "primary-button", type: "submit", disabled: isSubmitting, style: {
                        marginTop: '8px',
                        padding: '12px',
                        fontSize: '14px',
                        fontWeight: 500,
                        opacity: isSubmitting ? 0.6 : 1,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    }, children: isSubmitting ? 'Creating account...' : 'Create account' }), _jsxs("p", { style: { margin: 0, marginTop: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }, children: ["Already have an account?", ' ', _jsx(Link, { to: "/login", style: {
                                color: '#3b82f6',
                                textDecoration: 'none',
                                fontWeight: 500,
                            }, children: "Sign in" })] })] }) }));
}
//# sourceMappingURL=SignupPage.js.map