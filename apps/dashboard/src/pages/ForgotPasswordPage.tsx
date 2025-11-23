import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      // Always show success to prevent email enumeration
      setSubmitted(true);
    } catch (err) {
      // Even on error, show success to prevent enumeration
      setSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
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
              background: '#dbeafe',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width=32 height=32 viewBox=0 0 24 24 fill=none xmlns=http://www.w3.org/2000/svg>
              <path d=M3 8L10.89 13.26C11.23 13.47 11.61 13.59 12 13.59C12.39 13.59 12.77 13.47 13.11 13.26L21 8M5 19H19C19.53 19 20.04 18.79 20.41 18.41C20.79 18.04 21 17.53 21 17V7C21 6.47 20.79 5.96 20.41 5.59C20.04 5.21 19.53 5 19 5H5C4.47 5 3.96 5.21 3.59 5.59C3.21 5.96 3 6.47 3 7V17C3 17.53 3.21 18.04 3.59 18.41C3.96 18.79 4.47 19 5 19Z stroke=#3b82f6 strokeWidth=2 strokeLinecap=round strokeLinejoin=round/>
            </svg>
          </div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Check Your Email</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            If an account exists with <strong>{email}</strong>, you will receive a password reset link shortly.
          </p>
          <div
            style={{
              marginTop: 24,
              paddingTop: 24,
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <Link
              to=/login
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
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400, background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)', display: 'grid', gap: '16px' }}>
        <div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Forgot Password?</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Email</span>
          <input
            type=email
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder=you@company.com
            autoComplete=email
            required
            disabled={isSubmitting}
            style={{ font: 'inherit', fontSize: '16px', borderRadius: 8, border: '1px solid #cbd5e1', padding: '10px 12px', outline: 'none' }}
          />
        </label>

        <button
          type=submit
          disabled={isSubmitting}
          style={{ marginTop: '8px', padding: '12px', fontSize: '14px', fontWeight: 500, background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 8, cursor: isSubmitting ? 'not-allowed' : 'pointer', opacity: isSubmitting ? 0.6 : 1 }}
        >
          {isSubmitting ? 'Sending...' : 'Send reset link'}
        </button>

        <p style={{ margin: 0, marginTop: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
          Remember your password?{' '}
          <Link to=/login style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
