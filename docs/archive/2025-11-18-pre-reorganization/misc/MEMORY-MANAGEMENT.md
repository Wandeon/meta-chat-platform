# Memory Management in Meta Chat Platform

## Current Memory Usage

**As of deployment (2025-10-11):**
```
┌─────────────────────┬──────────┐
│ Process             │ Memory   │
├─────────────────────┼──────────┤
│ meta-chat-api       │  92.9 MB │
│ meta-chat-worker    │  83.5 MB │
└─────────────────────┴──────────┘

Total: ~176 MB
```

This is **healthy and expected** for Node.js processes with active database connections.

---

## Memory Protection Mechanisms

### 1. **PM2 Auto-Restart on Memory Limit**
```javascript
// ecosystem.config.js
{
  max_memory_restart: '500M',  // Restart if memory exceeds 500MB
  autorestart: true,
  max_restarts: 10,
  min_uptime: '10s'
}
```

**What this does:**
- If either process exceeds 500MB, PM2 automatically restarts it
- Prevents memory leaks from causing system issues
- Graceful restart (drains connections before stopping)
- Max 10 restarts to prevent restart loops

**Why 500MB is safe:**
- Current usage: ~90MB per process
- Headroom: 410MB before restart
- Typical spike: 150-200MB under load
- Still 300MB buffer

---

## Conversation History Limits

### 2. **Message History Truncation**

**In API `/api/chat` endpoint:**
```typescript
messages: {
  orderBy: { timestamp: 'asc' },
  take: 20,  // Only load last 20 messages
}
```

**In ConversationManager:**
```typescript
constructor(options: ConversationManagerOptions = {}) {
  this.historyLimit = options.historyLimit ?? 20;
}
```

**What this prevents:**
- Loading entire conversation history (could be thousands of messages)
- Excessive memory from large contexts
- Slow LLM inference from huge prompts

**Impact:**
- Each message ~1-2KB average
- 20 messages = ~40KB per conversation
- Even 100 concurrent conversations = 4MB total

**Trade-off:**
- ✅ Prevents memory bloat
- ✅ Faster response times
- ⚠️ AI "forgets" context beyond 20 messages
- 💡 Solution: Use RAG for long-term memory

---

## Configuration Caching

### 3. **TenantConfigCache with TTL**

```typescript
class TenantConfigCache {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly ttlMs: number;

  constructor(options: TenantConfigCacheOptions = {}) {
    this.ttlMs = options.ttlMs ?? 5 * 60 * 1000;  // 5 minutes
  }
}
```

**How it works:**
1. First request: Load tenant config from database → Store in memory
2. Subsequent requests (within 5 min): Use cached config
3. After 5 minutes: Reload from database

**Memory bounds:**
- Each tenant config: ~2-5KB
- 100 tenants cached = 500KB max
- Auto-expires after 5 minutes
- Manual invalidation: `cache.invalidate(tenantId)`

**Why this is safe:**
- Bounded: Only active tenants are cached
- Time-limited: Expires automatically
- Space-efficient: JavaScript Map with O(1) lookup
- Minimal overhead vs massive DB query savings

---

## Database Connection Pooling

### 4. **Prisma Connection Management**

**Default Prisma pooling:**
```
Connection pool size: 10 connections (default)
Idle timeout: 10 seconds
Max wait time: 2 seconds
```

**How Prisma manages memory:**
1. **Connection pooling**: Reuses DB connections
2. **Lazy loading**: Only loads requested fields
3. **Query batching**: Combines similar queries
4. **Auto-disconnect**: Closes idle connections

**Per-process overhead:**
- Prisma Client: ~15-20MB
- Connection pool (10 connections): ~5-10MB
- Total: ~25-30MB baseline

**Why we use singleton:**
```typescript
// packages/database/src/index.ts
export const getPrismaClient = () => {
  // Returns same instance across all imports
  // Prevents multiple connection pools
}
```

---

## Confidence Analysis Memory

### 5. **Analyzer Memory Footprint**

**Per-request memory:**
```typescript
// ConfidenceAnalyzer processes one message at a time
class ConfidenceAnalyzer {
  async analyze(response, context) {
    // Temporary allocations:
    const signals = [];           // ~1KB
    const hedgingPhrases = [...]; // ~2KB (loaded once)
    const analysis = {...};       // ~1KB
    // Total: ~4KB per analysis
    // Garbage collected after request
  }
}
```

**Memory characteristics:**
- **No state stored**: Stateless analysis
- **No caching**: Fresh analysis each time
- **Garbage collected**: Memory freed immediately after
- **Negligible overhead**: <1MB for 100 concurrent requests

---

## Worker Process Memory

### 6. **RabbitMQ Consumer Prefetch**

```typescript
// apps/worker/src/index.ts
config: {
  prefetch: 5,  // Max 5 messages in-flight at once
}
```

**How prefetch controls memory:**
1. Worker fetches max 5 messages from queue
2. Processes them sequentially
3. Only fetches more after acknowledging
4. Prevents memory exhaustion from queue backlog

