# Channel Adapters

The `@meta-chat/channels` package contains adapters for external messaging channels. Each adapter normalizes inbound payloads into the shared `NormalizedMessage` shape and exposes helpers for verifying webhook requests and sending outbound messages.

## Available adapters

| Channel    | Class                     | Notes |
|------------|---------------------------|-------|
| WhatsApp   | `WhatsAppAdapter`         | Webhook signature validation, media download/upload, outbound messaging via Graph API |
| Messenger  | `MessengerAdapter`        | Hub challenge verification, app-secret signature checks, attachment normalization, typing indicators |
| Web Chat   | `WebChatAdapter`          | Socket.IO backed realtime chat with authentication, inbound event normalization, broadcast helpers |

## Configuration sources

Channel credentials are loaded from tenant/channel records provided to the adapter factory. Each `ChannelContext` includes the tenant metadata and a channel record with `config` and optional `secrets` maps.

| Adapter   | Required Config Keys | Optional Secrets |
|-----------|----------------------|------------------|
| WhatsApp  | `config.phoneNumberId`, `config.webhookVerifyToken` | `secrets.accessToken`, `secrets.appSecret` (preferred) or the same keys inside `config`/`config.whatsapp` |
| Messenger | `config.pageId`, `config.verifyToken` | `secrets.pageAccessToken`, `secrets.appSecret` (or `config.messenger` fallbacks) |
| Web Chat  | `config.enabled` (default `true`), `config.allowedOrigins` | `secrets.token` (shared secret for Socket.IO auth) |

> **Tip:** When reading from Prisma, `Channel.config` can store nested objects (e.g. `{ whatsapp: { phoneNumberId, webhookVerifyToken } }`). The adapters fall back to either top-level keys or channel-specific namespaces.

## Environment variables

The adapters rely on runtime configuration rather than global environment variables. However, the following env vars are typically required when deploying webhook handlers:

- `WHATSAPP_VERIFY_TOKEN` – Provide this value when registering the WhatsApp webhook and store it in the channel record.
- `WHATSAPP_APP_SECRET` / `WHATSAPP_ACCESS_TOKEN` – Store securely as channel secrets for signature validation and Graph API calls.
- `MESSENGER_VERIFY_TOKEN` – Used for the Messenger hub verification handshake.
- `MESSENGER_APP_SECRET` / `MESSENGER_PAGE_ACCESS_TOKEN` – Used for signature validation and Graph API calls.
- `WEBCHAT_SHARED_TOKEN` – Optional shared secret for authenticating Socket.IO clients.

## Factory usage

Use `createChannelAdapter(context, options)` to construct the correct adapter. Supply a Socket.IO `Server` when creating the Web Chat adapter:

```ts
import { createChannelAdapter } from '@meta-chat/channels';
import { Server } from 'socket.io';

const io = new Server();
const adapter = createChannelAdapter(context, { io });
```

Set a message handler to process inbound normalized events:

```ts
adapter.setMessageHandler(async (message) => {
  // Persist or route the NormalizedMessage
});
```

## Testing fixtures

Unit tests under `packages/channels/tests` rely on JSON fixtures that mirror real webhook payloads. The fixtures cover WhatsApp text/media events, Messenger attachments, and Socket.IO chat traffic. Add new fixtures when extending adapters to keep normalization behavior predictable.
