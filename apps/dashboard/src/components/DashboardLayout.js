import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    return (_jsxs("div", { className: "dashboard-shell", children: [_jsxs("aside", { className: "dashboard-sidebar", children: [_jsxs("div", { className: "dashboard-brand", children: [_jsx("span", { className: "dot" }), " Meta Chat Admin"] }), _jsx("nav", { children: _jsx("ul", { children: NAV_LINKS.map((link) => {
                                const active = location.pathname.startsWith(link.to);
                                return (_jsx("li", { children: _jsx(Link, { className: clsx({ active }), to: link.to, children: t(link.labelKey) }) }, link.to));
                            }) }) }), _jsx("button", { className: "logout", onClick: logout, type: "button", children: t('nav.logout') })] }), _jsxs("main", { className: "dashboard-content", children: [_jsxs("header", { className: "flex items-center justify-end gap-2 p-4 border-b border-border", children: [_jsx(LanguagePicker, {}), _jsx(ThemeToggle, {})] }), _jsx("div", { className: "p-6", children: _jsx(Outlet, {}) })] })] }));
}
//# sourceMappingURL=DashboardLayout.js.map