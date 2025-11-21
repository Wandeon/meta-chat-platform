# WhatsApp Integration

This document describes how to set up and configure WhatsApp Business API integration with the Meta Chat Platform.

## Overview

The WhatsApp integration allows you to:
- Receive incoming messages from WhatsApp users
- Send messages to WhatsApp users
- Handle media attachments (images, audio, video, documents)
- Process location messages
- Verify webhook authenticity using HMAC signatures

## Prerequisites

1. WhatsApp Business Account
2. Facebook Developer Account
3. WhatsApp Business API access
4. Phone number registered with WhatsApp Business

## Webhook Configuration

### Webhook URL Format

The WhatsApp webhook endpoint follows this format:

```
POST /api/webhooks/whatsapp/:channelId
GET  /api/webhooks/whatsapp/:channelId
```

Where `:channelId` is the unique identifier for your WhatsApp channel in the Meta Chat Platform.

**Example:**
```
https://chat.genai.hr:3007/api/webhooks/whatsapp/clx1234567890abcdef
```

### Webhook Verification (GET Request)

When you configure the webhook in Facebook Developer Console, WhatsApp will send a GET request to verify the endpoint:

**Query Parameters:**
- `hub.mode` - Should be "subscribe"
- `hub.verify_token` - Your configured verification token
- `hub.challenge` - A random string to echo back

**Response:**
The endpoint will return the `hub.challenge` value if verification succeeds.

### Webhook Events (POST Request)

WhatsApp sends POST requests to this endpoint when messages are received.

**Headers:**
- `X-Hub-Signature-256` - HMAC SHA256 signature for payload verification
- `Content-Type` - application/json

**Payload Structure:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [
        {
          "field": "messages",
          "value": {
            "metadata": {
              "display_phone_number": "15551234567",
              "phone_number_id": "123456789"
            },
            "contacts": [
              {
                "wa_id": "16315551212",
                "profile": {
                  "name": "John Doe"
                }
              }
            ],
            "messages": [
              {
                "from": "16315551212",
                "id": "wamid.HBgLSomeId",
                "timestamp": "1700000000",
                "type": "text",
                "text": {
                  "body": "Hello there"
                }
              }
            ]
          }
        }
      ]
    }
  ]
}
```

## Channel Configuration

### Required Configuration Fields

When creating a WhatsApp channel in the Meta Chat Platform, configure the following fields:

```json
{
  "type": "whatsapp",
  "enabled": true,
  "config": {
    "phoneNumberId": "YOUR_PHONE_NUMBER_ID",
    "businessAccountId": "YOUR_BUSINESS_ACCOUNT_ID",
    "accessToken": "YOUR_ACCESS_TOKEN",
    "webhookVerifyToken": "YOUR_VERIFY_TOKEN",
    "appSecret": "YOUR_APP_SECRET"
  }
}
```

### Configuration Fields

| Field | Description | Required |
|-------|-------------|----------|
| `phoneNumberId` | WhatsApp phone number ID from Facebook Developer Console | Yes |
| `businessAccountId` | WhatsApp Business Account ID | Yes |
| `accessToken` | Access token for WhatsApp Business API | Yes |
| `webhookVerifyToken` | Token used for webhook verification | Yes |
| `appSecret` | App secret for HMAC signature verification | Yes |

### Alternative: Use Secrets

For enhanced security, you can store sensitive values in the channel's `secrets` field:

```json
{
  "secrets": {
    "accessToken": "YOUR_ACCESS_TOKEN",
    "appSecret": "YOUR_APP_SECRET"
  }
}
```

## Security

### Webhook Signature Verification

All incoming webhooks are verified using HMAC SHA256 signatures:

1. Facebook sends the signature in the `X-Hub-Signature-256` header
2. The platform computes the expected signature using the `appSecret`
3. Signatures are compared using timing-safe comparison to prevent timing attacks
4. Requests with invalid signatures are rejected with HTTP 401

### Verification Token

The verification token should be:
- At least 32 characters long
- Randomly generated
- Kept secret
- Unique per channel

## Setup Instructions

### 1. Create WhatsApp Business App

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select existing app
3. Add WhatsApp product
4. Complete WhatsApp setup wizard

### 2. Get Required Credentials

From the Facebook Developer Console:
- **Phone Number ID**: WhatsApp > API Setup > Phone number ID
- **Business Account ID**: WhatsApp > API Setup > WhatsApp Business Account ID
- **Access Token**: WhatsApp > API Setup > Temporary/Permanent access token
- **App Secret**: Settings > Basic > App Secret

### 3. Create Channel in Meta Chat Platform

```bash
POST /api/channels
Content-Type: application/json

