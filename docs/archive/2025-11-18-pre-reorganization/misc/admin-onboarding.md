# Admin Onboarding Guide

This guide helps new administrators access the Meta Chat dashboard and perform common tasks.

## 1. Access credentials

1. Generate an admin JWT via the API (`POST /admin/auth/token`).
2. Share the token securely with the administrator. Tokens are short lived; rotate regularly.

## 2. Sign in to the dashboard

1. Visit the deployed dashboard URL (e.g. `https://admin.meta-chat.example`).
2. Paste the issued admin JWT into the sign-in form.
3. The dashboard stores the token locally and begins authenticating API requests.

## 3. Configure tenants

- Navigate to **Tenants**.
- Create a tenant by supplying a name and slug. The slug becomes part of webhook routing keys.

## 4. Connect channels

- Open **Channels**.
- Provide the tenant ID, channel name, and type (WhatsApp, Messenger, or Web).
- Paste the provider credentials JSON. Secrets are transmitted to the API for secure storage.

## 5. Upload knowledge documents

- Visit **Documents**.
- Supply the tenant ID, document title, optional source URL, and raw content.
- The API triggers ingestion so the RAG engine can answer questions accurately.

## 6. Monitor conversations

- Use **Conversations** to view live sessions, escalation counts, and recent transcript snippets.
- Escalated conversations can be triaged via the API or channel-specific tools.

## 7. Manage webhooks

- Under **Webhooks**, register outbound hooks for tenant automation.
- Toggle the event types (conversation created, message sent/received, document updates).

## 8. Observe system health

- The **System Health** tab surfaces latency metrics and service status.
- Investigate degraded services by correlating with infrastructure monitoring.

## 9. Sign out

- Use the sidebar **Log out** button to clear the stored JWT.

For advanced automation (bulk imports, scheduled exports) refer to the REST API reference in `docs/api-reference.md`.
