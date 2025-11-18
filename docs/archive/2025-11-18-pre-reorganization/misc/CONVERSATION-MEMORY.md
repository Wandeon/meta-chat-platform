# Conversation Memory - How the LLM Remembers Users

## ✅ YES - The LLM Remembers Previous Conversations!

The system **automatically loads conversation history** and provides it to the LLM, so it remembers:
- What the user said before
- What the AI responded
- The context of the ongoing conversation

**Limit:** Last **20 messages** (configurable)

---

## 🔄 How It Works

### Webchat (Browser)

```
User first visit:
  ├─ Browser requests chat
  ├─ System creates new conversation with unique ID
  ├─ Returns conversationId to browser
  └─ Browser stores in localStorage/cookie

User sends message #1:
  ├─ POST /api/chat { conversationId: "abc123", message: "Hi" }
  ├─ System loads conversation "abc123"
  ├─ No history yet (new conversation)
  ├─ LLM generates response
  └─ Saves both messages to database

User sends message #2:
  ├─ POST /api/chat { conversationId: "abc123", message: "What's your name?" }
  ├─ System loads conversation "abc123"
  ├─ ✨ Loads last 20 messages from database
  ├─ Sends to LLM:
  │   [
  │     { role: "user", content: "Hi" },
  │     { role: "assistant", content: "Hello! How can I help?" },
  │     { role: "user", content: "What's your name?" }
  │   ]
  └─ LLM remembers previous "Hi" message!

User comes back tomorrow:
  ├─ Browser still has conversationId in localStorage
  ├─ Sends same conversationId with new message
  ├─ System loads same conversation
  ├─ ✨ Loads last 20 messages from database
  └─ LLM has full context from yesterday!
```

**Code:**
```typescript
// apps/api/src/routes/chat.ts:62-71
if (payload.conversationId) {
  conversation = await prisma.conversation.findUnique({
    where: { id: payload.conversationId },
    include: {
      messages: {
        orderBy: { timestamp: 'asc' },
        take: 20,  // Load last 20 messages
      },
    },
  });
}
```

---

### WhatsApp / Messenger

```
User (phone: +1234567890) sends first message:
  ├─ Webhook receives message from +1234567890
  ├─ System looks for conversation with externalId = "+1234567890"
  ├─ Not found → Creates new conversation
  ├─ Saves message to database
  └─ LLM processes (no history yet)

Same user sends second message:
  ├─ Webhook receives message from +1234567890
  ├─ System looks for conversation with externalId = "+1234567890"
  ├─ ✨ Found! Loads existing conversation
  ├─ ✨ Loads last 20 messages from database
  ├─ Sends full history to LLM
  └─ LLM remembers previous conversation!

User messages 3 days later:
  ├─ Same phone number = same externalId
  ├─ System finds same conversation
  ├─ ✨ Loads last 20 messages
  └─ LLM has context from 3 days ago!
```

**Code:**
```typescript
// packages/orchestrator/src/conversation-manager.ts:27
const externalId = message.conversationId ?? message.from;

// Creates or finds conversation by unique key:
where: {
  tenantId_channelType_externalId: {
    tenantId: "tenant-123",
    channelType: "whatsapp",
    externalId: "+1234567890"  // Phone number
  }
}
```

---

## 🔑 How Users Are Identified

### Webchat
```
Identifier: conversationId (UUID)
Storage: Browser localStorage or cookie
Example: "cm12abc45def67890"

How it persists:
  ✅ Same browser = same conversation
  ✅ User closes tab = conversation persists
  ✅ User clears cookies = loses conversation (starts new)
  ✅ Different browser/device = different conversation
```

### WhatsApp
```
Identifier: Phone number
Storage: WhatsApp platform manages this
Example: "+1234567890"

How it persists:
  ✅ Same phone number = same conversation
  ✅ Works across devices (if same WhatsApp account)
  ✅ Never expires (unless manually deleted)
  ✅ User reinstalls WhatsApp = same conversation
```

### Messenger
```
Identifier: Facebook user ID (PSID)
Storage: Facebook platform manages this
Example: "1234567890123456"

How it persists:
  ✅ Same Facebook account = same conversation
  ✅ Works across devices
  ✅ Never expires (unless manually deleted)
  ✅ Persists even if user unfollows/blocks
```

