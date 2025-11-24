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
  token: string | null;
  login: (token: string) => void;
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
  const [token, setToken] = useState<string | null>(() => {
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
    if (!token) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, token);
    }
  }, [token]);

  const login = useCallback(
    (nextToken: string) => {
      setToken(nextToken);
      navigate(location.state?.from?.pathname ?? '/tenants', { replace: true });
    },
    [location.state, navigate],
  );

  const logout = useCallback(() => {
    setToken(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Add getUser function
  const getUser = useCallback(() => {
    if (!token) return null;
    return decodeJWT(token);
  }, [token]);

  // Update context value
  const value = useMemo<AuthContextValue>(
    () => ({ token, login, logout, getUser }),
    [token, login, logout, getUser]
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
