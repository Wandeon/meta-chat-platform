# Metrica + Ollama Testing Guide

**Testing the Metrica tenant with Ollama (Llama 3.1 8B)** | Created: 2025-10-09

---

## ✅ Configuration Complete

The **Metrica** tenant has been successfully configured to use:

- **Provider:** Ollama (free, local models with GPU acceleration)
- **Model:** llama3:latest (8B parameters)
- **Base URL:** http://gpu-01.taildb94e1.ts.net:11434
- **Server:** gpu-01.taildb94e1.ts.net (100.100.47.43 via Tailscale)
- **Temperature:** 0.7 (balanced creativity)
- **Max Tokens:** 2000
- **System Prompt:** Professional AI assistant style

**Tenant ID:** `cmgjuow6q0000g5jwvwyopzk6`

### Available Models on Your Server
- **llama3:latest** (8B) - Currently configured ✅
- **llama3:70b** - More capable, slower
- **phi3:latest** (3.8B) - Faster, smaller
- **DeepSeek-R1-0528-Qwen3-8B** - Reasoning model
- **mxbai-embed-large** - Embeddings model

---

## 🧪 How to Test

### Option 1: Dashboard Testing (Easiest)

1. **Login to Dashboard:**
   - Go to https://chat.genai.hr
   - Login with admin key: `adm_t6DPQnsQFAzsKXZaVd3uC5KBzrzs-CWZLZozyG7TqPs`

2. **Navigate to Testing:**
   - Click **"Testing"** in the left sidebar
   - Select **"Metrica"** from the tenant dropdown

3. **Test Conversation:**
   - Type: "Hello! What can you help me with?"
   - Press Enter
   - Wait for Ollama response (may take 5-10 seconds on CPU)

4. **Check Response Metadata:**
   - Look at the right sidebar for:
     - Model: llama3.1:8b
     - Latency: Time to respond
     - Token usage

### Option 2: API Testing (Direct)

First, you'll need to create an API key for Metrica:

```bash
# Create a tenant API key (replace with actual endpoint if available)
curl -X POST https://chat.genai.hr/api/tenants/cmgjuow6q0000g5jwvwyopzk6/api-keys \
  -H "x-admin-key: adm_t6DPQnsQFAzsKXZaVd3uC5KBzrzs-CWZLZozyG7TqPs" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "Testing Key"
  }'
```

Then test with the tenant API key:

```bash
# Test chat endpoint
curl -X POST https://chat.genai.hr/api/chat \
  -H "x-api-key: YOUR_TENANT_API_KEY_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! What can you help me with?",
    "conversationId": null
  }'
```

---

## 📋 Test Scenarios

### 1. Basic Greeting
**Input:** "Hello! What can you help me with?"
**Expected:** Friendly introduction mentioning Metrica, listing capabilities

### 2. Professional Query
**Input:** "Can you explain what Metrica does?"
**Expected:** Professional explanation based on system prompt

### 3. Follow-up Question
**Input:** "That's interesting. Can you tell me more about your features?"
**Expected:** Detailed response maintaining conversation context

### 4. Technical Question
**Input:** "How does AI language modeling work?"
**Expected:** Clear technical explanation in professional tone

### 5. Multi-turn Conversation
- Start a conversation with a question
- Ask 3-4 follow-up questions
- Verify context is maintained across messages

---

## 🔍 What to Check

### ✅ Response Quality
- [ ] Responses are coherent and relevant
- [ ] Professional tone is maintained
- [ ] Context from previous messages is remembered
- [ ] Answers are accurate and helpful

### ✅ Performance
- [ ] First response time: 5-15 seconds (CPU) or 1-3 seconds (GPU)
- [ ] Subsequent responses: Similar latency
- [ ] No timeout errors
- [ ] Stable connection to ArtemiPC

### ✅ Technical Details
- [ ] Model shows as "llama3.1:8b"
- [ ] Token usage is reasonable (check metadata)
- [ ] Conversation ID persists across messages
- [ ] No error messages in responses

---

## ⚠️ Troubleshooting

### Slow Responses (>30 seconds)
**Possible Causes:**
- gpu-01 is under heavy load
- Ollama isn't running on gpu-01
- Network latency between servers (Tailscale connection)

**Check:**
```bash
# From the API server, test Ollama connectivity
curl -s http://gpu-01.taildb94e1.ts.net:11434/api/tags | head -20
```

**Fix:**
- Restart Ollama on gpu-01: `systemctl restart ollama`
- Check gpu-01 GPU/CPU/memory usage
- Try a smaller model: `phi3:latest` (3.8B)
- Check Tailscale connection: `ping gpu-01.taildb94e1.ts.net`

### Connection Errors
**Error:** "Failed to connect to Ollama"

**Check:**
```bash
# Can the API server reach gpu-01?
ping -c 3 gpu-01.taildb94e1.ts.net

# Is Ollama responding?
curl http://gpu-01.taildb94e1.ts.net:11434/api/version
```

**Fix:**
- Ensure gpu-01 is online and connected to Tailscale
- Check Tailscale status on both servers: `tailscale status`
- Verify firewall allows port 11434
- Test direct IP connection: `curl http://100.100.47.43:11434/api/tags`

