# Meta Chat Platform - Project Overview

**Quick Reference Guide** | Last Updated: 2025-10-08

---

## 🎯 What Are We Building?

**A production-grade, multi-tenant conversational AI platform** that lets businesses deploy intelligent chatbots across multiple messaging channels with knowledge base search capabilities.

### In Simple Terms:
Think of it as your own ChatGPT that can:
- Respond on WhatsApp, Messenger, and your website
- Search through your company documents to answer questions
- Handle multiple clients/tenants on one system
- Call custom functions (check inventory, create tickets, etc.)
- Hand off to human agents when needed

---

## 🏗️ System Architecture (High Level)

```
┌─────────────────────────────────────────────────────────┐
│  MESSAGING CHANNELS                                     │
│  WhatsApp | Messenger | Web Chat Widget                │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  API SERVER (Express.js)                                │
│  • Receives messages from channels                      │
│  • Manages tenants, channels, documents                 │
│  • Exposes REST API + WebSocket                         │
└────────────┬────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────┐
│  MESSAGE ORCHESTRATOR                                   │
│  • Routes messages through processing pipeline          │
│  • Searches knowledge base (RAG)                        │
│  • Calls AI model (OpenAI/Anthropic/Local)            │
│  • Executes functions                                   │
│  • Sends responses back to channels                     │
└────────────┬────────────────────────────────────────────┘
             │
       ┌─────┴─────┐
       ▼           ▼
┌───────────┐ ┌────────────┐
│ DATABASE  │ │ AI MODELS  │
│ Postgres  │ │ • OpenAI   │
│ +pgvector │ │ • Claude   │
│           │ │ • Ollama   │
└───────────┘ └────────────┘
```

---

## 📊 Current Status

### ✅ What's Complete (Foundation)

| Package | Status | Description |
|---------|--------|-------------|
| **@meta-chat/shared** | ✅ DONE | Types, constants, utilities |
| **@meta-chat/database** | ✅ DONE | Prisma schema + vector search |
| **@meta-chat/events** | ✅ DONE | Event bus + webhooks |
| **Deployment Docs** | ✅ DONE | Full deployment guide |
| **System Analysis** | ✅ DONE | VPS compatibility check |

### 📦 What Needs Building (Core Features)

| Component | Status | Priority |
|-----------|--------|----------|
| **RAG Engine** | 📦 TODO | HIGH - Document processing & search |
| **LLM Integration** | 📦 TODO | HIGH - Multi-provider support |
| **Channel Adapters** | 📦 TODO | HIGH - WhatsApp, Messenger, Web |
| **Message Orchestrator** | 📦 TODO | HIGH - Core message processing |
| **API Server** | 📦 TODO | HIGH - REST + WebSocket |
| **Dashboard** | 📦 TODO | MEDIUM - Management UI |
| **Docker Setup** | 📦 TODO | MEDIUM - Production deployment |

---

## 🖥️ Deployment Environment

### Target System: genai.hr VPS

**Hardware:**
- 4 CPU cores (AMD EPYC)
- 7.8GB RAM (5.4GB available)
- 370GB disk space available
- Node.js 20.19.5 ✅
- Docker + Docker Compose ✅

**Existing Services (Running):**
- N8N automation (app.genai.hr)
- Nextcloud file storage (files.genai.hr)
- Portainer Docker management (docker.genai.hr)
- Netdata monitoring (monitor.genai.hr)

**Our Allocation:**
- Domains: `chat.genai.hr`, `chat-admin.genai.hr`
- Ports: 3000, 3001, 5432, 6379, 5672
- Memory: ~1.5GB estimated
- Disk: ~10-50GB

**Deployment Strategy:**
- Docker Compose for all services
- Nginx reverse proxy with SSL
- Localhost-only bindings
- No conflicts with existing services ✅

---

## 🎯 Core Features

### 1. Multi-Tenancy
- Each client gets isolated environment
- Separate API keys, channels, documents
- Per-tenant configuration (tone, language, features)
- Complete data isolation

### 2. Multi-Channel Support
- **WhatsApp Business API** - Most popular messaging app
- **Facebook Messenger** - Social media integration
- **Web Chat Widget** - Embeddable on any website

### 3. RAG (Retrieval-Augmented Generation)
- Upload PDFs, DOCX, TXT, Markdown documents
- Automatic text chunking and embedding
- Hybrid search (keyword + vector similarity)
- Context-aware AI responses

