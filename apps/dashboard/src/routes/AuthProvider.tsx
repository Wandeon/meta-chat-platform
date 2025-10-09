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

interface AuthContextValue {
  apiKey: string | null;
  login: (apiKey: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'meta-chat/admin-api-key';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
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

  const value = useMemo<AuthContextValue>(() => ({ apiKey, login, logout }), [login, logout, apiKey]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
