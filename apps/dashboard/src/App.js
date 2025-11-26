import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './routes/AuthProvider';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { TenantsPage } from './pages/TenantsPage';
import { TenantSettingsPage } from './pages/TenantSettingsPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { HealthPage } from './pages/HealthPage';
import { TestingPage } from './pages/TestingPage';
import { McpServersPage } from './pages/McpServersPage';
import { WidgetPage } from './pages/WidgetPage';
import { BillingPage } from './pages/BillingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
export function App() {
    const { apiKey } = useAuth();
    if (!apiKey) {
        return (_jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(LoginPage, {}) }), _jsx(Route, { path: "/signup", element: _jsx(SignupPage, {}) }), _jsx(Route, { path: "/verify-email", element: _jsx(VerifyEmailPage, {}) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/login", replace: true }) })] }));
    }
    return (_jsxs(Routes, { children: [_jsxs(Route, { element: _jsx(DashboardLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(Navigate, { to: "/tenants", replace: true }) }), _jsx(Route, { path: "/tenants", element: _jsx(TenantsPage, {}) }), _jsx(Route, { path: "/tenants/:tenantId/settings", element: _jsx(TenantSettingsPage, {}) }), _jsx(Route, { path: "/tenants/:tenantId/widget", element: _jsx(WidgetPage, {}) }), _jsx(Route, { path: "/billing", element: _jsx(BillingPage, {}) }), _jsx(Route, { path: "/analytics", element: _jsx(AnalyticsPage, {}) }), _jsx(Route, { path: "/mcp-servers", element: _jsx(McpServersPage, {}) }), _jsx(Route, { path: "/channels", element: _jsx(ChannelsPage, {}) }), _jsx(Route, { path: "/documents", element: _jsx(DocumentsPage, {}) }), _jsx(Route, { path: "/conversations", element: _jsx(ConversationsPage, {}) }), _jsx(Route, { path: "/webhooks", element: _jsx(WebhooksPage, {}) }), _jsx(Route, { path: "/testing", element: _jsx(TestingPage, {}) }), _jsx(Route, { path: "/health", element: _jsx(HealthPage, {}) })] }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/tenants", replace: true }) })] }));
}
//# sourceMappingURL=App.js.map