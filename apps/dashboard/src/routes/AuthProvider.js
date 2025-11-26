import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
const AuthContext = createContext(undefined);
const STORAGE_KEY = 'meta-chat/admin-api-key';
export function AuthProvider({ children }) {
    const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY));
    const navigate = useNavigate();
    const location = useLocation();
    useEffect(() => {
        if (!apiKey) {
            localStorage.removeItem(STORAGE_KEY);
        }
        else {
            localStorage.setItem(STORAGE_KEY, apiKey);
        }
    }, [apiKey]);
    const login = useCallback((nextApiKey) => {
        setApiKey(nextApiKey);
        navigate(location.state?.from?.pathname ?? '/tenants', { replace: true });
    }, [location.state, navigate]);
    const logout = useCallback(() => {
        setApiKey(null);
        navigate('/login', { replace: true });
    }, [navigate]);
    const value = useMemo(() => ({ apiKey, login, logout }), [login, logout, apiKey]);
    return _jsx(AuthContext.Provider, { value: value, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
//# sourceMappingURL=AuthProvider.js.map