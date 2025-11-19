# Integrations Guide

**Last Updated:** 2025-11-19
**Time to Complete:** 10-20 minutes
**Difficulty:** Intermediate

Connect Meta Chat to other tools and services. Automate workflows and sync data across platforms.

## What Are Integrations?

Integrations connect your chatbot to other systems:

**Examples:**
- **Webhooks:** Send conversation data to your own system
- **CRM:** Log conversations in Salesforce, HubSpot, etc.
- **Zapier:** Connect to 1000+ apps
- **API:** Custom development

## Webhooks

Webhooks send data about conversations to your systems in real-time.

### Understanding Webhooks

**How it works:**
1. User asks chatbot a question
2. Chatbot responds
3. Event happens (message sent, conversation started, etc.)
4. Webhook automatically sends data to your URL
5. Your system receives and processes data

### Webhook Events

Available events to trigger on:

| Event | Triggered When | Data Sent |
|-------|---|---|
| **conversation.created** | New conversation starts | Conversation ID, user ID |
| **message.sent** | Chatbot sends message | Message text, timestamp, user |
| **conversation.ended** | Conversation closes | Conversation ID, duration |
| **user.started** | User opens widget | User info, timestamp |
| **escalation.triggered** | Chatbot escalates to human | Reason, confidence score |

### Set Up Webhook

**Step 1: Get Webhook URL**

You need a URL that accepts POST requests. Options:

**Option A: Use Zapier (easiest)**
1. Go to Integrations → Zapier
2. Follow Zapier setup below
3. Zapier handles the URL

**Option B: Your own server**
1. Create endpoint: `yoursite.com/webhooks/meta-chat`
2. Endpoint accepts POST requests
3. Processes JSON data

**Option C: Service like requestbin**
1. Go to requestbin.com
2. Create new bin
3. Copy bin URL
4. Use as webhook (testing only)

**Step 2: Add Webhook in Dashboard**

1. Go to Integrations
2. Click **Webhooks**
3. Click **Add Webhook**
4. Fill in:
   - **Name:** What this webhook does
   - **URL:** Where to send data
   - **Events:** Which events to send
5. Click **Save**

**Step 3: Test Webhook**

1. Go back to webhook list
2. Find your webhook
3. Click **Test** button
4. Sends test data to your URL
5. Check if you received it

### Webhook Data Format

Data sent as JSON:

```json
{
  "event": "message.sent",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "conversationId": "conv_abc123",
    "userId": "user_xyz789",
    "message": "How long is shipping?",
    "response": "Shipping takes 3-5 business days.",
    "confidence": 0.95
  }
}
```

### Using Webhook Data

**Common uses:**
1. Log in your own database
2. Send email notification
3. Create support ticket
4. Update CRM
5. Trigger automation

## CRM Integrations

Automatically log conversations in your CRM.

### Supported CRMs

- **Salesforce**
- **HubSpot**
- **Pipedrive**
- **Zendesk**
- **Intercom**
- Others (contact support)

### Set Up Salesforce Integration

**Step 1: Get Salesforce Credentials**

You need:
- Salesforce instance URL (e.g., na1.salesforce.com)
- Client ID
- Client Secret

**To get these:**
1. Log into Salesforce
2. Go to Setup
3. Navigate to: Integrated Apps → API Integration
4. Create Connected App
5. Note: Client ID and Client Secret

**Step 2: Connect in Meta Chat**

1. Go to Integrations
2. Click **Salesforce**
3. Paste credentials:
   - Instance URL
   - Client ID
   - Client Secret
4. Click **Connect**

**Step 3: Map Fields**

Choose what data to sync:
- Conversation ID → Salesforce field
- User message → Notes field
- Chatbot response → Comments
- Timestamp → Date field
- Confidence score → Custom field

**Step 4: Test**

1. Go back to Integrations
2. Click **Test Salesforce Connection**
3. Creates test record
4. Verify in Salesforce

### Set Up HubSpot Integration

Similar process:

**Step 1: Create HubSpot App**
1. Log into HubSpot
2. Go to Settings
3. Apps & Integrations → Private Apps
4. Create private app
5. Generate access token

**Step 2: Add in Meta Chat**
1. Go to Integrations
2. Click **HubSpot**
3. Paste access token
4. Click **Connect**

**Step 3: Map Fields**
- Conversation ID
- Messages
- User info
- Timestamp
- Custom fields

## Zapier Integration

Connect to 1000+ apps through Zapier.

### What is Zapier?

**Zapier** is an automation platform that connects apps. You can:
- Send data from Meta Chat to other apps
- Trigger actions in other apps
- Create complex automations

### Zapier Examples

**Example 1: Send to Google Sheets**
- User asks question
- Conversation logged to Google Sheet
- Track conversations in a spreadsheet

**Example 2: Send to Slack**
- New conversation starts
- Slack message to #support channel
- Team sees new chat in real-time

**Example 3: Create Jira Ticket**
- Escalation triggered
- Jira ticket created automatically
- Assigned to support team

**Example 4: Send Email**
- High-confidence escalation
- Email sent to manager
- Include conversation summary

