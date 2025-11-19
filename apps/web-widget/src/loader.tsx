import { createRoot } from 'react-dom/client';
import { MetaChatWidget } from './MetaChatWidget';
import type { WidgetConfig, WidgetOptions } from './types';

const DEFAULT_CONFIG_ENDPOINT = '/api/public/widget/config';

async function fetchConfig(options: WidgetOptions): Promise<WidgetConfig> {
  if (options.config) {
    return { ...options.config } as WidgetConfig;
  }

  const endpoint = options.configUrl ?? DEFAULT_CONFIG_ENDPOINT;
  const params = new URLSearchParams();
  if (options.token) params.set('token', options.token);
  const widgetOverride = options.config as WidgetConfig | undefined;
  if (widgetOverride?.widgetId) params.set('widgetId', widgetOverride.widgetId);

  const query = params.toString();
  const url = query ? `${endpoint}?${query}` : endpoint;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch widget config: ${response.status}`);
  }

  const config = (await response.json()) as WidgetConfig;
  return config;
}

function resolveTargetElement(options: WidgetOptions) {
  if (options.element) return options.element;
  const script = document.currentScript as HTMLScriptElement | null;
  if (script && script.parentElement) {
    const container = document.createElement('div');
    script.parentElement.insertBefore(container, script);
    return container;
  }

  const fallback = document.createElement('div');
  document.body.appendChild(fallback);
  return fallback;
}

export async function mountMetaChatWidget(options: WidgetOptions = {}) {
  const target = resolveTargetElement(options);
  target.setAttribute('data-meta-chat-widget', options.config?.widgetId ?? 'meta-chat');
  try {
    const config = await fetchConfig(options);
    const root = createRoot(target);
    root.render(
      <MetaChatWidget config={config} token={options.token} onEvent={options.onEvent} />,
    );
    return root;
  } catch (error) {
    target.innerHTML = `<div style="font-family: system-ui; padding: 16px; border: 1px solid #fee2e2; background:#fef2f2; color:#b91c1c; border-radius: 12px;">${
      error instanceof Error ? error.message : 'Unable to mount Meta Chat widget.'
    }</div>`;
    throw error;
  }
}

declare global {
  interface Window {
    MetaChatWidget?: typeof mountMetaChatWidget;
  }
}

if (typeof window !== 'undefined') {
  window.MetaChatWidget = mountMetaChatWidget;
}

if (import.meta.env.DEV) {
  mountMetaChatWidget({
    config: {
      widgetId: 'dev-widget',
      apiBaseUrl: 'http://localhost:3000',
      websocketUrl: 'ws://localhost:3000/ws',
      tenantId: 'dev',
      initialMessage: 'Hi there! Ask me anything about your workspace.',
      theme: {
        primaryColor: '#4f46e5',
        backgroundColor: '#ffffff',
        textColor: '#0f172a',
      },
      metadata: {
        brandName: 'Meta Chat Preview',
        agentName: 'Ava',
        composerPlaceholder: 'Type your message…',
        quickReplies: 'What can you do?|Connect me to sales',
      },
    },
  });
}
