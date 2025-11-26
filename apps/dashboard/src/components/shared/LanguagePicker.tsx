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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    localStorage.setItem('language', code);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="gap-2"
        aria-label="Select language"
      >
        <span>{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.label}</span>
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md border border-border bg-background shadow-lg z-50">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className="w-full px-4 py-2 text-left hover:bg-accent hover:text-accent-foreground flex items-center gap-2 transition-colors first:rounded-t-md last:rounded-b-md"
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
              {lang.code === i18n.language && (
                <span className="ml-auto text-primary">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
