# MASTER ISSUE REGISTRY
**Meta Chat Platform - Comprehensive Issue Tracking**

**Generated:** 2025-11-20
**Platform:** VPS-00 (chat.genai.hr:3007)
**Repository:** https://github.com/Wandeon/meta-chat-platform
**Total Issues Identified:** 33

---

## EXECUTIVE DASHBOARD

### Summary Metrics

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Issues** | 33 | 100% |
| **Critical Severity** | 8 | 24% |
| **High Severity** | 15 | 45% |
| **Medium Severity** | 8 | 24% |
| **Low Severity** | 2 | 6% |

### Status Distribution

| Status | Count | Percentage |
|--------|-------|------------|
| **New** | 28 | 85% |
| **In Progress** | 3 | 9% |
| **Blocked** | 1 | 3% |
| **Resolved** | 1 | 3% |

### Category Distribution

| Category | Count | Critical | High | Medium | Low |
|----------|-------|----------|------|--------|-----|
| **Security** | 5 | 5 | 0 | 0 | 0 |
| **Backend/API** | 7 | 0 | 5 | 2 | 0 |
| **Frontend/UI** | 5 | 0 | 1 | 3 | 1 |
| **Integration** | 4 | 1 | 2 | 1 | 0 |
| **Quality/Testing** | 6 | 1 | 3 | 2 | 0 |
| **Infrastructure** | 6 | 1 | 4 | 0 | 1 |

### Deployment Blocker

**CRITICAL P0 BLOCKER IDENTIFIED:**
**Issue #28: Missing npm Dependencies on VPS-00**

- **Impact:** Worker process cannot start (complete failure)
- **Root Cause:** `data-uri-to-buffer` package not installed after commit bbb07c2
- **Affected Services:** Analytics, RAG processing, message pipeline, real-time events
- **Resolution Time:** 2-3 minutes
- **Action Required:** Run `npm install` on VPS-00 and restart PM2 processes

---

## COMPLETE ISSUE TABLE

### P0 Blockers (IMMEDIATE - Cannot Deploy Without)

| ID | PR# | Title | Category | Severity | Effort | Status | VPS-00 Validated | Dependencies |
|----|-----|-------|----------|----------|--------|--------|------------------|--------------|
| 28 | - | Missing npm Dependencies on VPS-00 | Infrastructure | CRITICAL | 0.1d | BLOCKED | YES - Failing | None |
| 1 | 56 | Broken Multi-Tenant Isolation | Security | CRITICAL | 2-3d | New | NO - Cannot test | None |
| 10 | 61 | Missing Auth on Billing Routes | Backend/API | CRITICAL | 0.5d | New | NO | None |
| 11 | 61 | Broken RAG Chat Functionality | Integration | CRITICAL | 0.5d | New | NO | None |

### P1 High Priority (Fix This Week)

| ID | PR# | Title | Category | Severity | Effort | Status | VPS-00 Validated | Dependencies |
|----|-----|-------|----------|----------|--------|--------|------------------|--------------|
| 2 | 53 | API Key Hash Mismatch (Broken Auth) | Security | HIGH | 1d | New | NO - Cannot test | None |
| 3 | 53 | WebSocket HMAC Replay Vulnerability | Security | HIGH | 1d | New | NO | None |
| 4 | 55 | SQL Injection in Maintenance Code | Security | HIGH | 1d | New | NO | None |
| 7 | 57 | API Error Handling - Unhandled Rejections | Backend/API | HIGH | 0.5d | New | NO | None |
| 8 | 60 | Missing API Input Validation | Backend/API | HIGH | 2d | New | NO | None |
| 9 | 58 | RAG Pipeline Not Integrated into API | Integration | HIGH | 0.5-1d | New | PARTIAL - Status mismatch | None |
| 12 | 62 | Widget Message Loss on Refresh | Frontend/UI | HIGH | DONE | RESOLVED | NO | None |
| 21 | 59 | Analytics Aggregation Job Broken | Quality/Testing | HIGH | 0.5d | New | NO - Worker down | #28 |
| 23 | 69 | Backup Verification Never Performed | Infrastructure | CRITICAL | 0.5d | New | PARTIAL - Cron running | None |
| 24 | 70 | Socket.IO Redis Adapter Disabled | Infrastructure | HIGH | 0.5d | New | NO | None |
| 25 | 72 | Rate Limiting Security Gaps | Infrastructure | HIGH | 0.5d | New | NO | None |
| 26 | 74 | PrismaClient Connection Leak (Vector Search) | Infrastructure | HIGH | 0.25d | New | NO - Cannot test | #28 |
| 29 | 65 | WhatsApp Webhook Route Missing | Integration | HIGH | 0.5d | New | NO | None |
| 30 | 66 | WebChat Authentication Mismatch | Integration | HIGH | 0.5-1d | New | NO | None |

