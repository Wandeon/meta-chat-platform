import { type ReactNode } from 'react';
interface AuthContextValue {
    apiKey: string | null;
    login: (apiKey: string) => void;
    logout: () => void;
}
export declare function AuthProvider({ children }: {
    children: ReactNode;
}): import("react/jsx-runtime").JSX.Element;
export declare function useAuth(): AuthContextValue;
export {};
//# sourceMappingURL=AuthProvider.d.ts.map