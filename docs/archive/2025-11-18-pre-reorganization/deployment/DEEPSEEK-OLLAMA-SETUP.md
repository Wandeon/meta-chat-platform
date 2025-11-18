# DeepSeek & Ollama Setup Guide

**Quick Reference for Cost-Effective & Local LLM Options** | Last Updated: 2025-10-09

---

## Overview

This guide covers how to use DeepSeek (cost-effective cloud) and Ollama (free local models) with the Meta Chat Platform.

---

## DeepSeek Setup

### Why DeepSeek?

- **17x cheaper than GPT-4** ($0.14/1M vs $2.50/1M input tokens)
- **OpenAI-compatible API** - works as drop-in replacement
- **Good quality** - competitive with GPT-3.5/4o-mini
- **Fast responses** - similar latency to OpenAI

### Pricing Comparison

| Model | Input Tokens | Output Tokens |
|-------|--------------|---------------|
| **DeepSeek Chat** | $0.14/1M | $0.28/1M |
| GPT-4o | $2.50/1M | $10.00/1M |
| GPT-4o-mini | $0.15/1M | $0.60/1M |
| Claude 3.5 Sonnet | $3.00/1M | $15.00/1M |

### Get Your API Key

1. Visit [platform.deepseek.com](https://platform.deepseek.com)
2. Sign up for an account
3. Go to API Keys section
4. Create a new API key
5. Copy the key (starts with `sk-`)

### Configuration Methods

#### Option 1: System-Wide (All Tenants)

Edit `/home/deploy/meta-chat-platform/apps/api/.env.production`:

```bash
# Change provider to use DeepSeek by default
LLM_PROVIDER=openai  # Keep as openai (DeepSeek is compatible)
OPENAI_API_KEY=sk-your-deepseek-key-here
OPENAI_MODEL=deepseek-chat
OPENAI_BASE_URL=https://api.deepseek.com/v1

# Still use OpenAI for embeddings (DeepSeek doesn't have embeddings)
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Restart the API:
```bash
pm2 restart meta-chat-api
```

#### Option 2: Per-Tenant (via Dashboard)

1. Login to dashboard at https://chat.genai.hr
2. Go to **Tenants** page
3. Click **Settings** for a tenant
4. Under **AI Model Configuration**:
   - Provider: Select **DeepSeek (Cost-Effective)**
   - Model: Select **deepseek-chat** or **deepseek-coder**
   - API Key: Enter your DeepSeek API key (optional if system default set)
   - Base URL: `https://api.deepseek.com/v1` (auto-filled)
5. Click **Save Settings**

### Available Models

- **deepseek-chat** - General purpose conversational model
- **deepseek-coder** - Optimized for code generation and technical queries

### Testing DeepSeek

```bash
curl -X POST https://chat.genai.hr/api/chat \
  -H "x-api-key: YOUR_TENANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! Tell me about yourself.",
    "conversationId": null
  }'
```

---

## Ollama Setup (Local Models)

### Why Ollama?

- **Completely free** - no per-token costs
- **Privacy** - data never leaves your network
- **No rate limits** - unlimited usage
- **Multiple models** - Llama, Mistral, Gemma, etc.

### Prerequisites

Ollama is installed on **ArtemiPC** at `http://ArtemiPC:11434`

### Available Models

The following models are popular and work well:

| Model | Size | Speed | Quality | Best For |
|-------|------|-------|---------|----------|
| **llama3.1:8b** | 4.7GB | Fast | Good | Recommended for production |
| llama3.1:70b | 40GB | Slow | Excellent | High quality, needs GPU |
| llama3.2:3b | 2GB | Very Fast | Decent | Quick responses |
| mistral:7b | 4.1GB | Fast | Good | Efficient |
| phi3:3.8b | 2.3GB | Very Fast | Good | Small & fast |
| gemma2:9b | 5.4GB | Fast | Very Good | Google model |
| qwen2.5:7b | 4.4GB | Fast | Good | Multilingual |
| codellama:7b | 3.8GB | Fast | Good | Code generation |

### Installing Models on ArtemiPC

If a model isn't installed yet on ArtemiPC:

```bash
# SSH into ArtemiPC or run on the machine
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull phi3:3.8b

# List installed models
ollama list
```

### Configuration Methods

#### Option 1: System-Wide (All Tenants)

Edit `/home/deploy/meta-chat-platform/apps/api/.env.production`:

```bash
# Change provider to Ollama
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://ArtemiPC:11434
OLLAMA_MODEL=llama3.1:8b

# Still need OpenAI for embeddings
OPENAI_API_KEY=sk-proj-your-key-here
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Restart the API:
```bash
pm2 restart meta-chat-api
```

#### Option 2: Per-Tenant (via Dashboard)

1. Login to dashboard at https://chat.genai.hr
2. Go to **Tenants** page
3. Click **Settings** for a tenant
4. Under **AI Model Configuration**:
   - Provider: Select **Ollama (Local/Free)**
   - Model: Select model (e.g., **llama3.1:8b**)
   - Base URL: `http://ArtemiPC:11434` (auto-filled)
   - No API key needed!
5. Click **Save Settings**

### Network Access

Ensure the API server can reach ArtemiPC:

```bash
# Test from API server
curl http://ArtemiPC:11434/api/tags

# Should return JSON with available models
```

If this fails, check:
- ArtemiPC is running and accessible
- Ollama service is running on ArtemiPC
- Firewall allows port 11434
- Hostname resolution works (or use IP address)

### Testing Ollama

```bash
curl -X POST https://chat.genai.hr/api/chat \
  -H "x-api-key: YOUR_TENANT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello! What model are you?",
    "conversationId": null
  }'
```

### Performance Notes

- **CPU-only**: Expect 5-10s per response (acceptable for testing)
- **With GPU**: Responses in 1-2s (production-ready)
- **Model size**: Smaller models = faster, but lower quality
- **Concurrency**: Can handle multiple requests, but slower than cloud APIs

---

## Hybrid Strategy (Recommended)

Use different providers for different purposes:

### Production Tenants
- **Critical customers**: OpenAI GPT-4o (most reliable)
- **High-volume support**: DeepSeek (cost-effective)
- **Privacy-sensitive**: Ollama (local only)

### Development/Testing
- **Always use Ollama** (free, no API costs)

### Cost Optimization
1. Start with DeepSeek for new tenants
2. Upgrade to OpenAI if they need advanced features
3. Use Ollama for internal testing

---

## Embeddings for RAG

**Important**: DeepSeek and Ollama don't provide high-quality embeddings.

For RAG (Retrieval Augmented Generation), always use OpenAI embeddings:

```bash
# Keep this in .env.production even when using DeepSeek/Ollama
OPENAI_API_KEY=sk-proj-your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

The system will automatically use OpenAI for embeddings while using your chosen provider for chat.

---

## Troubleshooting

### DeepSeek Issues

**Error: 401 Unauthorized**
- Check API key is correct
- Verify key is active at platform.deepseek.com
- Ensure base URL is `https://api.deepseek.com/v1`

**Error: Model not found**
- Use `deepseek-chat` or `deepseek-coder` (not GPT model names)

**Slow responses**
- DeepSeek should be fast (~1-2s). Check network connectivity.

### Ollama Issues

**Error: Connection refused**
- Check Ollama is running: `systemctl status ollama` on ArtemiPC
- Test connectivity: `curl http://ArtemiPC:11434/api/tags`
- Try IP address instead of hostname

**Error: Model not found**
- Install model on ArtemiPC: `ollama pull llama3.1:8b`
- Check available models: `ollama list`

**Very slow responses**
- Use smaller model: Try `llama3.2:3b` instead of `llama3.1:70b`
- Check CPU/GPU usage on ArtemiPC
- Reduce concurrent requests

**Memory issues**
- Large models need 8-16GB RAM
- Use smaller models on limited hardware
- Close other applications on ArtemiPC

---

## Cost Savings Calculator

### Example: 10M tokens/month

| Provider | Input Cost | Output Cost | Total/Month |
|----------|-----------|-------------|-------------|
| GPT-4o | $25.00 | $100.00 | **$125.00** |
| GPT-4o-mini | $1.50 | $6.00 | **$7.50** |
| DeepSeek | $1.40 | $2.80 | **$4.20** |
| Ollama | $0.00 | $0.00 | **$0.00** |

**Switching from GPT-4o to DeepSeek saves ~$120/month per 10M tokens**

---

## Best Practices

### When to Use Each Provider

**Use OpenAI when:**
- Need best function calling
- Critical production workload
- Need maximum reliability
- Budget allows

**Use DeepSeek when:**
- Need good quality at low cost
- High-volume scenarios
- Function calling not critical
- Testing new features

**Use Ollama when:**
- Privacy is paramount
- No internet/API access
- Development/testing
- Unlimited free usage needed
- Can tolerate slower responses

### Security

**API Keys:**
- Never commit API keys to git
- Store in environment variables
- Encrypt tenant API keys in database
- Rotate keys regularly

**Ollama:**
- Keep Ollama server on internal network
- Don't expose port 11434 to internet
- Use firewall rules

---

## Quick Start Commands

### Install Ollama Models (on ArtemiPC)
```bash
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama list
```

### Test DeepSeek
```bash
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer sk-your-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

### Test Ollama
```bash
curl http://ArtemiPC:11434/api/generate -d '{
  "model": "llama3.1:8b",
  "prompt": "Hello!",
  "stream": false
}'
```

---

## Next Steps

1. Get DeepSeek API key from platform.deepseek.com
2. Test in dashboard with a single tenant
3. Monitor quality and latency
4. Gradually migrate high-volume tenants to save costs
5. Keep OpenAI for critical customers

For more details, see:
- [LLM-PROVIDERS.md](./LLM-PROVIDERS.md) - Full multi-provider documentation
- [DASHBOARD-GUIDE.md](../apps/dashboard/DASHBOARD-GUIDE.md) - Dashboard usage

---

**Last Updated:** 2025-10-09