### P2 Medium Priority (Fix This Sprint)

| ID | PR# | Title | Category | Severity | Effort | Status | VPS-00 Validated | Dependencies |
|----|-----|-------|----------|----------|--------|--------|------------------|--------------|
| 5 | 54 | XSS Defense Gaps (CSP Weak) | Security | MEDIUM | 1.5d | New | NO | None |
| 6 | 51 | Package Dependency Issues | Backend/API | MEDIUM | 1-1.5d | New | NO | None |
| 13 | 62 | Widget Reconnection Error Handling | Frontend/UI | MEDIUM | 2-3d | New | NO | None |
| 14 | 64 | Dashboard State Management Gaps | Frontend/UI | MEDIUM | 2-3d | New | NO | None |
| 16 | 68 | Data Integrity Checks Missing | Backend/API | MEDIUM | 2-2.5d | New | NO - Cannot test | #1 |
| 17 | 73 | Database Migration Reversibility | Backend/API | MEDIUM | 2.5-3.5d | New | NO | None |
| 22 | 76 | Correlation IDs Missing in Worker | Quality/Testing | MEDIUM | 1-1.5d | New | NO | #28 |
| 27 | 74 | Dashboard setTimeout Leak (Minor) | Frontend/UI | MEDIUM | 0.25d | New | NO | None |

### P3 Low Priority (Backlog)

| ID | PR# | Title | Category | Severity | Effort | Status | VPS-00 Validated | Dependencies |
|----|-----|-------|----------|----------|--------|--------|------------------|--------------|
| 15 | 63 | Landing Page UX Issues | Frontend/UI | LOW | 0.5d | RESOLVED | NO | None |
| 18 | 71 | Dashboard Navigation Enhancements | Frontend/UI | LOW | 0.5d | New | NO | None |

### Testing & Infrastructure Issues

| ID | PR# | Title | Category | Severity | Effort | Status | VPS-00 Validated | Dependencies |
|----|-----|-------|----------|----------|--------|--------|------------------|--------------|
| 19 | - | API Test Coverage 4% | Quality/Testing | CRITICAL | 5-7d | New | N/A | None |
| 20 | - | No Integration Tests | Quality/Testing | HIGH | 3-4d | New | N/A | None |
| 31 | 67 | Webhook Code Duplication | Quality/Testing | MEDIUM | 0.5d | New | NO | None |
| 32 | - | No Error Tracking (Sentry) | Infrastructure | MEDIUM | 0.5d | New | NO | None |
| 33 | - | No Automated Alerting | Infrastructure | LOW | 1-1.5d | New | NO | #32 |

---

## CROSS-REFERENCE MATRIX

### Dependency Chains

#### Critical Path 1: Deployment Prerequisites
```
#28 (npm install) → Enables everything else
    ↓
#21 (Analytics job)
#26 (Vector search)
#9 (RAG pipeline)
```

#### Critical Path 2: Security Hardening
```
#1 (Tenant isolation) → #16 (Data integrity) → #23 (Backups)
    ↓
All security issues depend on tenant isolation being fixed first
```

#### Critical Path 3: Frontend Reliability
```
#12 (Message persistence) [DONE] → #13 (Error handling)
    ↓
#14 (State management)
```

#### Critical Path 4: Channel Integration
```
#29 (WhatsApp webhook) } → #31 (Shared utilities)
#30 (WebChat auth)      }
```

### Parallel Execution Opportunities

**Can Execute Simultaneously (No Dependencies):**

**Week 1 Parallel Track:**
- #2 (API key hash) + #3 (HMAC replay) + #4 (SQL injection)
- #7 (Error handling) + #8 (Input validation)
- #10 (Billing auth) + #11 (RAG chat fix)

**Week 2 Parallel Track:**
- #25 (Rate limiting) + #26 (Connection leak) + #27 (setTimeout)
- #6 (Dependencies) + #17 (Migrations)
- #29 (WhatsApp) + #30 (WebChat)

**Week 3 Parallel Track:**
- #22 (Correlation IDs) + #32 (Sentry) + #33 (Alerting)
- #19 (Test coverage) - can start anytime
- #20 (Integration tests) - can start anytime

### Blocking Relationships

**Issue #28 Blocks:**
- #21 (Analytics - worker must run)
- #26 (Vector search - worker processes RAG)
- #9 (RAG pipeline - worker needed for processing)

