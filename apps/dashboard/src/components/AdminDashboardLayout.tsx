import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../routes/AuthProvider';
import { clsx } from 'clsx';
import '../styles/dashboard.css';

const ADMIN_NAV_LINKS = [
  { to: '/admin/clients', label: 'Clients', icon: '👥' },
  { to: '/admin/models', label: 'Models', icon: '🤖' },
  { to: '/admin/billing', label: 'Billing', icon: '💳' },
  { to: '/admin/system', label: 'System', icon: '⚙️' },
];

export function AdminDashboardLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar" style={{ background: '#1e1b4b' }}>
        <div className="dashboard-brand">
          <span className="dot" style={{ background: '#f97316' }} /> Admin Dashboard
        </div>
        <nav>
          <ul>
            {ADMIN_NAV_LINKS.map((link) => {
              const active = location.pathname.startsWith(link.to);
              return (
                <li key={link.to}>
                  <Link className={clsx({ active })} to={link.to}>
                    <span style={{ marginRight: '8px' }}>{link.icon}</span>
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
