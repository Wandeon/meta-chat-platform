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

interface User {
  id: string;
  email: string;
  name: string;
  tenantId?: string;
  role?: string;
}

interface AuthContextValue {
  apiKey: string | null;
  user: User | null;
  isAdmin: boolean;
  login: (token: string, user?: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'meta-chat/auth-token';
const USER_KEY = 'meta-chat/user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null;
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Admin users have tokens starting with 'adm_'
  const isAdmin = useMemo(() => {
    return apiKey?.startsWith('adm_') ?? false;
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(USER_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, apiKey);
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      }
    }
  }, [apiKey, user]);

  const login = useCallback(
    (token: string, userData?: User) => {
      setApiKey(token);
      if (userData) {
        setUser(userData);
      }
      
      // Determine redirect based on user type
      const isAdminToken = token.startsWith('adm_');
      const defaultPath = isAdminToken ? '/tenants' : '/documents';
      const redirectPath = location.state?.from?.pathname ?? defaultPath;
      
      navigate(redirectPath, { replace: true });
    },
    [location.state, navigate],
  );

  const logout = useCallback(() => {
    setApiKey(null);
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  const value = useMemo<AuthContextValue>(
    () => ({ apiKey, user, isAdmin, login, logout }), 
    [apiKey, user, isAdmin, login, logout]
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