### Set Up Zapier

**Step 1: Create Zapier Account**
1. Go to zapier.com
2. Create free account
3. Log in

**Step 2: Create Zap**
1. Click **Create Zap**
2. Choose trigger: "Meta Chat"
3. Choose event: "New Message" or "Escalation"
4. Click **Continue**

**Step 3: Connect Meta Chat to Zapier**
1. Zapier asks for API key
2. Go to Meta Chat Dashboard
3. Settings → API Keys
4. Copy your API key
5. Paste into Zapier
6. Test connection

**Step 4: Set Action**
1. Choose app: Google Sheets, Slack, etc.
2. Choose action: Send, Create, Update
3. Map fields from Meta Chat

**Step 5: Test & Turn On**
1. Send test message to chatbot
2. Verify action triggered
3. Click **Turn on Zap**
4. Now it runs automatically

### Useful Zapier Recipes

**Contact form submission:**
```
Meta Chat: New Message
→ Zapier: Filter (if confidence < 0.5)
→ Zapier: Send email to support
→ Google Sheets: Add row with details
```

**Escalation workflow:**
```
Meta Chat: Escalation Triggered
→ Slack: Send to #escalations channel
→ Jira: Create ticket
→ Email: Notify manager
```

**Daily report:**
```
Schedule: Daily at 9 AM
→ Meta Chat: Get conversations from yesterday
→ Google Sheets: Add summary
→ Email: Send report
```

## API Access

For developers, use our API to build custom integrations.

### API Basics

**Base URL:**
```
https://api.metachats.ai/v1
```

**Authentication:**
```
Header: Authorization: Bearer YOUR_API_KEY
```

### Getting API Key

**Step 1: Go to API Keys**
1. Dashboard → Settings
2. Click **API Keys**

**Step 2: Create Key**
1. Click **Create New Key**
2. Name: "Webhook Integration" (describe use)
3. Scope: Choose permissions
4. Click **Create**

**Step 3: Copy Key**
1. You'll see key once
2. Copy immediately and save
3. Don't share with anyone

### API Endpoints

**Send Message:**
```bash
POST /chat
{
  "tenantId": "your_workspace_id",
  "message": "User message here",
  "conversationId": "optional_conv_id"
}
```

**Get Conversations:**
```bash
GET /conversations?limit=10&offset=0
```

**Get Documents:**
```bash
GET /documents
```

**Full API documentation:**
Visit: docs.metachats.ai/api

### API Code Example

```javascript
// Send a message via API
const response = await fetch('https://api.metachats.ai/v1/chat', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    tenantId: 'workspace_abc123',
    message: 'What is your shipping policy?',
    conversationId: 'conv_xyz789'
  })
});

const data = await response.json();
console.log(data.data.message);
```

## Custom Integrations

For features not listed, you can build custom integrations:

**Options:**
1. **Webhook + Your Backend:** Receive webhook events, process in your system
2. **API:** Call our API from your application
3. **Zapier:** Use Zapier's code tools for custom logic
4. **Contact Sales:** Request custom integration

## Troubleshooting

### Webhook Not Receiving Data

**Check:**
1. Is webhook enabled? (should say "Active")
2. Have events been triggered? (ask chatbot something)
3. Check webhook logs
4. Verify URL is correct and accessible

**Test:**
1. Go to webhook
2. Click **Test**
3. Check if your server receives test data

### CRM Not Syncing

**Check:**
1. Is integration connected?
2. Check credentials are correct
3. Verify API key hasn't expired
4. Check permissions in CRM

**Fix:**
1. Disconnect integration
2. Reconnect with fresh credentials
3. Re-test

### Zapier Zap Stopped

**Common reasons:**
1. API key expired
2. Zap has errors (check status)
3. Trigger or action changed

**Fix:**
1. Go to Zapier
2. Click on Zap
3. Check error message
4. Re-authenticate if needed
5. Turn Zap back on

## Integration Best Practices

**Security:**
- Never share API keys
- Rotate keys regularly
- Use different keys for different apps
- Revoke keys that aren't used

**Performance:**
- Don't send all events to all destinations
- Filter events (e.g., only high-confidence messages)
- Batch updates when possible

**Reliability:**
- Test integrations before going live
- Monitor webhook logs
- Set up alerts for failures
- Have manual fallback process

## Next Steps

### To Set Up More Integrations
1. Go to Integrations tab
2. Browse available options
3. Click to configure
4. Test before enabling

### To Build Custom Integration
Contact: developers@metachats.ai

We provide:
- API documentation
- Code examples
- Support for custom builds

## Key Takeaways

- Webhooks send event data to your systems
- CRMs like Salesforce sync automatically
- Zapier connects to 1000+ apps easily
- API for custom development
- Always test before going live
- Never share API keys

## Questions?

- **Can't connect to Salesforce?** Check credentials
- **Zapier not working?** Check API key is valid
- **Need custom integration?** Contact developers@metachats.ai

---

**Last Updated:** 2025-11-19
**Word Count:** 1,487 words
