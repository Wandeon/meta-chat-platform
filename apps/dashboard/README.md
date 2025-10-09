# Meta Chat Admin Dashboard

The admin dashboard provides authenticated tooling for operations and customer success teams to manage the Meta Chat platform.

## Getting started

```bash
npm install
npm run dev -- --filter @meta-chat/dashboard
```

Set `VITE_API_BASE_URL` to point at the admin REST API (defaults to `/api/admin`).

## Features

- **Authentication** – Paste an admin JWT issued by the API to access protected routes.
- **Tenants** – Provision new tenants and review workspace metadata.
- **Channels** – Register WhatsApp, Messenger, and Web channels with credentials.
- **Documents** – Upload or link RAG documents used for retrieval.
- **Conversations** – Monitor live conversations and recent transcripts.
- **Webhooks** – Manage outbound event subscriptions for tenant automation.
- **System health** – Surface metrics and version information from platform services.

All data mutations and reads are wired to the new REST API via the shared `useApi` helper, which automatically attaches the admin JWT and handles JSON responses.
