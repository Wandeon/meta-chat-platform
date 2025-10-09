# Meta Chat Web Widget

The Meta Chat web widget is an embeddable chat client for the Meta Chat platform. It provides a drop-in script that renders the assistant UI, connects to the streaming WebSocket API, and handles reconnection, typing indicators, and tenant-specific customisation.

## Development

```bash
npm install
npm run dev -- --filter @meta-chat/web-widget
```

Open `http://localhost:5174` to view the preview shell. The preview loads a local configuration defined in `src/loader.ts`.

## Embedding

1. Build the widget library:

   ```bash
   npm run build -- --filter @meta-chat/web-widget
   ```

2. Upload the generated bundle from `apps/web-widget/dist` to your CDN.

3. Embed the loader script on your site:

   ```html
   <script
     src="https://cdn.example.com/meta-chat/widget.js"
     data-config-url="https://api.example.com/public/widgets/config?widgetId=YOUR_WIDGET_ID"
     data-token="PUBLIC_WIDGET_TOKEN"
     async
   ></script>
   <script>
     window.MetaChatWidget &&
       window.MetaChatWidget({
         configUrl: document.currentScript?.getAttribute('data-config-url') ?? undefined,
         token: document.currentScript?.getAttribute('data-token') ?? undefined,
       });
   </script>
   ```

### Configuration contract

The widget expects the configuration endpoint to respond with:

```jsonc
{
  "widgetId": "string",
  "apiBaseUrl": "https://api.example.com",
  "websocketUrl": "wss://api.example.com/ws/widgets",
  "tenantId": "tenant-id",
  "initialMessage": "Optional welcome message",
  "theme": {
    "primaryColor": "#4f46e5",
    "backgroundColor": "#ffffff",
    "textColor": "#0f172a",
    "borderRadius": 16,
    "showBranding": true
  },
  "metadata": {
    "brandName": "ACME Support",
    "agentName": "Ava",
    "composerPlaceholder": "Ask us anything",
    "quickReplies": "Pricing?|Talk to support"
  }
}
```

## Events & analytics

You can pass an `onEvent` handler when mounting the widget to receive updates for configuration, message receipt, message send, connection state changes, and typing state. These can be forwarded to your analytics layer.

## Reconnection & state handling

The widget automatically retries the WebSocket connection with exponential backoff up to five times. Incoming messages and typing indicators update the UI immediately while maintaining optimistic local state for outgoing messages.

## Customising the UI

Theme colours, corner radius, and Meta Chat branding are configured via the widget configuration payload. The widget injects CSS custom properties scoped to the widget container so you can safely render multiple widgets on the same page.
