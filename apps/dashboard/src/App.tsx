import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './routes/AuthProvider';
import { useApi } from './api/client';
import { DashboardLayout } from './components/DashboardLayout';
import { AdminDashboardLayout } from './components/AdminDashboardLayout';
import { SetupWizard } from './components/SetupWizard';
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
// Admin pages - new Phase 3 dashboard
import { AdminClientsPage } from './pages/admin/AdminClientsPage';
import { AdminModelsPage } from './pages/admin/AdminModelsPage';
import { AdminSystemPage } from './pages/admin/AdminSystemPage';
// Legacy admin pages (kept for backward compatibility)
import { TenantsPage } from './pages/TenantsPage';
import { TenantSettingsPage } from './pages/TenantSettingsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { HealthPage } from './pages/HealthPage';
import { McpServersPage } from './pages/McpServersPage';
import { BillingPage } from './pages/BillingPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

export function App() {
  const { apiKey, getUser } = useAuth();
  const api = useApi();
  const user = getUser();
  const [wizardDismissed, setWizardDismissed] = useState(false);

  // Fetch tenant to check setup status
  const tenantQuery = useQuery({
    queryKey: ['tenant-settings', user?.tenantId],
    queryFn: () => api.get(`/api/tenants/${user?.tenantId}`),
    enabled: !!apiKey && !!user?.tenantId,
  });

  const setupCompleted = (tenantQuery.data as any)?.settings?.setupCompleted === true;
  const showWizard = apiKey && !setupCompleted && !wizardDismissed && !tenantQuery.isLoading;

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
    <>
      {showWizard && <SetupWizard onComplete={() => setWizardDismissed(true)} />}
      <Routes>
        {/* Admin Dashboard Routes - Phase 3 */}
        <Route path="/admin" element={<AdminDashboardLayout />}>
          <Route index element={<Navigate to="/admin/clients" replace />} />
          <Route path="clients" element={<AdminClientsPage />} />
          <Route path="models" element={<AdminModelsPage />} />
          <Route path="billing" element={<BillingPage />} />
          <Route path="system" element={<AdminSystemPage />} />
        </Route>

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

          {/* Legacy admin routes - redirect to new admin dashboard */}
          <Route path="/admin/tenants" element={<Navigate to="/admin/clients" replace />} />
          <Route path="/admin/tenants/:tenantId/settings" element={<TenantSettingsPage />} />
          <Route path="/admin/tenants/:tenantId/widget" element={<WidgetPage />} />
          <Route path="/admin/analytics" element={<Navigate to="/admin/clients" replace />} />
          <Route path="/admin/mcp-servers" element={<McpServersPage />} />
          <Route path="/admin/webhooks" element={<WebhooksPage />} />
          <Route path="/admin/health" element={<Navigate to="/admin/system" replace />} />

          {/* Backward compatibility for old routes */}
          <Route path="/tenants" element={<Navigate to="/knowledge-base" replace />} />
          <Route path="/tenants/:tenantId/settings" element={<Navigate to="/settings" replace />} />
        </Route>
        <Route path="*" element={<Navigate to="/knowledge-base" replace />} />
      </Routes>
    </>
  );
}
