import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Code } from 'lucide-react';
import { useApi } from '../api/client';
import { TenantSelector } from '../components/TenantSelector';
import { Card, CardContent } from '@/components/ui/card';
import { CodeSnippet } from '@/components/widget/CodeSnippet';

export function WidgetPage() {
  const { t } = useTranslation();
  const api = useApi();
  const [selectedTenantId, setSelectedTenantId] = useState('');

  const tenantQuery = useQuery({
    queryKey: ['tenant', selectedTenantId],
    queryFn: () => api.get<any>(`/api/tenants/${selectedTenantId}`),
    enabled: !!selectedTenantId,
  });

  const generateWidgetCode = () => {
    if (!selectedTenantId) return '';

    const apiUrl = window.location.origin;
    return `<!-- Meta Chat Widget -->
<script>
  (function() {
    var chatWidget = document.createElement('div');
    chatWidget.id = 'meta-chat-widget';
    document.body.appendChild(chatWidget);

    var script = document.createElement('script');
    script.src = '${apiUrl}/widget.js';
    script.setAttribute('data-tenant-id', '${selectedTenantId}');
    script.async = true;
    document.body.appendChild(script);
  })();
</script>`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          {t('widget.title')}
        </h1>
        <p className="text-muted-foreground">{t('widget.subtitle')}</p>
      </div>

      {/* Tenant Selection */}
      <div className="mb-6 max-w-xs">
        <label className="text-sm font-medium mb-2 block">
          {t('widget.selectTenant')}
        </label>
        <TenantSelector
          value={selectedTenantId}
          onChange={setSelectedTenantId}
        />
      </div>

      {/* Main Content */}
      {!selectedTenantId ? (
        <Card className="flex items-center justify-center h-64">
          <CardContent className="text-center p-8">
            <Code className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{t('widget.selectTenant')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Widget Preview */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t('widget.preview')}</h3>
              <div className="bg-muted rounded-lg p-8 flex items-center justify-center min-h-[300px]">
                <div className="text-center">
                  <Code className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Widget preview will appear here
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Tenant: {tenantQuery.data?.name || selectedTenantId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Installation Code */}
          <CodeSnippet code={generateWidgetCode()} />
        </div>
      )}
    </div>
  );
}
