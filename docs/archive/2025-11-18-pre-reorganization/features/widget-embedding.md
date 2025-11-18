# Embedding the Meta Chat Web Widget

This guide walks through adding the Meta Chat widget to any website.

## 1. Build the widget assets

```bash
npm run build -- --filter @meta-chat/web-widget
```

The optimized bundles are emitted to `apps/web-widget/dist/`:

- `widget.js` – IIFE bundle for script tags
- `widget.es.js` – ES module bundle for modern bundlers
- `widget.js.map` – Source map for debugging

## 2. Host the bundle

Upload `widget.js` (and optionally `widget.js.map`) to your CDN or serve it via the API CDN.

## 3. Configure the widget endpoint

The widget loader fetches tenant-specific configuration from the public API. The config should include:

```jsonc
{
  "widgetId": "acme-support",
  "apiBaseUrl": "https://api.meta-chat.example",
  "websocketUrl": "wss://api.meta-chat.example/ws/widgets",
  "tenantId": "tenant_123",
  "initialMessage": "Hey there! How can we help?",
  "theme": {
    "primaryColor": "#4f46e5",
    "backgroundColor": "#ffffff",
    "textColor": "#0f172a",
    "borderRadius": 16,
    "showBranding": false
  },
  "metadata": {
    "brandName": "ACME Support",
    "agentName": "Ava",
    "composerPlaceholder": "Ask us anything",
    "quickReplies": "Pricing?|Contact sales"
  }
}
```

## 4. Drop the widget into your site

```html
<div id="support-widget"></div>
<script src="https://cdn.example.com/meta-chat/widget.js" async></script>
<script>
  window.MetaChatWidget?.({
    element: document.getElementById('support-widget'),
    configUrl: 'https://api.meta-chat.example/public/widgets/config?widgetId=acme-support',
    token: 'PUBLIC_WIDGET_TOKEN',
    onEvent(event) {
      console.debug('[MetaChat]', event);
    },
  });
</script>
```

## 5. Styling & customization

The widget exposes CSS custom properties to control the palette and radius. The configuration payload above automatically applies them.

## 6. Analytics hooks

Pass an `onEvent` function to capture message sends, receipts, connection state changes, and typing events. Use this hook to forward data to your analytics platform.

## 7. Resilience

The widget automatically reconnects to the WebSocket up to five times with exponential backoff and displays a banner if connectivity is degraded.
