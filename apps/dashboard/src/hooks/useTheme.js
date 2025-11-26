import { useEffect, useState } from 'react';
export function useTheme() {
    const [theme, setTheme] = useState(() => {
        // SSR safety: Check if we're in a browser environment
        if (typeof window === 'undefined')
            return 'light';
        // Check localStorage first
        const stored = localStorage.getItem('theme');
        if (stored)
            return stored;
        // Check system preference
        if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });
    useEffect(() => {
        const root = document.documentElement;
        // Only manage the 'dark' class (Tailwind's darkMode: ["class"])
        if (theme === 'dark') {
            root.classList.add('dark');
        }
        else {
            root.classList.remove('dark');
        }
        // Persist to localStorage
        localStorage.setItem('theme', theme);
    }, [theme]);
    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };
    return { theme, setTheme, toggleTheme };
}
//# sourceMappingURL=useTheme.js.map