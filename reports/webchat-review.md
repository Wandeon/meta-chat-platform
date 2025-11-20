# WebChat implementation review

This report summarizes the current WebChat channel implementation and how it handles connectivity, WebSocket behavior, message routing, session state, and reconnection. Findings are based on `packages/channels/src/webchat/webchat-adapter.ts` and the Socket.IO setup in `apps/api/src/server.ts`.

## 1) API connectivity and authentication
- The WebChat adapter authorizes clients via the Socket.IO handshake using tenant ID, user ID, conversation ID, and an optional per-channel token stored in channel config/secrets. Requests missing any of these identifiers or with a mismatched tenant are rejected.【F:packages/channels/src/webchat/webchat-adapter.ts†L81-L156】
- The API server’s Socket.IO middleware authenticates differently, relying on either a JWT (`WEBCHAT_JWT_SECRET`) or an HMAC signature (`WEBCHAT_HMAC_SECRET`) and only extracts `tenantId` and `userId`. Conversation IDs and the adapter’s token are not validated at the server boundary.【F:apps/api/src/server.ts†L324-L397】
- Because the server does not enforce or propagate the conversation ID that the adapter requires, clients cannot satisfy both authentication schemes simultaneously, and the adapter cannot ensure messages are tied to a specific conversation room.

## 2) WebSocket implementation
- The adapter configures CORS and then joins sockets to a room named by the conversation ID, routing all outbound and inbound events through that room.【F:packages/channels/src/webchat/webchat-adapter.ts†L92-L128】
- The API server creates rooms only for the tenant and for `tenant:user` pairs. It never joins the socket to the conversation ID room the adapter expects, so broadcasts using the adapter’s `send`/`broadcastTyping` methods will miss connected clients.【F:apps/api/src/server.ts†L400-L466】【F:packages/channels/src/webchat/webchat-adapter.ts†L62-L79】

## 3) Message routing
- Incoming `message` events in the adapter are normalized and delivered through the channel pipeline, then echoed to peers in the same conversation room.【F:packages/channels/src/webchat/webchat-adapter.ts†L114-L188】
- The API server’s `message` handler only acknowledges receipt and logs the payload; it does not call the adapter, persist the message, or dispatch it to orchestrator/LLM flows. Outbound assistant messages are commented as “TODO,” so actual routing to agents is unimplemented.【F:apps/api/src/server.ts†L418-L452】
- Because the server and adapter are disconnected, inbound widget messages never reach the channel adapter, and outbound messages sent via the adapter never reach widget clients.

## 4) Session management
- The adapter relies on the handshake’s conversation/user IDs and stores no additional session state; reconnections depend on the client re-sending the same auth data to join the proper room.【F:packages/channels/src/webchat/webchat-adapter.ts†L136-L164】
- The server does not persist session metadata or conversation membership; it only logs connect/disconnect events. There is no replay of missed messages or validation that reconnecting clients are reattached to prior conversations.【F:apps/api/src/server.ts†L400-L466】

## 5) Reconnection behavior
- Socket.IO’s default reconnection is available, but the server-side logic does not re-emit pending messages or rejoin conversation rooms (since conversation IDs are not tracked). Clients that reconnect will only re-enter tenant/user rooms, so adapter broadcasts to conversation rooms will not reach them.【F:apps/api/src/server.ts†L404-L452】【F:packages/channels/src/webchat/webchat-adapter.ts†L62-L128】

## Test implications
- **WebSocket connectivity:** Clients can authenticate with JWT/HMAC, but cannot satisfy the adapter’s required conversation-level auth, leaving the adapter unusable in practice.
- **Message delivery:** Inbound messages stop at the server and never reach channel processing; outbound adapter broadcasts target conversation rooms that the server never joins, so user delivery fails both ways.
- **Reconnection:** Without conversation-aware room joins or message replay, reconnecting users will miss messages and typing indicators.
- **Session state:** No server-side session restoration or conversation binding exists, so session continuity is not preserved.

## Recommendations
- Align the server’s Socket.IO authentication with the adapter (include conversation ID and optional adapter token), and propagate these values into the adapter context.
- Join sockets to the conversation ID room on connection (in addition to tenant/user rooms) so adapter broadcasts reach clients.
- Route inbound widget messages through the `WebChatAdapter`/channel pipeline and persist them before acknowledgment; wire outbound assistant responses back through Socket.IO.
- Add reconnection-aware logic (e.g., rejoining conversation rooms and replaying missed messages) to preserve session state and delivery after network interruptions.