### 4. AI Flexibility
- **OpenAI** (GPT-4o, GPT-4o-mini)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Local Models** (Ollama - Llama 3, Mistral, etc.)
- Easy to switch providers per tenant

### 5. Function Calling
- AI can call custom functions
- Examples: check_inventory, create_ticket, get_weather
- Up to 5 iterations per conversation turn

### 6. Human Handoff
- Detect keywords like "speak to human"
- Change conversation status to "assigned_human"
- Notify operators via webhooks

### 7. Event System
- Real-time event bus for internal components
- Webhook delivery to external systems
- RabbitMQ support for scalability
- Audit log of all events

---

## 🔑 Configuration Options

### LLM Provider Options

**Option 1: OpenAI (Recommended for Production)**
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```
- ✅ Best function calling support
- ✅ Fast and reliable
- ✅ Great embeddings
- ⚠️ Costs per token

**Option 2: Anthropic (Claude)**
```env
LLM_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
# Still use OpenAI for embeddings
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```
- ✅ Excellent reasoning
- ✅ Large context window (200K)
- ✅ Strong at following instructions
- ⚠️ Costs per token

**Option 3: Local/Ollama (Free)**
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
# Still use OpenAI for embeddings (or local embeddings)
OPENAI_API_KEY=sk-...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```
- ✅ No API costs
- ✅ Full privacy/control
- ✅ Ollama already on your VPS
- ⚠️ Slower than cloud APIs
- ⚠️ Needs GPU for best performance

**Option 4: Hybrid (Best of Both Worlds)**
- Use OpenAI/Claude for production tenants
- Use Ollama for testing/development
- Configure per tenant in database

### Multi-LLM Architecture

```typescript
// Each tenant can have different LLM config
{
  "tenantId": "tenant-1",
  "settings": {
    "llm": {
      "provider": "openai",
      "model": "gpt-4o",
      "apiKey": "sk-..."  // Encrypted in DB
    }
  }
}

// Another tenant uses Claude
{
  "tenantId": "tenant-2",
  "settings": {
    "llm": {
      "provider": "anthropic",
      "model": "claude-3-5-sonnet-20241022",
      "apiKey": "sk-ant-..."
    }
  }
}
```

---

## 📂 Project Structure

```
meta-chat-platform/
├── apps/
│   ├── api/              📦 TODO - Main API server
│   ├── web-widget/       📦 TODO - Embeddable chat
│   └── dashboard/        📦 TODO - Management UI
│
├── packages/
│   ├── shared/           ✅ DONE - Types, utils, constants
│   ├── database/         ✅ DONE - Prisma schema + client
│   ├── events/           ✅ DONE - Event system
│   ├── rag/              📦 TODO - Document processing + search
│   ├── llm/              📦 TODO - Multi-provider LLM client
│   ├── channels/         📦 TODO - WhatsApp, Messenger, Web
│   └── orchestrator/     📦 TODO - Message routing
│
├── docs/
│   ├── ARCHITECTURE.md   ✅ DONE - System design
│   ├── DEPLOYMENT.md     ✅ DONE - Deployment guide
│   ├── SYSTEM-CONSTRAINTS.md ✅ DONE - Development rules
│   ├── PROJECT-OVERVIEW.md   ✅ DONE - This file
│   └── TODO.md           ✅ DONE - Detailed task list
│
├── docker/
│   └── docker-compose.yml 📦 TODO - Production setup
│
├── .env.example          ✅ EXISTS - Config template
├── package.json          ✅ EXISTS - Root package
└── README.md             ✅ EXISTS - Main docs
```

---

## 🎓 Key Technologies

| Technology | Purpose | Why? |
|------------|---------|------|
| **TypeScript** | Language | Type safety, great tooling |
| **Node.js 20** | Runtime | Modern features, good performance |
| **Express.js** | Web framework | Simple, flexible, well-supported |
| **PostgreSQL 15** | Database | ACID, reliable, pgvector support |
| **pgvector** | Vector search | Native Postgres, no extra service |
| **Prisma** | ORM | Type-safe queries, migrations |
| **Redis** | Cache/Queue | Fast, simple, battle-tested |
| **RabbitMQ** | Message queue | Durable, scalable messaging |
| **Turbo** | Monorepo build | Fast parallel builds |
| **Docker** | Deployment | Consistent environments |

---

## 🚀 Development Workflow

### Phase 1: Core Infrastructure ✅ DONE
- [x] Project structure
- [x] Database schema
- [x] Event system
- [x] Deployment planning