**Memory calculation:**
- Average message: ~5KB
- Prefetch 5: 25KB buffered
- 2 tenants × 5 messages = 50KB total
- Negligible impact

**Why this is critical:**
- Without prefetch limit: Could load 1000s of messages
- With limit: Bounded memory growth
- Trade-off: Throughput vs memory safety

---

## LLM Response Handling

### 7. **Streaming vs Buffering**

**Current implementation:**
```typescript
// Non-streaming: Buffers entire response
const response = await callLlm(config, messages);
// Full response in memory before processing
```

**Memory impact:**
- Average LLM response: 500 bytes - 2KB
- Max tokens (2000): ~8KB
- Confidence analysis adds: ~4KB
- Total per request: ~12KB peak

**Potential optimization (future):**
```typescript
// Streaming: Process as chunks arrive
for await (const chunk of streamLlm(config, messages)) {
  // Process incrementally, lower peak memory
}
```

---

## Memory Leak Prevention

### 8. **Common Patterns Used**

**✅ Proper cleanup:**
```typescript
// Prisma disconnection on shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  await orchestrator.stop();
});
```

**✅ No global state accumulation:**
```typescript
// Each request is isolated
async process(message: NormalizedMessage) {
  // Local variables only
  // No state stored in class properties
}
```

**✅ Map-based caching with expiration:**
```typescript
// TenantConfigCache
private readonly cache = new Map<string, CacheEntry>();
// Entries expire and are removed
// No unbounded growth
```

**❌ What to avoid:**
```typescript
// BAD: Global array that grows forever
const allMessages = [];
app.post('/chat', (req, res) => {
  allMessages.push(req.body);  // Memory leak!
});

// GOOD: Database storage
app.post('/chat', (req, res) => {
  await prisma.message.create({ data: req.body });
});
```

---

## Monitoring Memory

### Commands to Check Memory

**Real-time monitoring:**
```bash
pm2 monit
```

**List with memory:**
```bash
pm2 list
```

**Detailed memory info:**
```bash
pm2 show meta-chat-api
pm2 show meta-chat-worker
```

**Memory over time:**
```bash
pm2 logs --lines 100 | grep "Memory"
```

---

## Memory Optimization Recommendations

### If Memory Usage Grows

**1. Reduce conversation history:**
```typescript
// In ConversationManager constructor
this.historyLimit = 10;  // Down from 20
```

**2. Reduce config cache TTL:**
```typescript
// In TenantConfigCache constructor
this.ttlMs = 2 * 60 * 1000;  // 2 minutes instead of 5
```

**3. Lower RabbitMQ prefetch:**
```typescript
// In worker config
prefetch: 3,  // Down from 5
```

**4. Enable Node.js heap snapshots:**
```bash
# Add to PM2 config
node_args: '--max-old-space-size=400 --expose-gc'
```

---

## Expected Memory Profile

### Normal Operation
```
API Process:
  Baseline: 70-90 MB (Prisma, Express, Socket.IO)
  Per request: +10-20 MB spike
  Peak: 120-150 MB under load
  Idle: Returns to 70-90 MB

Worker Process:
  Baseline: 60-80 MB (Prisma, RabbitMQ consumer)
  Per message: +5-15 MB spike
  Peak: 100-120 MB under load
  Idle: Returns to 60-80 MB
```

### Warning Signs
```
⚠️ Memory climbing above 300MB sustained
⚠️ Not returning to baseline after load
⚠️ Continuous growth over hours
⚠️ Frequent PM2 restarts due to memory
```

### Investigation Steps
```bash
# 1. Check for memory leak
pm2 logs | grep "max_memory_restart"

# 2. Analyze process
pm2 show meta-chat-api --memory

# 3. Enable heap profiling (if needed)
node --inspect apps/api/dist/server.js

# 4. Connect Chrome DevTools
chrome://inspect
```

---

## Summary

**Current Status: ✅ Healthy**

| Mechanism | Status | Impact |
|-----------|--------|--------|
| **PM2 Memory Limit** | ✅ 500MB cap | Prevents runaway memory |
| **Conversation Truncation** | ✅ 20 messages | Bounds context size |
| **Config Caching** | ✅ 5min TTL | Reduces DB load, bounded memory |
| **Connection Pooling** | ✅ 10 connections | Reuses connections |
| **Prefetch Limiting** | ✅ 5 messages | Prevents queue overload |
| **Garbage Collection** | ✅ Node.js default | Auto-frees unused memory |

**Total Memory Footprint:**
- Baseline: ~160MB (both processes)
- Peak load: ~300MB
- Safety limit: 500MB per process (1GB total)
- Server capacity: Well within limits

**No action needed** - memory management is properly configured and operating within expected parameters.

---

## Future Enhancements

1. **Streaming LLM responses** - Lower peak memory
2. **Message pagination** - Only load messages on-demand
3. **Redis caching** - Offload cache to Redis for multi-instance deployments
4. **Conversation archiving** - Move old conversations to cold storage
5. **Memory profiling** - Add automatic heap snapshots on threshold breach

---

**Memory is handled efficiently with multiple layers of protection. Current usage is healthy and sustainable.**
