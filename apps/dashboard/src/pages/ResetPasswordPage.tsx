import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

function validatePassword(password: string): PasswordValidation {
  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
}

function isPasswordValid(validation: PasswordValidation): boolean {
  return Object.values(validation).every(Boolean);
}

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const token = searchParams.get('token');
  const validation = validatePassword(password);

  if (!token) {
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
              background: '#fee2e2',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6l12 12" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Invalid Link</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            This password reset link is invalid or missing a token.
          </p>
          <div
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <Link
              to="/forgot-password"
              style={{
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Request a new reset link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setShowValidation(true);

    if (!isPasswordValid(validation)) {
      setError('Please ensure your password meets all requirements');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Password reset failed');
      }

      // Success - redirect to login
      navigate('/login', {
        replace: true,
        state: { message: 'Password reset successful! Please log in with your new password.' }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 440, background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)', display: 'grid', gap: '16px' }}>
        <div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Reset Password</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Enter your new password below
          </p>
        </div>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>New Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onFocus={() => setShowValidation(true)}
            placeholder="Enter new password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            style={{ font: 'inherit', fontSize: '16px', borderRadius: 8, border: '1px solid #cbd5e1', padding: '10px 12px', outline: 'none' }}
          />
        </label>

        {showValidation && password && (
          <div style={{ padding: '12px', background: '#f8fafc', borderRadius: 8, fontSize: '13px' }}>
            <div style={{ marginBottom: 8, fontWeight: 500, color: '#475569' }}>Password must contain:</div>
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: validation.minLength ? '#16a34a' : '#64748b' }}>
                <span>{validation.minLength ? '✓' : '○'}</span>
                <span>At least 8 characters</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: validation.hasUppercase ? '#16a34a' : '#64748b' }}>
                <span>{validation.hasUppercase ? '✓' : '○'}</span>
                <span>One uppercase letter</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: validation.hasLowercase ? '#16a34a' : '#64748b' }}>
                <span>{validation.hasLowercase ? '✓' : '○'}</span>
                <span>One lowercase letter</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: validation.hasNumber ? '#16a34a' : '#64748b' }}>
                <span>{validation.hasNumber ? '✓' : '○'}</span>
                <span>One number</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: validation.hasSpecialChar ? '#16a34a' : '#64748b' }}>
                <span>{validation.hasSpecialChar ? '✓' : '○'}</span>
                <span>One special character</span>
              </div>
            </div>
          </div>
        )}

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Confirm Password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            required
            disabled={isSubmitting}
            style={{ font: 'inherit', fontSize: '16px', borderRadius: 8, border: '1px solid #cbd5e1', padding: '10px 12px', outline: 'none' }}
          />
        </label>

        {error && (
          <div style={{ color: '#dc2626', background: '#fee2e2', padding: '10px 12px', borderRadius: 8, fontSize: '14px' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{ marginTop: '8px', padding: '12px', fontSize: '14px', fontWeight: 500, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? 'Resetting...' : 'Reset password'}
        </button>

        <p style={{ margin: 0, marginTop: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
          Remember your password?{' '}
          <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
