import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import type { Tenant, UpdateTenantRequest } from '../api/types';

interface WidgetConfig {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  showBranding: boolean;
  brandName: string;
  agentName: string;
  initialMessage: string;
  composerPlaceholder: string;
  quickReplies: string;
}

export function WidgetPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const api = useApi();
  const queryClient = useQueryClient();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch tenant data
  const tenantQuery = useQuery({
    queryKey: ['tenant', tenantId],
    queryFn: () => api.get<Tenant>(`/api/tenants/${tenantId}`),
    enabled: !!tenantId,
  });

  const tenant = tenantQuery.data;
  const widgetConfigData = (tenant?.widgetConfig as Record<string, any>) || {};

  const [config, setConfig] = useState<WidgetConfig>({
    primaryColor: widgetConfigData.primaryColor || '#4f46e5',
    backgroundColor: widgetConfigData.backgroundColor || '#ffffff',
    textColor: widgetConfigData.textColor || '#0f172a',
    borderRadius: widgetConfigData.borderRadius || 12,
    showBranding: widgetConfigData.showBranding !== false,
    brandName: widgetConfigData.brandName || tenant?.name || 'Meta Chat',
    agentName: widgetConfigData.agentName || 'Assistant',
    initialMessage: widgetConfigData.initialMessage || 'Hi! How can I help you today?',
    composerPlaceholder: widgetConfigData.composerPlaceholder || 'Type your message...',
    quickReplies: widgetConfigData.quickReplies || '',
  });

  // Update config when tenant data loads
  useEffect(() => {
    if (tenant) {
      const wc = (tenant.widgetConfig as Record<string, any>) || {};
      setConfig({
        primaryColor: wc.primaryColor || '#4f46e5',
        backgroundColor: wc.backgroundColor || '#ffffff',
        textColor: wc.textColor || '#0f172a',
        borderRadius: wc.borderRadius || 12,
        showBranding: wc.showBranding !== false,
        brandName: wc.brandName || tenant.name || 'Meta Chat',
        agentName: wc.agentName || 'Assistant',
        initialMessage: wc.initialMessage || 'Hi! How can I help you today?',
        composerPlaceholder: wc.composerPlaceholder || 'Type your message...',
        quickReplies: wc.quickReplies || '',
      });
    }
  }, [tenant]);

  // Save widget config mutation
  const saveConfig = useMutation({
    mutationFn: (widgetConfig: WidgetConfig) =>
      api.patch<Tenant, UpdateTenantRequest>(`/api/tenants/${tenantId}`, {
        widgetConfig: widgetConfig as any,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant', tenantId] });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleSave = () => {
    saveConfig.mutate(config);
  };

  const apiBaseUrl = window.location.origin;
  const widgetUrl = `${apiBaseUrl}/widget.js`;
  const installCode = `<!-- Meta Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${widgetUrl}';
    script.async = true;
    script.onload = function() {
      window.MetaChatWidget({
        configUrl: '${apiBaseUrl}/api/public/widget/config?tenantId=${tenantId}'
      });
    };
    document.head.appendChild(script);
  })();
</script>`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(installCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (tenantQuery.isLoading) {
    return (
      <div className="p-8">
        <div className="text-gray-500">Loading widget configuration...</div>
      </div>
    );
  }

  if (tenantQuery.isError) {
    return (
      <div className="p-8">
        <div className="text-red-500">Error loading widget configuration</div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Widget Installer</h1>
        <p className="text-gray-600 mt-2">
          Customize your chat widget appearance and install it on your website
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Theme Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.primaryColor}
                    onChange={(e) => setConfig({ ...config, primaryColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="#4f46e5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.backgroundColor}
                    onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.backgroundColor}
                    onChange={(e) => setConfig({ ...config, backgroundColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="#ffffff"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Text Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={config.textColor}
                    onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={config.textColor}
                    onChange={(e) => setConfig({ ...config, textColor: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="#0f172a"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Border Radius (px)
                </label>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={config.borderRadius}
                  onChange={(e) => setConfig({ ...config, borderRadius: parseInt(e.target.value) })}
                  className="w-full"
                  />
                <div className="text-sm text-gray-600 mt-1">{config.borderRadius}px</div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showBranding"
                  checked={config.showBranding}
                  onChange={(e) => setConfig({ ...config, showBranding: e.target.checked })}
                  className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                />
                <label htmlFor="showBranding" className="ml-2 block text-sm text-gray-700">
                  Show Meta Chat branding
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Content Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name
                </label>
                <input
                  type="text"
                  value={config.brandName}
                  onChange={(e) => setConfig({ ...config, brandName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Meta Chat"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agent Name
                </label>
                <input
                  type="text"
                  value={config.agentName}
                  onChange={(e) => setConfig({ ...config, agentName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Assistant"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Message
                </label>
                <textarea
                  value={config.initialMessage}
                  onChange={(e) => setConfig({ ...config, initialMessage: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  placeholder="Hi! How can I help you today?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Composer Placeholder
                </label>
                <input
                  type="text"
                  value={config.composerPlaceholder}
                  onChange={(e) => setConfig({ ...config, composerPlaceholder: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Type your message..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Replies (separated by |)
                </label>
                <input
                  type="text"
                  value={config.quickReplies}
                  onChange={(e) => setConfig({ ...config, quickReplies: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="What can you do?|Connect me to sales"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saveConfig.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saveConfig.isPending ? 'Saving...' : 'Save Configuration'}
            </button>
            {saveSuccess && (
              <div className="flex items-center text-green-600 text-sm">
                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Configuration saved!
              </div>
            )}
          </div>
        </div>

        {/* Preview Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Live Preview</h2>
            
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div 
                className="mx-auto max-w-sm shadow-lg overflow-hidden"
                style={{
                  backgroundColor: config.backgroundColor,
                  borderRadius: `${config.borderRadius}px`,
                }}
              >
                {/* Header */}
                <div 
                  className="p-4 text-white"
                  style={{ backgroundColor: config.primaryColor }}
                >
                  <div className="font-semibold">{config.brandName}</div>
                  <div className="text-sm opacity-90">Chat with {config.agentName}</div>
                </div>

                {/* Messages */}
                <div className="p-4 space-y-3" style={{ color: config.textColor }}>
                  <div className="flex justify-start">
                    <div 
                      className="max-w-[80%] px-3 py-2 text-sm"
                      style={{ 
                        backgroundColor: `${config.primaryColor}15`,
                        borderRadius: `${config.borderRadius}px`,
                      }}
                    >
                      {config.initialMessage}
                    </div>
                  </div>

                  {config.quickReplies && (
                    <div className="flex gap-2 flex-wrap">
                      {config.quickReplies.split('|').map((reply, idx) => (
                        <button
                          key={idx}
                          className="px-3 py-1 text-xs rounded-full border"
                          style={{
                            borderColor: config.primaryColor,
                            color: config.primaryColor,
                            borderRadius: `${config.borderRadius * 2}px`,
                          }}
                        >
                          {reply.trim()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-gray-200">
                  <div 
                    className="px-3 py-2 border border-gray-300 text-sm"
                    style={{ 
                      borderRadius: `${config.borderRadius}px`,
                      color: config.textColor,
                    }}
                  >
                    {config.composerPlaceholder}
                  </div>
                </div>

                {/* Branding */}
                {config.showBranding && (
                  <div className="px-4 pb-3 text-center text-xs text-gray-400">
                    Powered by Meta Chat
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900">Installation Code</h2>
            
            <p className="text-sm text-gray-600 mb-4">
              Copy and paste this code into your website HTML, just before the closing body tag:
            </p>

            <div className="relative">
              <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
                <code>{installCode}</code>
              </pre>
              <button
                onClick={copyToClipboard}
                className="absolute top-2 right-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Installation Steps</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
              <li>Configure your widget appearance above</li>
              <li>Click Save Configuration</li>
              <li>Copy the installation code</li>
              <li>Paste it into your website HTML</li>
              <li>The widget will appear automatically on your site</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
