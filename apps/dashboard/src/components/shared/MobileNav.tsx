import { Link, useLocation } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Rocket,
  Activity,
  Users
} from 'lucide-react';

// Mobile shows only 5 most important items
const MOBILE_NAV_ITEMS = [
  { path: '/documents', icon: FileText, label: 'Documents' },
  { path: '/conversations', icon: MessageSquare, label: 'Conversations' },
  { path: '/testing', icon: Rocket, label: 'Testing' },
  { path: '/health', icon: Activity, label: 'Health' },
  { path: '/tenants', icon: Users, label: 'Tenants' },
];

export function MobileNav() {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center justify-center w-full h-full relative"
              aria-label={item.label}
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