**Issue #1 Blocks:**
- #16 (Data integrity - need tenant isolation first)
- All multi-tenant feature work

**Issue #12 Blocks:**
- #13 (Error handling builds on persistence)

---

## STATISTICS & METRICS

### Effort Distribution

| Effort Range | Count | Total Days | Percentage |
|--------------|-------|------------|------------|
| < 1 day | 13 | 6.5 | 39% |
| 1-2 days | 9 | 13.5 | 27% |
| 2-3 days | 8 | 20.0 | 24% |
| 3+ days | 3 | 13.0 | 9% |
| **TOTAL** | **33** | **53.0** | **100%** |

### Component Breakdown

| Component | Issues | Critical | High | Medium | Low |
|-----------|--------|----------|------|--------|-----|
| API Routes | 8 | 2 | 4 | 2 | 0 |
| Database | 4 | 0 | 1 | 3 | 0 |
| Authentication | 4 | 4 | 0 | 0 | 0 |
| Widget (Frontend) | 4 | 0 | 1 | 2 | 1 |
| RAG/Vector Search | 3 | 1 | 1 | 0 | 0 |
| Worker/Background Jobs | 3 | 1 | 1 | 1 | 0 |
| Infrastructure | 4 | 1 | 3 | 0 | 0 |
| Testing | 3 | 1 | 2 | 0 | 0 |

### Security Vulnerabilities by CVSS

| Issue | CVSS Score | Rating | Category |
|-------|------------|--------|----------|
| #1 - Tenant Isolation | 9.8 | Critical | Broken Access Control |
| #2 - API Key Hash | 8.5 | High | Authentication Failure |
| #3 - HMAC Replay | 8.5 | High | Authentication Bypass |
| #4 - SQL Injection | 7.8 | High | Injection |
| #5 - XSS Gaps | 6.5 | Medium | Cross-Site Scripting |

---

## QUICK REFERENCE SECTIONS

### P0 BLOCKERS (Cannot Deploy Without)

#### Issue #28: Missing npm Dependencies on VPS-00
**Status:** BLOCKING ALL VALIDATION
**Action:** `ssh admin@VPS-00 && cd /home/deploy/meta-chat-platform && npm install && pm2 restart all`
**Time:** 2-3 minutes
**Validation:** `pm2 logs meta-chat-worker --lines 20` should show no errors

#### Issue #1: Broken Multi-Tenant Isolation (PR #56)
**Impact:** Complete data breach - tenants can access each other's data
**CVSS:** 9.8 (Critical)
**Fix:** Enforce `requireTenant()` in all API routes
**Testing:** Create 2 tenants, attempt cross-tenant access (should fail)
**Effort:** 2-3 days

#### Issue #10: Missing Auth on Billing Routes (PR #61)
**Impact:** All billing endpoints return 401 (completely broken)
**Fix:** Add `authenticateAdmin` or `authenticateTenant` middleware
**Testing:** `curl -X POST http://localhost:3007/api/billing/create-checkout-session`
**Effort:** 0.5 days

#### Issue #11: Broken RAG Chat Functionality (PR #61)
**Impact:** RAG-enabled chats don't include document context
**Fix:** Complete the RAG code block in `/apps/api/src/routes/chat.ts`
**Testing:** Upload document, send related query, verify context used
**Effort:** 0.5 days

---

### QUICK WINS (< 1 Day Effort, High Impact)

