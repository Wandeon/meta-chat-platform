import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './routes/AuthProvider';
import { DashboardLayout } from './components/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { TenantsPage } from './pages/TenantsPage';
import { ChannelsPage } from './pages/ChannelsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { ConversationsPage } from './pages/ConversationsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { HealthPage } from './pages/HealthPage';

export function App() {
  const { apiKey } = useAuth();

  if (!apiKey) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<Navigate to="/tenants" replace />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/channels" element={<ChannelsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/conversations" element={<ConversationsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/health" element={<HealthPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/tenants" replace />} />
    </Routes>
  );
}
