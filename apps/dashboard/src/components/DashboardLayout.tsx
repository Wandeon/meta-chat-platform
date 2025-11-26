import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../routes/AuthProvider';
import { clsx } from 'clsx';
import { ThemeToggle } from './shared/ThemeToggle';
import { LanguagePicker } from './shared/LanguagePicker';
import { useTranslation } from 'react-i18next';

const NAV_LINKS = [
  { to: '/tenants', labelKey: 'nav.tenants' },
  { to: '/analytics', labelKey: 'nav.analytics' },
  { to: '/mcp-servers', labelKey: 'nav.mcpServers' },
  { to: '/channels', labelKey: 'nav.channels' },
  { to: '/documents', labelKey: 'nav.documents' },
  { to: '/conversations', labelKey: 'nav.conversations' },
  { to: '/webhooks', labelKey: 'nav.webhooks' },
  { to: '/testing', labelKey: 'nav.testing' },
  { to: '/health', labelKey: 'nav.health' },
];

export function DashboardLayout() {
  const { logout } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <span className="dot" /> Meta Chat Admin
        </div>
        <nav>
          <ul>
            {NAV_LINKS.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <li key={link.to}>
                  <Link className={clsx({ active })} to={link.to}>
                    {t(link.labelKey)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button className="logout" onClick={logout} type="button">
          {t('nav.logout')}
        </button>
      </aside>
      <main className="dashboard-content">
        <header className="flex items-center justify-end gap-2 p-4 border-b border-border">
          <LanguagePicker />
          <ThemeToggle />
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
