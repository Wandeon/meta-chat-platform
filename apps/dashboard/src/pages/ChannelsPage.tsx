import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '../api/client';
import { useAuth } from '../routes/AuthProvider';
import type { Channel, Tenant } from '../api/types';

type ChannelType = 'webchat' | 'whatsapp' | 'messenger';
type SetupStep = 'list' | 'website' | 'whatsapp' | 'messenger';

interface CreateChannelPayload {
  type: ChannelType;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

interface UpdateChannelPayload {
  type?: ChannelType;
  config?: Record<string, unknown>;
  enabled?: boolean;
}

const CHANNEL_INFO: Record<ChannelType, { icon: string; title: string; description: string; color: string }> = {
  webchat: {
    icon: '🌐',
    title: 'Website',
    description: 'Add a chat widget to your website',
    color: '#6366f1',
  },
  whatsapp: {
    icon: '📱',
    title: 'WhatsApp',
    description: 'Connect WhatsApp Business',
    color: '#25D366',
  },
  messenger: {
    icon: '💬',
    title: 'Facebook Messenger',
    description: 'Connect your Facebook Page',
    color: '#0084FF',
  },
};

export function ChannelsPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const { getUser } = useAuth();
  const user = getUser();

  const [setupStep, setSetupStep] = useState<SetupStep>('list');
  const [widgetColor, setWidgetColor] = useState('#4f46e5');
  const [welcomeMessage, setWelcomeMessage] = useState('Hi! How can I help you today?');
  const [copied, setCopied] = useState(false);

