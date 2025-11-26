import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NAV_LINKS } from '@/constants/navigation';

interface DesktopSidebarProps {
  onLogout: () => void;
}

export function DesktopSidebar({ onLogout }: DesktopSidebarProps) {
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <aside className="hidden md:flex md:flex-col w-60 border-r border-border bg-card">
      <div className="p-6">
        <h1 className="text-xl font-bold text-foreground">Meta Chat</h1>
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_LINKS.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname.startsWith(link.path);

          return (
            <Link
              key={link.path}
              to={link.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{t(link.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span>{t('nav.logout')}</span>
        </button>
      </div>
    </aside>
  );
}
