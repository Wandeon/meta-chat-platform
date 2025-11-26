import { jsx as _jsx } from "react/jsx-runtime";
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    return (_jsx(Button, { variant: "ghost", size: "icon", onClick: toggleTheme, "aria-label": `Switch to ${theme === 'light' ? 'dark' : 'light'} mode`, className: "transition-transform hover:scale-110", children: theme === 'light' ? (_jsx(Moon, { className: "h-5 w-5" })) : (_jsx(Sun, { className: "h-5 w-5" })) }));
}
//# sourceMappingURL=ThemeToggle.js.map