{
  "tenantId": "YOUR_TENANT_ID",
  "type": "whatsapp",
  "enabled": true,
  "config": {
    "phoneNumberId": "PHONE_NUMBER_ID",
    "businessAccountId": "BUSINESS_ACCOUNT_ID",
    "accessToken": "ACCESS_TOKEN",
    "webhookVerifyToken": "RANDOM_32_CHAR_STRING",
    "appSecret": "APP_SECRET"
  }
}
```

Save the returned `channel.id` - you'll need it for the webhook URL.

### 4. Configure Webhook in Facebook

1. Go to WhatsApp > Configuration in Facebook Developer Console
2. Click "Edit" on Webhook
3. Enter callback URL: `https://your-domain.com/api/webhooks/whatsapp/{CHANNEL_ID}`
4. Enter verify token (same as `webhookVerifyToken` in channel config)
5. Click "Verify and Save"
6. Subscribe to webhook fields:
   - `messages`
   - `message_status` (optional)
   - `message_echoes` (optional)

### 5. Test the Integration

Send a test message to your WhatsApp Business number and check the logs:

```bash
pm2 logs meta-chat-api --lines 100 | grep -i whatsapp
```

## Supported Message Types

### Text Messages

```json
{
  "type": "text",
  "text": {
    "body": "Message content"
  }
}
```

### Image Messages

```json
{
  "type": "image",
  "image": {
    "id": "MEDIA_ID",
    "mime_type": "image/jpeg",
    "caption": "Optional caption"
  }
}
```

### Audio Messages

```json
{
  "type": "audio",
  "audio": {
    "id": "MEDIA_ID",
    "mime_type": "audio/ogg"
  }
}
```

### Video Messages

```json
{
  "type": "video",
  "video": {
    "id": "MEDIA_ID",
    "mime_type": "video/mp4",
    "caption": "Optional caption"
  }
}
```

### Document Messages

```json
{
  "type": "document",
  "document": {
    "id": "MEDIA_ID",
    "filename": "document.pdf",
    "mime_type": "application/pdf",
    "caption": "Optional caption"
  }
}
```

### Location Messages

```json
{
  "type": "location",
  "location": {
    "latitude": 37.4224764,
    "longitude": -122.0842499,
    "name": "Optional name",
    "address": "Optional address"
  }
}
```

## Troubleshooting

### Webhook Not Receiving Messages

1. **Check webhook configuration in Facebook**
   - Verify the callback URL is correct
   - Ensure webhook is subscribed to `messages` field
   - Check that verification succeeded

2. **Check channel configuration**
   ```bash
   GET /api/channels/{CHANNEL_ID}
   ```
   - Verify `enabled: true`
   - Verify `type: "whatsapp"`
   - Verify all required config fields are present

3. **Check logs**
   ```bash
   pm2 logs meta-chat-api --lines 200 | grep -i whatsapp
   ```

### Verification Fails

1. **Check verify token matches**
   - The token in Facebook Developer Console must exactly match `webhookVerifyToken` in channel config

2. **Check channel exists**
   - The channel ID in the URL must exist in the database
   - The channel must be of type `whatsapp`

### Signature Verification Fails

1. **Check app secret is correct**
   - App secret must match the one from Facebook Developer Console > Settings > Basic

2. **Check raw body is preserved**
   - The platform must receive the raw request body to verify signatures
   - Express middleware must use `rawBody` verification option

## API Reference

### Webhook Event Storage

All received webhook events are stored in the `webhookEvent` table:

```typescript
{
  tenantId: string;
  channelId: string;
  source: "whatsapp";
  eventType: "message.received";
  payload: {
    message: WhatsAppWebhookMessage;
    metadata: WhatsAppMetadata;
    contacts: WhatsAppContact[];
  };
  status: "pending" | "processing" | "completed" | "failed";
}
```

### Environment Variables

Optional environment variables for fallback configuration:

```bash
WHATSAPP_VERIFY_TOKEN=default-verify-token
WHATSAPP_APP_SECRET=default-app-secret
```

## Best Practices

1. **Use HTTPS only** - WhatsApp requires HTTPS for webhooks
2. **Store secrets securely** - Use the channel's `secrets` field for sensitive data
3. **Monitor webhook events** - Set up alerts for failed webhook deliveries
4. **Handle rate limits** - WhatsApp has rate limits on API calls
5. **Validate incoming data** - Always validate webhook payloads
6. **Use unique verify tokens** - Generate unique tokens per channel
7. **Rotate access tokens** - Periodically rotate access tokens for security

## Related Documentation

- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Webhook Security](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/message-templates)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review API logs for error messages
3. Verify Facebook Developer Console configuration
4. Contact platform support with relevant log excerpts
