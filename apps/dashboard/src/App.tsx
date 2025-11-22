import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './routes/AuthProvider';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
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
import { WidgetsIndexPage } from './pages/WidgetsIndexPage';
import { BillingPage } from './pages/BillingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export function App() {
  const { apiKey } = useAuth();

  if (!apiKey) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/tenants" replace />} />
        <Route path="/dashboard" element={<AnalyticsPage />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/tenants/:tenantId/settings" element={<TenantSettingsPage />} />
        <Route path="/tenants/:tenantId/widget" element={<WidgetPage />} />
        <Route path="/widgets" element={<WidgetsIndexPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/mcp-servers" element={<McpServersPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/testing" element={<TestingPage />} />
        <Route path="/health" element={<HealthPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/tenants" replace />} />
    </Routes>
  );
}