---

## 📊 Database Schema

```sql
-- Conversations table
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  channel_type TEXT NOT NULL,
  external_id TEXT NOT NULL,  -- conversationId or phone/user ID
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_message_at TIMESTAMP,

  UNIQUE(tenant_id, channel_type, external_id)  -- Prevents duplicates
);

-- Messages table
CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT REFERENCES conversations(id),
  direction TEXT,  -- 'inbound' or 'outbound'
  from_user TEXT,
  type TEXT,
  content JSONB,
  timestamp TIMESTAMP,

  INDEX idx_conversation_timestamp (conversation_id, timestamp)
);
```

**How lookup works:**
```sql
-- Find conversation by identifier
SELECT * FROM conversations
WHERE tenant_id = 'tenant-123'
  AND channel_type = 'whatsapp'
  AND external_id = '+1234567890';

-- Load recent messages
SELECT * FROM messages
WHERE conversation_id = 'conv-abc123'
ORDER BY timestamp DESC
LIMIT 20;
```

---

## 💾 What's Stored vs What's Sent to LLM

### Everything is Stored (Database)
```sql
-- All messages are saved forever
SELECT COUNT(*) FROM messages
WHERE conversation_id = 'conv-123';
-- Result: 847 messages (entire conversation history)
```

### Only Recent Messages Sent to LLM
```typescript
// Only last 20 loaded into LLM context
const history = await getRecentMessages(conversationId, 20);

// LLM sees:
[
  { role: "user", content: "Message from 2 hours ago" },
  { role: "assistant", content: "Response" },
  ...
  { role: "user", content: "Current message" }
]
// Total: 20 most recent messages
```

**Why limit to 20?**
1. **Cost**: LLM charges by token (words sent)
2. **Speed**: Larger context = slower response
3. **Memory**: Prevents excessive memory usage
4. **Quality**: LLMs work better with focused context

**What if conversation is longer?**
- Messages 1-800: Stored in database, not sent to LLM
- Messages 801-820: **Sent to LLM** (last 20)
- Message 821: New user message

The AI won't remember specifics from message #5, but it's still in the database.

---

## 🔧 Configuration

### Change History Limit

**For Webchat (API):**
```typescript
// apps/api/src/routes/chat.ts:68
take: 20,  // Change to 10, 30, 50, etc.
```

**For WhatsApp/Messenger (Worker):**
```typescript
// packages/orchestrator/src/conversation-manager.ts:19
this.historyLimit = options.historyLimit ?? 20;

// To change:
const manager = new ConversationManager({
  historyLimit: 30  // Load 30 messages instead of 20
});
```

**Trade-offs:**

| Limit | Pros | Cons |
|-------|------|------|
| 10 | Faster, cheaper, less memory | Less context, AI "forgets" sooner |
| 20 | **Balanced** (current default) | Good for most use cases |
| 50 | More context, better continuity | Slower, more expensive, more memory |
| 100 | Full conversation memory | Very slow, expensive, memory intensive |

---

## 🧪 Test It Yourself

### Webchat Test

```bash
# First message
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "cmgjuow6q0000g5jwvwyopzk6",
    "message": "Hi, my name is John"
  }'

# Response includes: { "conversationId": "abc123", ... }

# Second message (with conversationId)
curl -X POST http://localhost:3000/api/chat \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "cmgjuow6q0000g5jwvwyopzk6",
    "conversationId": "abc123",
    "message": "What is my name?"
  }'

# Response: "Your name is John" ✅ AI remembered!
```

### Database Verification

```sql
-- Find conversation
SELECT id, external_id, user_id, status
FROM conversations
WHERE external_id LIKE '%abc123%';

-- See all messages in conversation
SELECT
  direction,
  content->>'text' as message_text,
  timestamp
FROM messages
WHERE conversation_id = 'abc123'
ORDER BY timestamp ASC;
```

---

## 📋 Examples

### Example 1: Shopping Assistant

