# Documentation Reorganization Design

**Date:** 2025-11-18
**Status:** Approved, Ready for Implementation
**Estimated Duration:** 35-40 minutes (parallel execution)

---

## Overview

Complete reorganization of Meta Chat Platform documentation using 10 parallel agents to create authoritative, current documentation while preserving historical context through archival.

## Goals

1. Document current deployed state (VPS-00: chat.genai.hr)
2. Create comprehensive hybrid documentation (technical + operational)
3. Eliminate duplicate and outdated information
4. Establish feature-based organization structure
5. Archive legacy docs for historical reference
6. Provide master index for easy navigation

## Strategy

- **Approach:** Hybrid (Option C) - Create new authoritative docs, archive old ones
- **Structure:** Feature-based hierarchy (Option A)
- **Parallelization:** Maximum (Option A) - 10 concurrent agents
- **Git Strategy:** Per-agent commits (Option B)
- **Documentation Depth:** Comprehensive hybrid (Option C)

## Architecture

### Directory Structure

```
meta-chat-platform/
├── docs/
│   ├── current/
│   │   ├── deployment/
│   │   │   ├── production.md
│   │   │   ├── development.md
│   │   │   └── infrastructure.md
│   │   ├── features/
│   │   │   ├── rag-system.md
│   │   │   ├── confidence-escalation.md
│   │   │   ├── mcp-integration.md
│   │   │   └── channels.md
│   │   ├── api/
│   │   │   ├── endpoints.md
│   │   │   └── authentication.md
│   │   ├── architecture/
│   │   │   ├── system-design.md
│   │   │   └── components.md
│   │   ├── operations/
│   │   │   ├── monitoring.md
│   │   │   ├── troubleshooting.md
│   │   │   └── maintenance.md
│   │   └── CHANGELOG.md
│   ├── archive/
│   │   ├── 2025-11-18-pre-reorganization/
│   │   │   ├── deployment/
│   │   │   ├── features/
│   │   │   └── README.md
│   │   └── README.md
│   └── README.md (master index)
└── README.md (updated with docs link)
```

### Standard Documentation Template

Every document follows this structure:

```markdown
# [Feature/System Name]

**Last Updated:** 2025-11-18
**Status:** ✅ Current / 🚧 In Progress / ⚠️ Needs Update
**Maintainer:** [Component owner if known]

---

## Overview
- What is this feature/system?
- Why does it exist?
- Key benefits and use cases

## Architecture
- How it works (high-level)
- Component diagram (if applicable)
- Data flow
- Integration points

## Deployment & Setup
- Prerequisites
- Installation steps
- Configuration (with examples)
- Environment variables
- Verification steps

## API Reference
- Endpoints (if applicable)
- Request/response schemas
- Authentication requirements
- Code examples (curl, SDK)

## Operations
- Monitoring & metrics
- Logging (where to look)
- Common issues & troubleshooting
- Maintenance procedures

## Code References
- Key files and their purposes
- Important functions/classes
- Where to make changes

## Related Documentation
- Links to other relevant docs
- External resources
- API specs
```

## Agent Distribution

### Content Creator Agents (1-8) - Work in Parallel

**Agent 1: Deployment Documentation**
- **Scope:** Production deployment, development setup, infrastructure
- **Files Created:**
  - `docs/current/deployment/production.md`
  - `docs/current/deployment/development.md`
  - `docs/current/deployment/infrastructure.md`
- **Key Topics:**
  - Current VPS-00 setup (chat.genai.hr)
  - PM2 configuration (ecosystem.config.js)
  - Environment variables
  - Database setup (PostgreSQL + pgvector)
  - Caddy reverse proxy
  - SSL/HTTPS configuration
  - Docker containers
- **Git Commit:** `docs: add current deployment documentation`

**Agent 2: RAG System Documentation**
- **Scope:** Vector search, embeddings, RAG templates, quality thresholds
- **Files Created:**
  - `docs/current/features/rag-system.md`
- **Key Topics:**
  - Vector search architecture
  - NEW ragTemplates.ts (created 2025-11-18)
  - Similarity thresholds (70% high, 50% moderate)
  - Quality-based prompting
  - Embedding providers (Ollama, OpenAI)
  - Document processing pipeline
  - Chunk creation and indexing
  - Multi-language support (13 languages)
- **Git Commit:** `docs: add current RAG system documentation`

**Agent 3: Confidence Escalation Documentation**
- **Scope:** Confidence scoring, escalation engine, human handoff
- **Files Created:**
  - `docs/current/features/confidence-escalation.md`
- **Key Topics:**
  - Confidence scoring algorithm
  - Escalation engine architecture
  - Threshold configuration
  - Per-tenant settings
  - Human handoff flow
  - Keyword-based escalation
  - Integration with channels
- **Git Commit:** `docs: add current confidence escalation documentation`

**Agent 4: MCP Integration Documentation**
- **Scope:** MCP protocol, tools, credentials, security
- **Files Created:**
  - `docs/current/features/mcp-integration.md`
- **Key Topics:**
  - MCP protocol overview
  - Available MCP tools
  - Per-tenant credentials management
  - Tool execution flow
  - Security model
  - Configuration examples
- **Git Commit:** `docs: add current MCP integration documentation`

**Agent 5: Channels Documentation**
- **Scope:** WebChat, WhatsApp, Messenger integrations
- **Files Created:**
  - `docs/current/features/channels.md`
