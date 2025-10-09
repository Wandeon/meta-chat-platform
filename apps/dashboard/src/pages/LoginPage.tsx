import { useState, type FormEvent } from 'react';
import { useAuth } from '../routes/AuthProvider';

export function LoginPage() {
  const { login } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!apiKey.trim()) {
      setError('Enter a valid admin API key');
      return;
    }
    if (!apiKey.startsWith('adm_')) {
      setError('Admin API keys must start with "adm_"');
      return;
    }
    try {
      login(apiKey.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to login');
    }
  };

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
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Meta Chat Admin</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Enter your admin API key to access the dashboard.
          </p>
        </div>
        <label style={{ display: 'grid', gap: 8 }}>
          <span style={{ fontWeight: 500, fontSize: '14px' }}>Admin API Key</span>
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="adm_..."
            autoComplete="off"
            style={{
              font: 'inherit',
              fontSize: '16px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              padding: '10px 12px',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
            onBlur={(e) => (e.target.style.borderColor = '#cbd5e1')}
          />
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
          style={{
            marginTop: '8px',
            padding: '12px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Sign in
        </button>
        <p style={{ margin: 0, marginTop: '8px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>
          Admin API keys can be generated via the REST API or database.
        </p>
      </form>
    </div>
  );
}