```
User: "I'm looking for a laptop"
AI: "What's your budget and main use case?"

User: "Under $1000, for programming"
AI: "I recommend these models..." [suggests 3 laptops]

[User closes browser, comes back next day]

User: "Tell me more about the first one you mentioned"
AI: ✅ "The Dell XPS 13 I mentioned has..."
     (Remembers from yesterday because same conversationId!)
```

### Example 2: Customer Support

```
WhatsApp conversation:

+1234567890: "My order hasn't arrived"
AI: "I'm sorry to hear that. What's your order number?"

+1234567890: "ORDER-12345"
AI: "Let me check... Your order was shipped on Jan 10"

[3 hours later, same number messages again]

+1234567890: "Any update?"
AI: ✅ "Regarding your ORDER-12345, I checked..."
     (Remembers the order number from earlier!)
```

### Example 3: Multi-turn Troubleshooting

```
User: "My app keeps crashing"
AI: "What device are you using?"

User: "iPhone 12"
AI: "What version of iOS?"

User: "iOS 16.5"
AI: "Try updating to 16.6..."

User: "I updated, still crashing"
AI: ✅ "Since the update to 16.6 didn't help, let's try..."
     (Remembers all previous steps in the conversation!)
```

---

## ⚠️ Limitations

### 1. **20 Message Window**
```
Messages 1-5:   "What's your company's return policy?"
Messages 6-25:  [Discussion about products]
Message 26:     "What was the return policy again?"

AI Response: ❌ "I don't recall discussing the return policy"
Reason: Message 1-5 are beyond the 20-message window
```

**Solution:**
- Use RAG (document search) for factual info
- Increase history limit to 30-50 if needed
- Create conversation summaries (future feature)

### 2. **Browser-Specific (Webchat)**
```
Same user, Chrome:     conversationId = "abc123"
Same user, Firefox:    conversationId = "xyz789"  (different!)

AI won't know it's the same person across browsers
```

**Solution:**
- Implement user authentication
- Store conversationId server-side with user account
- Use persistent cookies across browsers

### 3. **No Cross-Channel Memory**
```
User on WhatsApp:  "I'm interested in Product X"
Same user on Web:  "What was I looking at?"

AI: ❌ "I don't have that information"
Reason: WhatsApp and Webchat are separate conversations
```

**Solution:**
- Implement user accounts
- Link conversations across channels
- Shared conversation history (future feature)

---

## 🚀 Future Enhancements

### 1. **Conversation Summaries**
```typescript
// After 20 messages, create summary
const summary = await llm.summarize(oldMessages);
// Prepend summary to new messages
// LLM sees: [summary] + [last 20 messages]
```

### 2. **Semantic Search Over History**
```typescript
// Instead of last 20 messages, search for relevant ones
const relevantMessages = await searchHistory(
  conversationId,
  currentMessage,
  limit: 10
);
```

### 3. **User Profiles**
```typescript
// Extract and persist user info
userProfile = {
  name: "John",
  preferences: ["laptop", "programming"],
  previousOrders: ["ORDER-12345"]
};
// Include in every LLM request
```

---

## ✅ Summary

**Current Implementation:**

| Channel | Identifier | Persistence | History Loaded |
|---------|-----------|-------------|----------------|
| **Webchat** | conversationId (UUID) | Browser storage | Last 20 messages ✅ |
| **WhatsApp** | Phone number | Platform-managed | Last 20 messages ✅ |
| **Messenger** | Facebook PSID | Platform-managed | Last 20 messages ✅ |

**Memory Characteristics:**
- ✅ **Automatic**: No configuration needed
- ✅ **Persistent**: Conversations stored in database forever
- ✅ **Multi-turn**: LLM remembers previous exchanges
- ✅ **Configurable**: History limit can be adjusted
- ⚠️ **Limited**: Only last 20 messages sent to LLM
- ⚠️ **Channel-isolated**: Separate conversations per channel

**The LLM DOES remember users** - as long as they use the same identifier (conversationId, phone number, or Facebook ID)!

---

## 📖 Related Documentation

- `MEMORY-MANAGEMENT.md` - How system memory is managed
- `apps/api/src/routes/chat.ts:62-130` - Webchat history loading
- `packages/orchestrator/src/conversation-manager.ts` - Conversation persistence
- `packages/orchestrator/src/message-pipeline.ts:100` - Worker history loading