- **Key Topics:**
  - WebChat implementation
  - WhatsApp Business API
  - Facebook Messenger
  - Channel adapters
  - Message routing
  - Configuration per channel
- **Git Commit:** `docs: add current channels documentation`

**Agent 6: API Reference Documentation**
- **Scope:** REST endpoints, authentication, schemas
- **Files Created:**
  - `docs/current/api/endpoints.md`
  - `docs/current/api/authentication.md`
- **Key Topics:**
  - All REST endpoints (/chat, /tenants, /documents, etc.)
  - Authentication (API keys, admin keys)
  - Request/response schemas
  - Rate limiting
  - Error codes
  - Code examples (curl, JavaScript)
- **Git Commit:** `docs: add current API reference documentation`

**Agent 7: Architecture Documentation**
- **Scope:** System design, components, data flow
- **Files Created:**
  - `docs/current/architecture/system-design.md`
  - `docs/current/architecture/components.md`
- **Key Topics:**
  - System overview diagram
  - Component interactions
  - Data flow (request → worker → LLM → response)
  - Tech stack (Node.js, Turbo, Prisma)
  - Database schema
  - Monorepo structure
- **Git Commit:** `docs: add current architecture documentation`

**Agent 8: Operations Documentation**
- **Scope:** Monitoring, troubleshooting, maintenance
- **Files Created:**
  - `docs/current/operations/monitoring.md`
  - `docs/current/operations/troubleshooting.md`
  - `docs/current/operations/maintenance.md`
- **Key Topics:**
  - PM2 monitoring
  - Log locations and analysis
  - Common issues troubleshooting
  - Backup procedures
  - Performance optimization
  - Database maintenance
- **Git Commit:** `docs: add current operations documentation`

### Sequential Agents (9-10) - Run After Content Creators

**Agent 9: Git Cleanup Agent**
- **Waits For:** Agents 1-8 to complete commits
- **Duration:** ~10 minutes
- **Tasks:**
  1. Create `docs/archive/2025-11-18-pre-reorganization/`
  2. Move ALL old docs from root and `/docs` to archive
  3. Organize archived docs by category
  4. Create `docs/archive/README.md` explaining structure
  5. Document duplicates found
  6. Remove duplicate files
- **Git Commit:** `docs: archive legacy documentation`

**Agent 10: Index Generator Agent**
- **Waits For:** Agent 9 to complete
- **Duration:** ~10 minutes
- **Tasks:**
  1. Create `docs/README.md` with complete navigation
  2. Add quick links to all sections
  3. Add descriptions of each document
  4. Create "What's New" section
  5. Update root `README.md` with prominent docs link
  6. Create `docs/current/CHANGELOG.md`
  7. Add helpful badges (✅ Current, 📚 Reference, ⚙️ Operations)
- **Git Commit:** `docs: add master index and navigation`

## Execution Workflow

### Phase 1: Parallel Investigation & Documentation (Agents 1-8)

Each content agent follows this workflow:

1. **Investigation**
   - Read assigned codebase sections
   - Inspect existing old documentation
   - Check current deployment state on VPS-00
   - Examine configuration files, environment variables
   - Review recent git commits for changes
   - Test functionality if applicable (API calls, etc.)

2. **Documentation Creation**
   - Create new docs in `docs/current/[category]/`
   - Follow standard template
   - Include actual examples from deployed system
   - Cross-reference related components
   - Validate all code examples and paths

3. **Git Commit (Independent)**
   - Stage only their created files
   - Commit with descriptive message
   - Include co-author tag: "Co-Authored-By: Claude <noreply@anthropic.com>"

### Phase 2: Cleanup (Agent 9)

- Waits for all content agents to commit
- Archives old documentation
- Removes duplicates
- Commits cleanup

### Phase 3: Indexing (Agent 10)

- Waits for cleanup agent
- Creates navigation structure
- Updates main README
- Final commit

## Documentation Standards

- **Format:** GitHub-flavored Markdown
- **Code Examples:** Working, verified examples
- **Date Stamps:** All documents include update date
- **Cross-Links:** Related sections linked
- **File Paths:** Actual paths from codebase
- **Explanations:** Both conceptual AND practical

## Success Criteria

- ✅ All 10 agents report completion
- ✅ All commits pushed to GitHub
- ✅ No old docs remaining in `docs/current/`
- ✅ Master index provides easy navigation
- ✅ All code examples verified
- ✅ Cross-references working
- ✅ Archive organized and documented

## Timeline

```
T+0min:   Launch 10 agents simultaneously
T+15min:  First agents start completing
T+25min:  All content agents (1-8) complete
T+35min:  Cleanup agent (9) completes
T+40min:  Index agent (10) completes
```

**Total Duration:** 35-40 minutes

## Rollback Plan

If issues occur:

```bash
# Restore from git
cd /home/deploy/meta-chat-platform
git reset --hard HEAD~11  # Undo all 10 agent commits + initial
git push --force-with-lease

# Or restore archive
mv docs/archive/2025-11-18-pre-reorganization/* docs/
```

## Future Maintenance

After initial reorganization:

1. **Weekly Reviews:** Check for outdated information
2. **Feature Updates:** Update docs when code changes
3. **Quarterly Audits:** Comprehensive review of all docs
4. **Version Tagging:** Tag docs with system version

## Related Documents

- Current deployment status: VPS-00 (100.97.156.41)
- Git repository: /home/deploy/meta-chat-platform
- Platform: chat.genai.hr
- Recent improvements: RAG system fixes (2025-11-18)
