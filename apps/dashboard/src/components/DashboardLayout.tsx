import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../routes/AuthProvider';
import { clsx } from 'clsx';
import '../styles/dashboard.css';

const NAV_LINKS = [
  { to: '/tenants', label: 'Tenants' },
  { to: '/mcp-servers', label: 'MCP Servers' },
  { to: '/channels', label: 'Channels' },
  { to: '/documents', label: 'Documents' },
  { to: '/conversations', label: 'Conversations' },
  { to: '/webhooks', label: 'Webhooks' },
  { to: '/testing', label: 'Testing' },
  { to: '/health', label: 'System Health' },
];

export function DashboardLayout() {
  const { logout } = useAuth();
  const location = useLocation();

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
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <button className="logout" onClick={logout} type="button">
          Log out
        </button>
      </aside>
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