  const channelsQuery = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get<Channel[]>('/api/channels'),
  });

  const createChannel = useMutation({
    mutationFn: (data: CreateChannelPayload) =>
      api.post<Channel, CreateChannelPayload>('/api/channels', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const updateChannel = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChannelPayload }) =>
      api.patch<Channel, UpdateChannelPayload>(`/api/channels/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] });
    },
  });

  const getChannelByType = (type: ChannelType): Channel | undefined =>
    channelsQuery.data?.find((c) => c.type === type);

  const getStatus = (type: ChannelType): 'live' | 'pending' | 'none' => {
    const channel = getChannelByType(type);
    if (!channel) return 'none';
    // API uses 'enabled', but type might have 'active'
    const isActive = (channel as any).enabled ?? channel.active;
    return isActive ? 'live' : 'pending';
  };

  const getStatusBadge = (status: 'live' | 'pending' | 'none') => {
    const styles = {
      live: { bg: '#d1fae5', color: '#065f46', label: '✅ Live' },
      pending: { bg: '#fef3c7', color: '#92400e', label: '⏳ Pending' },
      none: { bg: '#f1f5f9', color: '#64748b', label: '○ Not set up' },
    };
    const s = styles[status];
    return (
      <span style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  const apiBaseUrl = window.location.origin;
  const tenantId = user?.tenantId;
  const installCode = `<!-- Chat Widget -->
<script>
  (function() {
    var script = document.createElement('script');
    script.src = '${apiBaseUrl}/widget.js';
    script.async = true;
    script.onload = function() {
      window.MetaChatWidget({
        configUrl: '${apiBaseUrl}/api/public/widget/config?tenantId=${tenantId}'
      });
    };
    document.head.appendChild(script);
  })();
</script>`;

  const copyCode = () => {
    navigator.clipboard.writeText(installCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWebsiteSetup = async () => {
    const existingChannel = getChannelByType('webchat');
    
    if (existingChannel) {
      await updateChannel.mutateAsync({
        id: existingChannel.id,
        data: {
          enabled: true,
          config: { widgetColor, welcomeMessage },
        },
      });
    } else {
      await createChannel.mutateAsync({
        type: 'webchat',
        config: { widgetColor, welcomeMessage },
        enabled: true,
      });
    }
    setSetupStep('list');
  };

  // Website setup form
  if (setupStep === 'website') {
    return (
      <section className="dashboard-section" style={{ maxWidth: '800px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button onClick={() => setSetupStep('list')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>
            ←
          </button>
          <h1 style={{ margin: 0 }}>🌐 Website Setup</h1>
        </div>

        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '24px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>Widget Appearance</h2>
          
          <div className="form-grid" style={{ marginBottom: '24px' }}>
            <label>
              Widget Color
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  style={{ width: '60px', height: '40px', padding: '0', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={widgetColor}
                  onChange={(e) => setWidgetColor(e.target.value)}
                  style={{ flex: 1 }}
                />
              </div>
            </label>

            <label>
              Welcome Message
              <input
                type="text"
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                placeholder="Hi! How can I help you today?"
              />
            </label>
          </div>

          <button onClick={handleWebsiteSetup} disabled={createChannel.isPending || updateChannel.isPending} className="primary-button">
            {createChannel.isPending || updateChannel.isPending ? 'Saving...' : 'Save Widget Settings'}
          </button>
        </div>

        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ margin: '0 0 8px 0', fontSize: '18px' }}>Install Code</h2>
          <p style={{ color: '#64748b', marginBottom: '16px', fontSize: '14px' }}>
            Copy this code and paste it before the closing &lt;/body&gt; tag on your website.
          </p>
          
          <pre style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '13px',
            overflow: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
          }}>
            {installCode}
          </pre>
          
          <button onClick={copyCode} className="primary-button" style={{ marginTop: '16px' }}>
            {copied ? '✓ Copied!' : '📋 Copy Code'}
          </button>
        </div>
      </section>
    );
  }

  // WhatsApp setup (placeholder)
  if (setupStep === 'whatsapp') {
    return (
      <section className="dashboard-section" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button onClick={() => setSetupStep('list')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>
            ←
          </button>
          <h1 style={{ margin: 0 }}>📱 WhatsApp Setup</h1>
        </div>

        <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
          <h2 style={{ margin: '0 0 8px 0' }}>Coming Soon</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            WhatsApp Business integration is being set up. Contact support for early access.
          </p>
          <button onClick={() => setSetupStep('list')} className="secondary-button">
            Go Back
          </button>
        </div>
      </section>
    );
  }

  // Messenger setup (placeholder)
  if (setupStep === 'messenger') {
    return (
      <section className="dashboard-section" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button onClick={() => setSetupStep('list')} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '4px' }}>
            ←
          </button>
          <h1 style={{ margin: 0 }}>💬 Facebook Messenger Setup</h1>
        </div>

        <div style={{ textAlign: 'center', padding: '48px 24px', border: '2px dashed #e2e8f0', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚧</div>
          <h2 style={{ margin: '0 0 8px 0' }}>Coming Soon</h2>
          <p style={{ color: '#64748b', marginBottom: '24px' }}>
            Facebook Messenger integration is being set up. Contact support for early access.
          </p>
          <button onClick={() => setSetupStep('list')} className="secondary-button">
            Go Back
          </button>
        </div>
      </section>
    );
  }

  // Channel list view
  return (
    <section className="dashboard-section" style={{ maxWidth: '900px' }}>
      <h1>Deploy</h1>
      <p style={{ color: '#64748b', marginBottom: '32px' }}>
        Connect your chatbot to different channels to reach your customers.
      </p>

      {channelsQuery.isLoading && <p>Loading...</p>}
      {channelsQuery.error && <p style={{ color: '#dc2626' }}>Error: {channelsQuery.error.message}</p>}

      <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {(['webchat', 'whatsapp', 'messenger'] as ChannelType[]).map((type) => {
          const info = CHANNEL_INFO[type];
          const status = getStatus(type);
          
          return (
            <div
              key={type}
              onClick={() => setSetupStep(type === 'webchat' ? 'website' : type)}
              style={{
                padding: '24px',
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = info.color;
                e.currentTarget.style.boxShadow = `0 4px 12px ${info.color}20`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#e2e8f0';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ fontSize: '32px' }}>{info.icon}</div>
                {getStatusBadge(status)}
              </div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '18px' }}>{info.title}</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>{info.description}</p>
              <div style={{ marginTop: '16px', color: info.color, fontWeight: 600, fontSize: '14px' }}>
                {status === 'none' ? 'Set up →' : 'Configure →'}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