### Model Not Found
**Error:** "Model not found"

**Check available models on gpu-01:**
```bash
# SSH to gpu-01 or run locally
ollama list

# Expected output shows:
# - llama3:latest ✅ (currently configured)
# - llama3:70b (larger, better quality)
# - phi3:latest (smaller, faster)
# - DeepSeek-R1-0528-Qwen3-8B
```

**To use a different model:**
1. Go to dashboard → Tenants → Metrica → Settings
2. Change Model dropdown to your preferred model
3. Save settings

### Poor Response Quality
**Issue:** Responses are incoherent or repetitive

**Try:**
- Lower temperature: 0.5 (in dashboard settings)
- Increase max tokens: 3000
- Use a different model: `mistral:7b`

---

## 🔧 Configuration Options

You can adjust Metrica's settings in the dashboard:

### Temperature (Currently: 0.7)
- **0.0-0.3:** Very focused, deterministic (good for facts)
- **0.4-0.7:** Balanced (recommended)
- **0.8-1.2:** Creative, varied responses
- **1.3-2.0:** Very creative, can be unpredictable

### Max Tokens (Currently: 2000)
- **500-1000:** Short responses
- **1000-2000:** Medium responses (recommended)
- **2000-4000:** Long, detailed responses

### System Prompt
Current: "You are Metrica AI Assistant, a helpful and professional AI assistant. You provide clear, accurate, and concise responses."

You can modify this to:
- Add specific domain knowledge
- Change the personality
- Add guardrails or constraints
- Include company-specific information

---

## 📊 Performance Benchmarks

### Actual Performance (llama3:latest 8B on gpu-01)

**Test Result (verified):**
- Model load time: ~4.2 seconds
- Prompt evaluation: ~13 seconds
- Token generation: ~6.8 seconds
- **Total response time: ~24 seconds** for simple prompt

**Your GPU Setup:**
- Server: gpu-01.taildb94e1.ts.net (via Tailscale)
- Model: llama3:latest (8B parameters)
- Network latency: ~30-60ms (Tailscale)

**Performance varies by:**
- GPU load and temperature
- Prompt complexity and length
- Response length
- Concurrent requests
- Network conditions

**Typical Range:**
- Simple queries: 10-20 seconds
- Complex queries: 20-40 seconds
- Long responses: 30-60 seconds

**Memory Usage:**
- Model size: ~4.7GB
- GPU VRAM: 6GB+ recommended

---

## 🎯 Success Criteria

The configuration is working correctly if:

✅ Dashboard shows:
- Provider: ollama
- Model: llama3.1:8b
- No error messages

✅ Testing page shows:
- Responses arrive within 30 seconds
- Responses are coherent and relevant
- Token usage is displayed
- Conversation continues across multiple messages

✅ Performance is acceptable:
- Response time under 30 seconds
- No timeout errors
- Stable connection

---

## 🚀 Next Steps

### 1. Compare with Other Providers
Test the same prompts with:
- OpenAI GPT-4o (fastest, most expensive)
- DeepSeek (good quality, very cheap)
- Anthropic Claude (best reasoning)

### 2. Optimize Performance
If Ollama is too slow:
- Use smaller model: `llama3.2:3b` or `phi3:3.8b`
- Add GPU to ArtemiPC
- Increase ArtemiPC RAM

### 3. Production Deployment
Once testing is successful:
- Create tenant-specific API keys
- Set up monitoring
- Configure rate limits
- Add error handling

---

## 📝 Testing Checklist

Use this checklist when testing:

- [ ] Can login to dashboard
- [ ] Can select Metrica tenant
- [ ] Can send test message
- [ ] Response arrives within 30 seconds
- [ ] Response quality is good
- [ ] Follow-up questions maintain context
- [ ] Metadata shows correct model
- [ ] Token usage is reasonable
- [ ] No error messages
- [ ] Performance is acceptable for use case

---

## 🔗 Useful Links

- **Dashboard:** https://chat.genai.hr
- **Testing Page:** https://chat.genai.hr/testing
- **Tenant Settings:** https://chat.genai.hr/tenants/cmgjuow6q0000g5jwvwyopzk6/settings
- **Ollama Docs:** https://ollama.com/library
- **Model Info:** https://ollama.com/library/llama3.1

---

## 💬 Example Test Prompts

### Greeting Test
```
Hello! I'm interested in learning about Metrica.
```

### Knowledge Test
```
Can you explain the key features that Metrica offers?
```

### Context Test
```
Message 1: "What is machine learning?"
Message 2: "Can you give me an example of that?"
Message 3: "How would I implement it?"
```

### Professional Tone Test
```
I need to prepare a business proposal. Can you help?
```

### Technical Test
```
Explain the difference between supervised and unsupervised learning.
```

---

**Status:** ✅ Configuration Complete - Ready for Testing

**Last Updated:** 2025-10-09

---

Need help? Check the main documentation:
- [DeepSeek & Ollama Setup Guide](./docs/DEEPSEEK-OLLAMA-SETUP.md)
- [LLM Providers Documentation](./docs/LLM-PROVIDERS.md)
- [Dashboard Guide](./apps/dashboard/DASHBOARD-GUIDE.md)
