import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
];
export function LanguagePicker() {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];
    const changeLanguage = (code) => {
        i18n.changeLanguage(code);
        localStorage.setItem('language', code);
        setIsOpen(false);
    };
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    return (_jsxs("div", { className: "relative", ref: dropdownRef, children: [_jsxs(Button, { variant: "ghost", size: "sm", onClick: () => setIsOpen(!isOpen), className: "gap-2", "aria-label": "Select language", children: [_jsx("span", { children: currentLanguage.flag }), _jsx("span", { className: "hidden sm:inline", children: currentLanguage.label }), _jsx(ChevronDown, { className: "h-4 w-4" })] }), isOpen && (_jsx("div", { className: "absolute right-0 mt-2 w-48 rounded-md border border-border bg-background shadow-lg z-50", children: languages.map((lang) => (_jsxs("button", { onClick: () => changeLanguage(lang.code), className: "w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors first:rounded-t-md last:rounded-b-md", children: [_jsx("span", { children: lang.flag }), _jsx("span", { children: lang.label }), lang.code === i18n.language && (_jsx("span", { className: "ml-auto text-primary", children: "\u2713" }))] }, lang.code))) }))] }));
}
//# sourceMappingURL=LanguagePicker.js.map