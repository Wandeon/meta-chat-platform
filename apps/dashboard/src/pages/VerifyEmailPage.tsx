import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

type VerificationStatus = 'verifying' | 'success' | 'error';

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setError('No verification token provided');
        return;
      }

      try {
        const response = await fetch(
          `${API_BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
          {
            method: 'GET',
          }
        );

        if (!response.ok) {
          let errorMessage: string;
          try {
            const errorData = await response.json();
            errorMessage = errorData.error?.message || errorData.error || `Verification failed with status ${response.status}`;
          } catch {
            errorMessage = `Verification failed with status ${response.status}`;
          }
          throw new Error(errorMessage);
        }

        setStatus('success');
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', { replace: true });
        }, 2000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Unable to verify email');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  if (status === 'verifying') {
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
            <div
              style={{
                width: 32,
                height: 32,
                border: '3px solid #3b82f6',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Verifying Email</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>
            Please wait while we verify your email address...
          </p>
          <style>
            {`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      </div>
    );
  }

  if (status === 'success') {
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
              <path d="M20 6L9 17L4 12" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Email Verified!</h1>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>
            Your email has been successfully verified. Your account is now active and you can log in.
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
              Go to login now
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
        <h1 style={{ marginBottom: 8, fontSize: '24px' }}>Verification Failed</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5', marginBottom: 16 }}>
          {error || 'Unable to verify your email. The link may be expired or invalid.'}
        </p>
        <div
          style={{
            marginTop: 24,
            paddingTop: 24,
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Link
            to="/signup"
            style={{
              color: '#3b82f6',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            Sign up again
          </Link>
          <Link
            to="/login"
            style={{
              color: '#64748b',
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Return to login
          </Link>
        </div>
      </div>
    </div>
  );
}