### Phase 2: AI & RAG (CURRENT)
- [ ] Multi-LLM provider abstraction
- [ ] Document loader (PDF, DOCX, etc.)
- [ ] Text chunking strategies
- [ ] Embedding generation
- [ ] Hybrid retrieval (keyword + vector)

### Phase 3: Channels & Messaging
- [ ] WhatsApp Business webhook + API
- [ ] Messenger Platform webhook + API
- [ ] WebSocket server for web chat

### Phase 4: Orchestration
- [ ] Message routing pipeline
- [ ] Context building from history
- [ ] LLM completion with streaming
- [ ] Function calling execution
- [ ] Response formatting

### Phase 5: API & Management
- [ ] REST API for CRUD operations
- [ ] Authentication middleware
- [ ] Rate limiting
- [ ] WebSocket connections
- [ ] Dashboard UI

### Phase 6: Deployment
- [ ] Docker Compose configuration
- [ ] Nginx reverse proxy setup
- [ ] SSL certificates
- [ ] Environment configuration
- [ ] Backup automation

### Phase 7: Testing & Production
- [ ] Unit tests
- [ ] Integration tests
- [ ] Load testing
- [ ] Security audit
- [ ] Production deployment

---

## 📈 Success Metrics

**After Deployment:**
- ✅ API responds to health checks
- ✅ Can create tenant via API
- ✅ Can upload and index documents
- ✅ Can send/receive messages on all channels
- ✅ AI responds with context from documents
- ✅ Function calling works
- ✅ Webhooks deliver reliably
- ✅ Dashboard accessible and functional

---

## 🔐 Security Checklist

- [ ] All services bind to localhost only
- [ ] Public access via Nginx reverse proxy only
- [ ] SSL/TLS on all public endpoints
- [ ] Strong passwords generated
- [ ] API keys encrypted in database
- [ ] Rate limiting enabled
- [ ] Input validation on all endpoints
- [ ] CORS configured properly
- [ ] No secrets in git
- [ ] Regular backups scheduled

---

## 📚 Documentation Links

- **[README.md](README.md)** - Project introduction and getting started
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Detailed system design
- **[DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deployment guide for genai.hr VPS
- **[SYSTEM-CONSTRAINTS.md](docs/SYSTEM-CONSTRAINTS.md)** - Development rules and limits
- **[TODO.md](docs/TODO.md)** - Detailed task checklist

---

## 🤝 Getting Help

**If you need to understand:**
- **What the platform does** → Read this file
- **How it works internally** → Read ARCHITECTURE.md
- **How to deploy it** → Read DEPLOYMENT.md
- **What you can/can't do** → Read SYSTEM-CONSTRAINTS.md
- **What tasks are left** → Read TODO.md

**If something breaks:**
1. Check service logs: `docker-compose logs -f [service]`
2. Check nginx: `sudo nginx -t && sudo systemctl status nginx`
3. Check resources: `free -h`, `df -h`, `docker stats`
4. Check Netdata: https://monitor.genai.hr

---

## 🎯 Quick Decision Guide

**"Should I use OpenAI or Claude?"**
→ OpenAI for better function calling, Claude for complex reasoning

**"Should I use local models?"**
→ Good for testing/development, but slower for production

**"How much will this cost?"**
→ Depends on usage. With rate limiting: $50-500/month for OpenAI/Claude

**"Can I mix providers?"**
→ Yes! Each tenant can use different LLM providers

**"Will this break my N8N/Nextcloud?"**
→ No. Completely isolated, different ports and networks

**"How long to build the rest?"**
→ Estimate: 3-4 weeks full-time development

**"Can I deploy without finishing everything?"**
→ Yes. Can deploy infrastructure now, add features incrementally

---

## 📞 Next Actions

**Right Now:**
1. ✅ Review this overview
2. ✅ Check TODO.md for detailed tasks
3. ⏳ Decide on LLM provider(s)
4. ⏳ Get API keys (OpenAI, Anthropic, or both)
5. ⏳ Start building RAG engine + LLM integration

**This Week:**
- Build multi-LLM provider abstraction
- Implement document processing
- Set up vector search
- Test RAG retrieval

**This Month:**
- Complete all core packages
- Build API server
- Deploy to VPS
- Test end-to-end

---

**Remember:** You have a solid foundation. The database, event system, and deployment plan are done. Now it's about building the AI/messaging features on top of this foundation.

---

**Status:** 🟡 In Progress (30% Complete)
**Next Milestone:** RAG Engine + Multi-LLM Support
