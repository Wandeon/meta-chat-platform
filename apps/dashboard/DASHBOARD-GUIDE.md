# Meta Chat Dashboard - Complete User Guide

**Last Updated**: 2025-10-09
**Version**: 1.1.0
**Dashboard URL**: https://chat.genai.hr

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Tenants Management](#tenants-management)
3. [Tenant Settings](#tenant-settings)
4. [Channels Management](#channels-management)
5. [Knowledge Base Documents](#knowledge-base-documents)
6. [Webhooks](#webhooks)
7. [Health Monitoring](#health-monitoring)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Accessing the Dashboard

1. Navigate to **https://chat.genai.hr**
2. Enter your Admin API Key
3. The dashboard will load with all available features

### Admin API Key

Your admin API key was generated during deployment:
```
adm_S7-pHrOvqbZCqhgUlagP-zyqcyFYQQZBANtgqfEYhFc
```

⚠️ **IMPORTANT**: Keep this key secure. It provides full access to all tenants and system configuration.

---

## Tenants Management

Tenants are isolated workspaces for different customers or departments. Each tenant has its own:
- Channels (WhatsApp, Messenger, WebChat)
- Knowledge base documents
- Conversations
- Webhooks
- AI configuration

### Creating a Tenant

1. Go to **Tenants** page
2. Fill in the tenant form:
   - **Name**: Display name (e.g., "Acme Corporation")
   - **Slug**: URL-safe identifier (e.g., "acme-corp")
3. Click **Create tenant**
4. **IMPORTANT**: Save the generated Tenant API Key - it's shown only once!

### Tenant Actions

| Action | Description |
|--------|-------------|
| **⚙️ Settings** | Configure AI behavior, prompts, and features |
| **Toggle Active/Inactive** | Enable or disable the tenant (checkbox) |
| **🗑️ Delete** | Permanently delete tenant and ALL associated data |

⚠️ **Warning**: Deleting a tenant is permanent and will delete:
- All channels
- All documents and embeddings
- All conversations
- All webhooks

---

## Tenant Settings

The Settings page provides visual configuration for AI behavior without writing code.

### Basic Configuration

Configure how the AI introduces itself:

| Setting | Description | Example |
|---------|-------------|---------|
| **Brand Name** | Name the AI uses to introduce itself | "Acme Support Bot" |
| **Tone** | Conversational style | Friendly, Professional, Casual, Formal |
| **Locale** | Preferred response languages | en-US, es-ES, fr-FR |

### AI Model Configuration

Fine-tune the AI's behavior:

| Setting | Range | Description |
|---------|-------|-------------|
| **Provider** | - | OpenAI, Anthropic, Azure OpenAI |
| **Model** | - | gpt-4o, gpt-4o-mini, claude-3-5-sonnet-latest |
| **Temperature** | 0-2 | Lower = focused, Higher = creative (default: 0.7) |
| **Top P** | 0-1 | Nucleus sampling threshold (default: 1.0) |
| **Max Tokens** | 100-8000 | Maximum response length (default: 2000) |

### System Prompt & Guardrails

The most important configuration! Write custom instructions for the AI:

**Example Guardrails**:
```
• Always stay on topic and redirect off-topic questions politely
• Never provide medical, legal, or financial advice
• If unsure, say "I don't know" rather than guessing
• Keep responses concise and under 3 paragraphs
• For billing or technical issues, offer to escalate to human support
• Always maintain a helpful and friendly tone
• If a customer is frustrated, acknowledge their concerns first
• Proactively suggest related help articles when relevant
```

### Features

Enable/disable AI capabilities:

- **Enable Knowledge Base (RAG)**: Allow AI to retrieve information from uploaded documents
- **Enable Function Calling**: Allow AI to execute actions and integrations
- **Enable Human Handoff**: Transfer conversations to human agents when triggered

### Human Handoff Keywords

When users say these phrases, conversation is escalated:
- "speak to human"
- "customer service"
- "talk to agent"
- "speak to manager"

Add keywords by typing and clicking **Add Keyword**.

### RAG Configuration

Fine-tune knowledge base behavior (when RAG is enabled):

| Setting | Range | Description |
|---------|-------|-------------|
| **Top K Results** | 1-20 | Number of document chunks to retrieve (default: 5) |
| **Minimum Similarity** | 0-1 | Minimum similarity score for chunks (default: 0.5) |
| **Keyword Weight** | 0-1 | Balance between keyword search and vector similarity |

---

## Channels Management

Channels connect the AI to messaging platforms (WhatsApp, Messenger, WebChat).

### Creating a Channel

1. Go to **Channels** page
2. Click **+ Create Channel**
3. Select **Tenant** from dropdown
4. Enter **Channel Name**
5. Select **Channel Type**
6. Configure channel-specific settings (see below)
7. Click **Create Channel**

### Channel Types

#### WhatsApp Business API

Configure WhatsApp integration:

| Field | Description |
|-------|-------------|
| **API Key** | Your WhatsApp Business API key |
| **API Secret** | Your WhatsApp Business API secret |
| **Phone Number ID** | WhatsApp phone number ID |
| **Verify Token** | Webhook verification token |

#### Facebook Messenger

Configure Messenger integration:

| Field | Description |
|-------|-------------|
| **App ID** | Facebook App ID |
| **App Secret** | Facebook App Secret |
| **Page Access Token** | Facebook Page Access Token |
| **Verify Token** | Webhook verification token |

#### Web Chat Widget

Configure embeddable chat widget:

| Field | Description |
|-------|-------------|
| **Widget Color** | Primary color for the chat interface |
| **Welcome Message** | First message shown to users |

### Channel Actions

| Action | Description |
|--------|-------------|
| **Toggle Active/Inactive** | Enable or disable the channel (checkbox) |
| **✏️ Edit** | Modify channel configuration |
| **🗑️ Delete** | Permanently delete channel |

⚠️ **Note**: You cannot change the channel type after creation.

---

## Knowledge Base Documents

Upload documents to enable RAG-powered conversations with context-aware responses.

### Adding a Document

1. Go to **Documents** page
2. Click **+ Add Document**
3. Select **Tenant** from dropdown
4. Enter **Document Name**
5. Optionally enter **Source URL** (reference)
6. Either:
   - **Upload a file** (.txt, .md, .json, .csv, .html)
   - **Paste content** directly into the textarea
7. Click **Add Document**

### Document Processing

Documents go through these stages:

| Status | Description |
|--------|-------------|
| **Pending** | Waiting to be processed |
| **Processing** | Being chunked and embedded |
| **Indexed** | Ready for RAG retrieval |
| **Failed** | Error during processing |

### Document Actions

| Action | Description |
|--------|-------------|
| **✏️ Edit** | Modify document content or metadata |
| **🗑️ Delete** | Permanently delete document and all embeddings |

### Best Practices

- **Chunk Size**: Keep documents focused and concise
- **Structure**: Use clear headings and formatting
- **Updates**: Delete and re-upload rather than editing for major changes
- **Organization**: Use descriptive names and source URLs

---

## Webhooks

Receive real-time notifications when events occur in your system.

### Creating a Webhook

1. Go to **Webhooks** page
2. Click **+ Create Webhook**
3. Select **Tenant** from dropdown
4. Enter **Webhook URL** (must be HTTPS)
5. Optionally enter **Webhook Secret** for signature validation
6. Select **Events** to subscribe to:
   - `conversation.created` - New conversation started
   - `conversation.updated` - Conversation status changed
   - `message.sent` - Bot sent a message
   - `message.received` - User sent a message
   - `document.indexed` - Document finished processing
   - `handoff.triggered` - Human handoff initiated
7. Optionally add **Custom Headers** (e.g., Authorization)
8. Click **Create Webhook**

### Webhook Payload

Webhooks are sent as POST requests with JSON payload:

```json
{
  "event": "message.received",
  "timestamp": "2025-10-09T18:00:00.000Z",
  "tenantId": "cmgjo6rpc0000g6diraspum3w",
  "data": {
    "conversationId": "conv_abc123",
    "messageId": "msg_xyz789",
    "content": "Hello, I need help with my order",
    "direction": "inbound",
    "metadata": {}
  }
}
```

### Webhook Security

If you provide a secret, payloads are signed with HMAC-SHA256:

```
X-Webhook-Signature: sha256=abc123...
```

Verify the signature in your webhook handler to ensure authenticity.

### Webhook Actions

| Action | Description |
|--------|-------------|
| **🧪 Test** | Send a test webhook to verify configuration |
| **Toggle Active/Inactive** | Enable or disable webhook delivery (checkbox) |
| **✏️ Edit** | Modify URL, events, or headers |
| **🗑️ Delete** | Permanently delete webhook |

---

## Health Monitoring

The **Health** page shows real-time system status:

- **Database**: PostgreSQL connection status
- **Redis**: Cache connection status
- **RabbitMQ**: Message queue connection status

All services should show **"up"** for healthy operation.

---

## Best Practices

### Security

1. **Rotate API Keys**: Create new admin keys and delete old ones regularly
2. **Use HTTPS**: Always use secure webhook URLs
3. **Webhook Secrets**: Always configure webhook secrets for signature validation
4. **Environment Variables**: Never commit API keys to code

### Performance

1. **RAG Configuration**: Start with default settings (Top K: 5, Min Similarity: 0.5)
2. **Document Size**: Break large documents into smaller, focused pieces
3. **Channel Limits**: Monitor rate limits for WhatsApp/Messenger
4. **Caching**: Leverage Redis for frequently accessed data

### AI Configuration

1. **Temperature**: Start with 0.7 for balanced responses
2. **Max Tokens**: Set based on your use case (shorter for chat, longer for detailed responses)
3. **System Prompts**: Be specific and include examples of desired behavior
4. **Guardrails**: Test guardrails thoroughly before production
5. **Human Handoff**: Configure keywords based on your support workflow

### Testing

1. **Test Mode**: Create a test tenant for experimentation
2. **Webhook Testing**: Use the 🧪 Test button to verify webhook delivery
3. **Channel Testing**: Test each channel type separately
4. **Document Testing**: Upload sample documents and test retrieval

---

## Troubleshooting

### Dashboard Won't Load

**Symptoms**: White screen or "Failed to fetch" error

**Solutions**:
1. Check API is running: `pm2 list`
2. Verify health endpoint: `curl https://chat.genai.hr/health`
3. Check browser console for errors (F12)
4. Clear browser cache (Ctrl+Shift+R or Cmd+Shift+R)

### Tenant API Key Not Working

**Symptoms**: "Invalid API key" error

**Solutions**:
1. Verify you copied the full key (including prefix)
2. Check tenant is Active (not disabled)
3. Create a new API key if lost

### Documents Not Indexing

**Symptoms**: Document stuck in "Processing" status

**Solutions**:
1. Check API logs: `pm2 logs meta-chat-api`
2. Verify document format is supported
3. Check document size (< 10MB recommended)
4. Ensure pgvector extension is installed

### Webhook Not Receiving Events

**Symptoms**: No POST requests received at webhook URL

**Solutions**:
1. Verify webhook is Active (checkbox enabled)
2. Test webhook using 🧪 Test button
3. Check webhook URL is accessible from server
4. Review webhook delivery logs
5. Verify events are subscribed to

### Channel Not Working

**Symptoms**: Messages not sent/received

**Solutions**:
1. Verify channel is Active (checkbox enabled)
2. Check credentials are correct
3. For WhatsApp/Messenger: Verify webhook configuration in platform
4. Test with WebChat channel first (simplest setup)

### AI Responses Are Off-Topic

**Symptoms**: AI doesn't follow system prompt or guardrails

**Solutions**:
1. Review system prompt for clarity and specificity
2. Add more explicit guardrails
3. Lower temperature for more focused responses
4. Add examples in system prompt
5. Test with different models (GPT-4o vs Claude)

---

## Support

**Documentation**: `/home/deploy/meta-chat-platform/docs/`
**Production Guide**: `/home/deploy/meta-chat-platform/docs/PRODUCTION-DEPLOYMENT.md`
**API Docs**: `/home/deploy/meta-chat-platform/docs/openapi.yaml`
**Health Check**: https://chat.genai.hr/health

---

## Changelog

### Version 1.1.0 (2025-10-09)

**New Features**:
- ✅ Complete tenant settings UI with visual configuration
- ✅ Edit, delete, and toggle functionality for all resources
- ✅ Tenant selector dropdown (no more manual ID entry)
- ✅ WhatsApp, Messenger, and WebChat credential forms
- ✅ File upload support for documents
- ✅ Document status indicators
- ✅ Webhook testing functionality
- ✅ Custom webhook headers configuration
- ✅ Comprehensive error handling and validation
- ✅ Confirmation dialogs for destructive actions

**Improvements**:
- Redesigned all pages with collapsible create/edit forms
- Better visual feedback for loading and error states
- Consistent styling across all pages
- Improved mobile responsiveness
- Better UX with inline toggles for active/inactive status

---

**Dashboard developed with Claude Code on 2025-10-09**
