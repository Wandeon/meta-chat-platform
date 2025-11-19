import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): { valid: boolean; message?: string } => {
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
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one special character' };
    }
    return { valid: true };
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }

    if (!formData.companyName.trim()) {
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
          name: formData.name.trim(),
          companyName: formData.companyName.trim(),
          email: formData.email.trim(),
          password: formData.password,
        }),
      });

      if (!response.ok) {
        let errorMessage: string;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || `Signup failed with status ${response.status}`;
        } catch {
          errorMessage = `Signup failed with status ${response.status}`;
        }
        throw new Error(errorMessage);
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete signup');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  if (success) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }}>
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            background: '#fff',
            padding: '32px',
            borderRadius: '16px',
            boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 24px',
              borderRadius: '50%',
              background: '#dcfce7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 6L9 17L4 12" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Check Your Email</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            We've sent a verification link to <strong>{formData.email}</strong>. Please check your email and click the link to verify your account.
          </p>
          <div style={{ marginTop: 24, paddingTop: 24, borderTop: '1px solid #e2e8f0' }}>
            <Link
              to="/login"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Return to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 400,
          background: '#fff',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)',
          display: 'grid',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Create Account</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Sign up for Meta Chat Platform
          </p>
        </div>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Full Name</span>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="John Doe"
            autoComplete="name"
            disabled={isSubmitting}
            style={{
              font: 'inherit',
              fontSize: '16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color 0.2s',
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Company Name</span>
          <input
            type="text"
            value={formData.companyName}
            onChange={(e) => handleChange('companyName', e.target.value)}
            placeholder="Your Company"
            autoComplete="organization"
            disabled={isSubmitting}
            style={{
              font: 'inherit',
              fontSize: '16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color 0.2s',
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Email</span>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={isSubmitting}
            style={{
              font: 'inherit',
              fontSize: '16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color 0.2s',
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Password</span>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            placeholder="At least 8 characters"
            autoComplete="new-password"
            disabled={isSubmitting}
            style={{
              font: 'inherit',
              fontSize: '16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color 0.2s',
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Must include uppercase, lowercase, number, and special character
          </span>
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Confirm Password</span>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            placeholder="Re-enter your password"
            autoComplete="new-password"
            disabled={isSubmitting}
            style={{
              font: 'inherit',
              fontSize: '16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color 0.2s',
              opacity: isSubmitting ? 0.6 : 1,
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
        </label>

        <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={formData.terms}
            onChange={(e) => handleChange('terms', e.target.checked)}
            disabled={isSubmitting}
            style={{
              marginTop: 2,
              cursor: 'pointer',
              opacity: isSubmitting ? 0.6 : 1,
            }}
          />
          <span style={{ fontSize: '14px', color: '#64748b' }}>
            I accept the terms and conditions
          </span>
        </label>

        {error && (
          <div
            style={{
              color: '#dc2626',
              background: '#fee2e2',
              padding: '10px 12px',
              borderRadius: 8,
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <button
          className="primary-button"
          type="submit"
          disabled={isSubmitting}
          style={{
            marginTop: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 500,
            opacity: isSubmitting ? 0.6 : 1,
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
          }}
        >
          {isSubmitting ? 'Creating account...' : 'Create account'}
        </button>

        <p style={{ margin: 0, marginTop: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link
            to="/login"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
