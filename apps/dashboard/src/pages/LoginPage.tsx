import { useState, type FormEvent } from 'react';
import { useAuth } from '../routes/AuthProvider';

export function LoginPage() {
  const { login } = useAuth();
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) {
      setError('Enter a valid admin JWT');
      return;
    }
    try {
      login(token.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    }
  };

  return (
    <div style={{ display: 'grid', placeItems: 'center', minHeight: '100vh' }}>
      <form
        onSubmit={handleSubmit}
        style={{
          width: '100%',
          maxWidth: 360,
          background: '#fff',
          padding: '32px',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -24px rgba(15,23,42,.45)',
          display: 'grid',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ marginBottom: 8 }}>Meta Chat Admin</h1>
          <p style={{ margin: 0, color: '#475569' }}>Enter the admin JWT issued by the platform.</p>
        </div>
        <label style={{ display: 'grid', gap: 6 }}>
          <span>Admin JWT</span>
          <textarea
            value={token}
            onChange={(event) => setToken(event.target.value)}
            placeholder="eyJhbGciOiJI..."
            rows={5}
            style={{
              font: 'inherit',
              borderRadius: 12,
              border: '1px solid rgba(148, 163, 184, 0.6)',
              padding: '12px',
            }}
          />
        </label>
        {error && <span style={{ color: '#b91c1c' }}>{error}</span>}
        <button className="primary-button" type="submit">
          Sign in
        </button>
      </form>
    </div>
  );
}
