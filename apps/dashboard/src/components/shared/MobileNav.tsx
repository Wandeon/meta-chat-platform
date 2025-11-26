import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ADMIN_MOBILE_NAV, CLIENT_MOBILE_NAV } from '@/constants/navigation';
import { useAuth } from '@/routes/AuthProvider';

export function MobileNav() {
  const location = useLocation();
  const { t } = useTranslation();
  const { isAdmin } = useAuth();

  const navItems = isAdmin ? ADMIN_MOBILE_NAV : CLIENT_MOBILE_NAV;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center w-full h-full relative"
              aria-label={t(item.labelKey)}
            >
              <Icon
                className={`w-6 h-6 transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground'
                }`}
              />
              {isActive && (
                <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
