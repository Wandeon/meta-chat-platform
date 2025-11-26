import { useState, type FormEvent } from 'react';
import { useAuth } from '../routes/AuthProvider';
import { Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Login failed');
      }

      const data = await response.json();
      login(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh', background: '#f8fafc', padding: '16px' }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 400, background: '#fff', padding: '32px', borderRadius: '16px', boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)', display: 'grid', gap: '16px' }}>
        <div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Welcome Back</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Sign in to your Meta Chat account
          </p>
        </div>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            disabled={isSubmitting}
            style={{ font: 'inherit', fontSize: '16px', borderRadius: 8, border: '1px solid #cbd5e1', padding: '10px 12px', outline: 'none' }}
          />
        </label>

        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            autoComplete="current-password"
            disabled={isSubmitting}
            style={{ font: 'inherit', fontSize: '16px', borderRadius: 8, border: '1px solid #cbd5e1', padding: '10px 12px', outline: 'none' }}
          />
        </label>

        <Link to="/forgot-password" style={{ fontSize: '14px', color: '#3b82f6', textDecoration: 'none' }}>
          Forgot password?
        </Link>

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
          {isSubmitting ? 'Signing in...' : 'Sign in'}
        </button>

        <p style={{ margin: 0, marginTop: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link to="/signup" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
