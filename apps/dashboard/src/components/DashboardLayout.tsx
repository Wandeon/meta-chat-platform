import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../routes/AuthProvider';
import { clsx } from 'clsx';
import '../styles/dashboard.css';

interface NavLink {
  to: string;
  label: string;
  icon?: string;
}

// Client dashboard - simplified 5-tab navigation
const CLIENT_NAV_LINKS: NavLink[] = [
  { to: '/knowledge-base', label: 'Knowledge Base', icon: '📚' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
  { to: '/test', label: 'Test', icon: '🧪' },
  { to: '/deploy', label: 'Deploy', icon: '🚀' },
  { to: '/conversations', label: 'Conversations', icon: '💬' },
];

// Admin dashboard - full navigation (TODO: implement in Phase 3)
const ADMIN_NAV_LINKS: NavLink[] = [
  { to: '/tenants', label: 'Tenants' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/mcp-servers', label: 'MCP Servers' },
  { to: '/channels', label: 'Channels' },
  { to: '/documents', label: 'Documents' },
  { to: '/conversations', label: 'Conversations' },
  { to: '/webhooks', label: 'Webhooks' },
  { to: '/testing', label: 'Testing' },
  { to: '/health', label: 'System Health' },
];

export function DashboardLayout() {
  const { logout, getUser } = useAuth();
  const location = useLocation();
  const user = getUser();

  // For now, all tenant users see the client dashboard
  // Admin dashboard will be built separately in Phase 3
  const isAdmin = false; // TODO: Check user.role === 'ADMIN' when admin system is built
  const navLinks = isAdmin ? ADMIN_NAV_LINKS : CLIENT_NAV_LINKS;
  const brandName = isAdmin ? 'Meta Chat Admin' : 'Meta Chat';

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-brand">
          <span className="dot" /> {brandName}
        </div>
        <nav>
          <ul>
            {navLinks.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <li key={link.to}>
                  <Link className={clsx({ active })} to={link.to}>
                    {link.icon && <span className="nav-icon">{link.icon}</span>}
                    <span className="nav-label">{link.label}</span>
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
