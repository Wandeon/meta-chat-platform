# WhatsApp Adapter Review

This document summarizes the current state of the WhatsApp channel adapter implementation.

## Implementation overview
- **Adapter location:** `packages/channels/src/whatsapp/whatsapp-adapter.ts` implements verification, receiving, sending, media upload/download, and webhook normalization logic.
- **Worker integration:** `apps/worker/src/channel-adapters.ts` wraps `WhatsAppAdapter` so the orchestrator can call it for outbound messages.

## Webhook handling
- The adapter validates the `x-hub-signature-256` header using the configured app secret and the raw request body via `ensureSignature` before processing payloads.
- Incoming webhook payloads are parsed and normalized for supported message types (text, image, audio, video, document, location). Other types are ignored.
- Status updates (e.g., delivery/read receipts) are not handled; the webhook normalizer only iterates over `value.messages` and does not process `statuses`.
- The API project does not expose a WhatsApp webhook route; only Stripe webhooks are present under `apps/api/src/routes/webhooks/`.

## Message sending
- Outbound support covers text, image, audio, video, document, and location messages. Media uploads fetch the provided URL, upload the file to Graph (`/{phoneNumberId}/media`), then send `/{phoneNumberId}/messages`.
- Recipient (`to`) is required and pulled from the payload or message metadata; missing values throw errors.

## Media handling
- Inbound media IDs are resolved via Graph to obtain URLs and MIME types before normalization.
- Download helper fetches media with bearer auth and returns buffers plus metadata.
- Upload helper streams media from a URL into Graph using multipart form data and returns the uploaded media ID.

## Error handling
- Verification, signature validation, config checks, media fetch/upload, and Graph requests throw errors on failure. There is no retry/backoff or structured error mapping.

## Identified gaps
- Webhook route missing in API app, so inbound traffic cannot reach the adapter.
- Status notifications are not processed.
- Only a subset of WhatsApp message types is supported; interactive/templates/stickers/contacts/reaction messages are not normalized or sent.