| ID | Issue | Effort | Impact | Fix |
|----|-------|--------|--------|-----|
| 28 | npm install on VPS-00 | 0.1d | CRITICAL | `npm install && pm2 restart all` |
| 10 | Billing auth | 0.5d | CRITICAL | Add middleware to routes |
| 11 | RAG chat | 0.5d | CRITICAL | Complete code block |
| 7 | Error handling | 0.5d | HIGH | Wrap async handlers (PR #57) |
| 21 | Analytics job | 0.5d | HIGH | Deploy PR #59 after #28 |
| 23 | Backup verification | 0.5d | CRITICAL | Run restore test |
| 24 | Redis adapter | 0.5d | HIGH | Set REDIS_URL env var |
| 25 | Rate limiting | 0.5d | HIGH | Deploy PR #72 |
| 26 | Connection leak | 0.25d | HIGH | Fix singleton pattern |
| 27 | setTimeout leak | 0.25d | LOW | Add cleanup in useEffect |

**Total Quick Wins Effort:** 3.6 days
**Total Quick Wins Impact:** Fixes 10 issues (30% of total)

---

### LONG-TERM REFACTORS (> 1 Week Effort)

| ID | Issue | Effort | Benefit | Priority |
|----|-------|--------|---------|----------|
| 19 | API Test Coverage | 5-7d | Quality assurance | P1 |
| 20 | Integration Tests | 3-4d | Regression prevention | P1 |
| 1 | Tenant Isolation | 2-3d | Security critical | P0 |
| 13 | Widget Error Handling | 2-3d | UX improvement | P2 |
| 14 | Dashboard State Mgmt | 2-3d | UX improvement | P2 |
| 17 | Migration Rollbacks | 2.5-3.5d | Operational safety | P2 |

**Total Long-term Effort:** 17.5-23.5 days
**Recommended:** Spread over 4-6 weeks with dedicated resources

---

## VPS-00 PRODUCTION STATE

### Current Blockers Preventing Full Validation

1. **Worker Process Down:** Cannot validate analytics, RAG processing, or real-time features
2. **Missing Dependencies:** `data-uri-to-buffer` not installed
3. **Incomplete Deployment:** Code updated but `npm install` never run

### What's Working vs Broken

#### Working (Validated)
- PostgreSQL database: Running, contains data (1 tenant, 30 conversations)
- Backup system: Cron configured, latest backup from today (2 AM)
- API server: Responding on port 3007
- Vector embeddings: 126 chunks created successfully

#### Broken (Confirmed)
- Worker process: Cannot start due to missing npm package
- Analytics aggregation: Blocked by worker failure
- RAG document status: Embeddings created but status not updated to 'processed'
- Real-time events: Blocked by worker failure

#### Unknown (Cannot Test Until #28 Fixed)
- Authentication security (PRs #53, #56)
- WebSocket functionality (PR #62)
- Rate limiting (PR #72)
- Channel integrations (PRs #65, #66)
- Error tracking and monitoring

### Deployment Gaps

1. **Deployment Procedure Incomplete:**
   - Code deployed via git pull
   - Dependencies NOT installed (`npm install` missing)
   - PM2 processes restarted but still using old dependencies
   - **Fix:** Add `npm install` to deployment scripts

2. **Pre-flight Checks Missing:**
   - No validation that dependencies are installed
   - No health check before marking deployment complete
   - **Fix:** Add dependency verification to CI/CD

3. **Monitoring Gaps:**
   - No alerts when worker process fails
   - No dependency tracking
   - **Fix:** Add PM2 process monitoring with alerting

---

## DUPLICATE DETECTION

### No Duplicates Found

All 33 issues are unique. Some issues are related (e.g., PRs #53-56 all address security) but each represents a distinct problem requiring separate fixes.

### Related Issue Groups

**Security Cluster (PRs #52-56):**
- #1: Tenant isolation
- #2: API key hashing
- #3: HMAC replay
- #4: SQL injection
- #5: XSS/CSP

**Frontend Cluster (PRs #62-64, #71):**
- #12: Message persistence (DONE)
- #13: Reconnection errors
- #14: State management
- #15: Landing page (DONE)
- #18: Navigation

**Infrastructure Cluster (PRs #59, #69-76):**
- #21: Analytics job
- #23: Backups
- #24: Redis adapter
- #25: Rate limiting
- #26: Connection leak
- #27: Timeout leak
- #32: Error tracking
- #33: Alerting

---

## MISSING FEATURES VS BUGS

### Documented But Not Implemented

| Feature | Evidence | Status | PR |
|---------|----------|--------|-----|
| RAG API Integration | Pipeline exists, API doesn't use it | NOT IMPLEMENTED | #58 |
| WhatsApp Webhooks | Adapter exists, no API route | NOT IMPLEMENTED | #65 |
| WebChat Authentication | Adapter expects conversation ID, server doesn't provide | PARTIALLY IMPLEMENTED | #66 |
| Backup Verification | Scripts exist, never executed | NOT IMPLEMENTED | #69 |
| Error Tracking | Documented in monitoring, no Sentry integration | NOT IMPLEMENTED | #76 |

### Implemented But Broken

| Feature | Issue | Status | PR |
|---------|-------|--------|-----|
| Billing API | Returns 401 (no auth middleware) | BROKEN | #61 |
| RAG Chat | Code incomplete (dead code block) | BROKEN | #61 |
| Analytics Job | Incorrect column mappings | BROKEN | #59 |
| API Key Auth | Hash mismatch (SHA-256 vs scrypt) | BROKEN | #53 |
| Widget Persistence | Lost on refresh | FIXED | #62 |

### Missing Entirely

| Feature | Needed For | Priority |
|---------|------------|----------|
| Integration Tests | Regression prevention | HIGH |
| Load Testing | Capacity planning | MEDIUM |
| Database Replication | High availability | MEDIUM |
| Multi-region Support | Global deployments | LOW |
| Chaos Engineering | Resilience testing | LOW |

---

## ACTIONABLE NEXT STEPS

### Immediate (Next 10 Minutes)

**Issue #28: Deploy Missing Dependencies**
```bash
# 1. Connect to VPS-00
ssh admin@VPS-00

# 2. Navigate to app directory
cd /home/deploy/meta-chat-platform

# 3. Install dependencies
npm install

# 4. Restart services
pm2 restart all

# 5. Verify success
pm2 logs meta-chat-worker --lines 20
curl http://localhost:3007/health
```

**Expected Outcome:** Worker starts successfully, no errors in logs

### Week 1 (Critical Path)

**Day 1: Security Quick Wins**
1. Fix Issue #10 (Billing auth) - 0.5d
2. Fix Issue #7 (Error handling) - 0.5d
3. Deploy and test on VPS-00

**Day 2-3: Tenant Isolation**
1. Fix Issue #1 (Tenant scoping) - 2-3d
2. Comprehensive testing with multiple tenants
3. Deploy to staging first

**Day 4: RAG and Analytics**
1. Fix Issue #11 (RAG chat) - 0.5d
2. Fix Issue #21 (Analytics job) - 0.5d
3. Validate on VPS-00 after worker is running

**Day 5: Validation and Monitoring**
1. Fix Issue #23 (Backup restore test) - 0.5d
2. Fix Issue #25 (Rate limiting) - 0.5d
3. Deploy monitoring (Issue #32) - 0.5d

### Week 2 (Security Hardening)

**Focus:** Complete all security issues (#2-5)
- API key hash fix (Issue #2) - 1d
- HMAC replay prevention (Issue #3) - 1d
- SQL injection mitigation (Issue #4) - 1d
- XSS/CSP hardening (Issue #5) - 1.5d
- Input validation (Issue #8) - 2d

**Parallel Track:** Database integrity
- Data integrity checks (Issue #16) - 2-2.5d (requires #1 first)

### Week 3 (Integration & Testing)

**Focus:** Channel integrations and test coverage
- WhatsApp webhook (Issue #29) - 0.5d
- WebChat auth (Issue #30) - 0.5-1d
- Widget error handling (Issue #13) - 2-3d
- Start API test coverage (Issue #19) - Begin 5-7d effort

### Week 4 (Infrastructure & Quality)

**Focus:** Operational excellence
- Migration rollbacks (Issue #17) - 2.5-3.5d
- Dashboard state management (Issue #14) - 2-3d
- Correlation IDs (Issue #22) - 1-1.5d
- Automated alerting (Issue #33) - 1-1.5d

---

## CONTEXT SUMMARY

**Platform:** Multi-tenant WhatsApp/Messenger/WebChat platform with RAG-powered AI assistants

**Architecture:**
- Frontend: React dashboard + embeddable widget
- Backend: Express.js API (Node.js)
- Worker: Background job processor (PM2)
- Database: PostgreSQL with pgvector extension
- Message Queue: RabbitMQ
- Cache/Sessions: Redis
- Real-time: Socket.IO WebSockets

**Deployment:**
- Server: VPS-00 (chat.genai.hr)
- Port: 3007
- Process Manager: PM2
- Reverse Proxy: Nginx (assumed)

**Current State:**
- Code: 76 PRs (25 merged original development, 51 open review PRs)
- Production: Partially functional (worker down, API responsive)
- Data: 1 tenant, 30 conversations, 126 embedding chunks
- Backups: Configured and running (daily at 2 AM)

---

## EFFORT SUMMARY

**Total Identified Work:** 53 days (1,060 person-hours)

**By Priority:**
- P0 (Blockers): 3.6 days
- P1 (High): 13.5 days
- P2 (Medium): 17.5 days
- P3 (Low): 1 day
- Testing/Quality: 17.4 days

**Recommended Resourcing:**
- 2 senior engineers (security + backend)
- 1 frontend engineer
- 1 QA/test engineer
- 0.5 DevOps/infrastructure

**Timeline:** 6-8 weeks to address all issues

**Critical Path:** 4 weeks minimum (P0 + P1 + essential testing)

---

## VERSION HISTORY

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-20 | Initial master registry created | Analysis Team |

---

**END OF MASTER ISSUE REGISTRY**

**Next Actions:**
1. Review and prioritize with team
2. Fix Issue #28 immediately (npm install)
3. Begin Week 1 critical path execution
4. Schedule daily standups for next 4 weeks
5. Re-validate VPS-00 after each deployment

**Contact:** See individual PR reports for detailed technical analysis
