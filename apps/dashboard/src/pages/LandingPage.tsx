import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '48px',
        maxWidth: '500px',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: '#1e293b' }}>
          Meta Chat Platform
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#64748b', marginBottom: '32px' }}>
          Build and deploy AI-powered chat experiences with ease
        </p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <Link to="/login" className="primary-button" style={{ textDecoration: 'none' }}>
            Sign In
          </Link>
          <Link to="/signup" className="secondary-button" style={{ textDecoration: 'none' }}>
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
