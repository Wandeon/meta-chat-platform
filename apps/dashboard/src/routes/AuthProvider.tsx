import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface TokenPayload {
  userId: string;
  tenantId: string;
  email: string;
  type: string;
  exp?: number;
}

interface AuthContextValue {
  apiKey: string | null;
  login: (apiKey: string) => void;
  logout: () => void;
  getUser: () => TokenPayload | null;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'meta-chat/auth-token';

// Add function to decode JWT
function decodeJWT(token: string): TokenPayload | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload;
  } catch {
    return null;
  }
}

// Add function to check if token is expired
function isTokenExpired(token: string): boolean {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Update AuthProvider state
  const [apiKey, setApiKey] = useState<string | null>(() => {
    const token = localStorage.getItem(STORAGE_KEY);
    if (token && isTokenExpired(token)) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return token;
  });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!apiKey) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, apiKey);
    }
  }, [apiKey]);

  const login = useCallback(
    (nextApiKey: string) => {
      setApiKey(nextApiKey);
      navigate(location.state?.from?.pathname ?? '/tenants', { replace: true });
    },
    [location.state, navigate],
  );

  const logout = useCallback(() => {
    setApiKey(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Add getUser function
  const getUser = useCallback(() => {
    if (!apiKey) return null;
    return decodeJWT(apiKey);
  }, [apiKey]);

  // Update context value
  const value = useMemo<AuthContextValue>(
    () => ({ apiKey, login, logout, getUser }),
    [apiKey, login, logout, getUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
