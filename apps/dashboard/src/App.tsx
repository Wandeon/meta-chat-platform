import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './routes/AuthProvider';
import { DashboardLayout } from './components/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
// Client pages (simplified)
import { DocumentsPage } from './pages/DocumentsPage';
import { ClientSettingsPage } from './pages/ClientSettingsPage';
import { TestingPage } from './pages/TestingPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { WidgetPage } from './pages/WidgetPage';
// Admin pages (kept for future admin dashboard)
import { TenantsPage } from './pages/TenantsPage';
import { TenantSettingsPage } from './pages/TenantSettingsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { HealthPage } from './pages/HealthPage';
import { McpServersPage } from './pages/McpServersPage';
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
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      {/* Client Dashboard Routes */}
      <Route element={<DashboardLayout />}>
        {/* Default to Knowledge Base */}
        <Route index element={<Navigate to="/knowledge-base" replace />} />
        
        {/* Client routes - simplified 5-tab navigation */}
        <Route path="/knowledge-base" element={<DocumentsPage />} />
        <Route path="/settings" element={<ClientSettingsPage />} />
        <Route path="/test" element={<TestingPage />} />
        <Route path="/deploy" element={<ChannelsPage />} />
        <Route path="/deploy/widget" element={<WidgetPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />

        {/* Legacy routes - redirect to new paths */}
        <Route path="/documents" element={<Navigate to="/knowledge-base" replace />} />
        <Route path="/testing" element={<Navigate to="/test" replace />} />
        <Route path="/channels" element={<Navigate to="/deploy" replace />} />

        {/* Admin routes - TODO: move to separate admin dashboard in Phase 3 */}
        <Route path="/admin/tenants" element={<TenantsPage />} />
        <Route path="/admin/tenants/:tenantId/settings" element={<TenantSettingsPage />} />
        <Route path="/admin/tenants/:tenantId/widget" element={<WidgetPage />} />
        <Route path="/admin/billing" element={<BillingPage />} />
        <Route path="/admin/analytics" element={<AnalyticsPage />} />
        <Route path="/admin/mcp-servers" element={<McpServersPage />} />
        <Route path="/admin/webhooks" element={<WebhooksPage />} />
        <Route path="/admin/health" element={<HealthPage />} />
        
        {/* Backward compatibility for old routes */}
        <Route path="/tenants" element={<Navigate to="/knowledge-base" replace />} />
        <Route path="/tenants/:tenantId/settings" element={<Navigate to="/settings" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/knowledge-base" replace />} />
    </Routes>
  );
}
