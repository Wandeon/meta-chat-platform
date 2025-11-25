# Dashboard UX Redesign

**Date:** 2025-11-25  
**Status:** Approved  
**Goal:** Simplify dashboard for non-technical end clients who want to set up a chatbot for WordPress, WhatsApp, or Facebook Messenger.

---

## Target User

Non-technical business owners (like Shopify store owners) who want to deploy a chatbot with zero technical knowledge.

## User Journey

1. **Fast setup** → Get a working chatbot quickly via wizard
2. **Customize** → Tweak settings (but not overwhelm)
3. **Test** → Try it before going live
4. **Deploy** → Connect to WordPress/WhatsApp/Facebook
5. **Monitor** → See conversations

---

## Client Dashboard Structure

### Navigation (5 tabs)

```
[Knowledge Base] [Settings] [Test] [Deploy] [Conversations]
```

### 1. Knowledge Base Page

Two actions at top:
- **Upload Documents** - Drag & drop PDF, Word, TXT files
- **Write/Paste Text** - Modal with text area, saves as file

Below: Simple library list showing filename, size, delete button, processing status.

No technical jargon (embeddings, vectors, RAG).

### 2. Settings Page

Two sections:
- **Bot Identity** - Bot name, welcome message
- **Bot Instructions** - Large text area for personality/behavior

No API keys, no model selection, no appearance settings.

### 3. Test Page

- Embedded chat widget simulation
- "Reset Chat" button
- Helpful hint explaining this tests against uploaded knowledge

No debug info or technical output.

### 4. Deploy Page

Three channel cards:
- **Website** - Configure widget (color, position), get embed code
- **WhatsApp** - Connect WhatsApp Business (guided setup)
- **Facebook Messenger** - Connect Facebook Page

Each shows status: ✅ Live, ⏳ Pending, or ○ Not configured

### 5. Conversations Page

Two-panel layout:
- **Left**: List of recent conversations (name/preview/time)
- **Right**: Full conversation thread when selected

Simple filters by channel, date, keyword search.

---

## First-Time Setup Wizard

Overlay for new users with 4 steps:

1. **Add Knowledge** - Upload/paste (skippable)
2. **Instructions** - How should bot behave? (pre-filled template)
3. **Test** - Try with a few questions
4. **Deploy** - Pick a channel

Each step skippable. Returns on next login if incomplete.

---

## Admin Dashboard (Separate)

Located at `/admin` or `admin.chat.genai.hr`.

### Pages:
1. **Clients** - List all clients, change model, manage plans, impersonate
2. **Models** - Configure OpenAI keys, Ollama endpoint (GPU-01)
3. **Billing** - Trial expirations, payment status
4. **System** - Health checks, logs, Ollama status

### Key Features:
- Trial clients → Ollama on GPU-01
- Paid clients → Admin assigns model (GPT-4o, Claude, etc.)
- "Impersonate" to see client view

---

## Pages to Remove from Client View

- ❌ TenantsPage (clients ARE the tenant)
- ❌ TenantSettingsPage (replaced by simple Settings)
- ❌ McpServersPage (admin-only)
- ❌ WebhooksPage (admin-only)
- ❌ BillingPage (admin manages)
- ❌ AnalyticsPage (remove or drastically simplify)
- ❌ HealthPage (admin-only)

## Pages to Keep & Simplify

- ✅ DocumentsPage → "Knowledge Base"
- ✅ ChannelsPage → "Deploy"
- ✅ ConversationsPage → Simplify UI
- ✅ TestingPage → Clean up
- ✅ WidgetPage → Merge into Deploy > Website

## New to Build

- 🆕 Simple Settings page
- 🆕 Setup Wizard component
- 🆕 Admin Dashboard (separate app/route)

---

## Implementation Priority

1. **Phase 1**: Simplify existing pages, hide admin-only pages
2. **Phase 2**: Build setup wizard
3. **Phase 3**: Build admin dashboard
4. **Phase 4**: Polish and test

