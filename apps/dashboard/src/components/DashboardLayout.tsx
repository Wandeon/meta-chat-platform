import { Outlet } from 'react-router-dom';
import { useAuth } from '../routes/AuthProvider';
import { ThemeToggle } from './shared/ThemeToggle';
import { LanguagePicker } from './shared/LanguagePicker';
import { DesktopSidebar } from './shared/DesktopSidebar';
import { MobileNav } from './shared/MobileNav';

export function DashboardLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <DesktopSidebar onLogout={logout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - Desktop only */}
        <header className="hidden md:flex items-center justify-end gap-2 p-4 border-b border-border">
          <LanguagePicker />
          <ThemeToggle />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav />
    </div>
  );
}
