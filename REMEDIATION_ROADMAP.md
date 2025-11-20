# REMEDIATION ROADMAP
**Meta Chat Platform - 5-Week Recovery Plan**

**Generated:** November 20, 2025
**Platform:** VPS-00 (chat.genai.hr:3007)
**Total Issues:** 33
**Total Effort:** ~53 person-days (7.5 weeks single dev, 3 weeks with 3 devs)

---

## 🚨 EMERGENCY HOTFIX (DAY 0 - NOW!)

**CRITICAL DEPLOYMENT BLOCKER: Worker Process Down**

### Issue #28: Missing npm Dependencies

**Impact:** Worker completely non-functional - affects analytics, RAG, message processing, events

**Root Cause:** Commit `bbb07c2` added `data-uri-to-buffer` dependency but `npm install` wasn't run on VPS-00

**FIX NOW (2-3 minutes):**

```bash
# 1. SSH to VPS-00
ssh admin@VPS-00

# 2. Navigate to application
cd /home/deploy/meta-chat-platform

# 3. Install missing dependencies
npm install

# 4. Restart services
pm2 restart meta-chat-worker
pm2 restart meta-chat-api

# 5. Verify worker is running
pm2 logs meta-chat-worker --lines 20 --nostream

# 6. Should see NO errors about "Cannot find package 'data-uri-to-buffer'"
```

**Success Criteria:**
- ✅ Worker logs show no dependency errors
- ✅ Worker status shows "online" in pm2 list
- ✅ Memory usage stable (~80-100MB)

**STOP:** Do not proceed with any other fixes until this is resolved!

---

## 📅 PHASED REMEDIATION PLAN

### Overview

| Phase | Duration | Focus | Issues | Effort | Team |
|-------|----------|-------|--------|--------|------|
| **Hotfix** | Day 0 (NOW) | Worker deployment fix | 1 | 0.1d | 1 DevOps |
| **Phase 1** | Week 1 (5d) | Security Lockdown | 5 | 8.5d | 2-3 Backend |
| **Phase 2** | Week 2 (5d) | Core Functionality | 6 | 7.5d | 2 Backend, 1 Frontend |
| **Phase 3** | Week 3 (5d) | Stability & UX | 7 | 10d | 2 Frontend, 1 Backend |
| **Phase 4** | Week 4 (5d) | Integration & Ops | 7 | 11.5d | 2 Backend, 1 DevOps |
| **Phase 5** | Week 5+ (7d+) | Tech Debt & Docs | 7 | 14.5d | Variable |

---

## PHASE 1: SECURITY LOCKDOWN (Week 1 - Days 1-5)

**Goal:** Make the system safe for production use - prevent data breaches and unauthorized access

**Duration:** 5 working days
**Effort:** 8.5 person-days
**Team:** 2 backend developers
**Risk Level:** HIGH - Touching authentication and multi-tenant isolation

### Issues to Fix (Priority Order):

#### Day 1-3: Multi-Tenant Isolation (PR #56) - BLOCKER
**Effort:** 2-3 days
**Severity:** CRITICAL (CVSS 9.8)

**Problem:** Routes accept `tenantId` from query params without validation - allows cross-tenant data access

**Fix:**
1. Add tenant scoping middleware to ALL routes
2. Extract tenantId from authenticated session (not from params)
3. Add Prisma middleware to enforce tenant filtering
4. Test cross-tenant access attempts

**Files to modify:**
- `apps/api/src/middleware/tenantScope.ts` - Add scoping middleware
- `apps/api/src/server.ts` - Apply middleware globally
- All route handlers - Remove tenantId from query params

**Testing:**
```bash
# Create 2 test tenants on VPS-00
# Attempt to access tenant A's data while authenticated as tenant B
# Should return 403 Forbidden
```

**Blocks:** PR #57, #60, #61, #68 (cannot safely test without tenant isolation)

#### Day 3: CORS & Security Headers (PR #52) - QUICK WIN
**Effort:** 0.5 days
**Severity:** MEDIUM (CVSS 5.3)

**Problem:** Missing HSTS, weak CORS policy

**Fix:**
```typescript
// apps/api/src/middleware/securityHeaders.ts
app.use((req, res, next) => {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Fix CORS - remove wildcard
  next();
});
```

**Testing:** `curl -I https://chat.genai.hr/api/health` - verify HSTS header

#### Day 4: Authentication Fixes (PR #53)
**Effort:** 1 day
**Severity:** HIGH (CVSS 8.5)

**Problems:**
1. API key hashing mismatch (SHA-256 vs scrypt)
2. WebSocket HMAC replay attacks (no timestamp)
3. Weak JWT config

**Fix:**
1. Update API key generation to use consistent scrypt hashing
2. Add timestamp validation to WebSocket HMAC
3. Add issuer/audience claims to JWT

**Files:**
- `packages/shared/src/security/apiKeys.ts`
- `apps/api/src/websocket/auth.ts`
- `apps/api/src/services/jwt.ts`

#### Day 5: SQL Injection & XSS (PR #55, #54)
**Effort:** 2.5 days
**Severity:** HIGH (CVSS 7.8) + MEDIUM (CVSS 6.5)

**Fix SQL Injection:**
```typescript
// Replace $executeRawUnsafe with Prisma.sql
await prisma.$executeRaw(Prisma.sql`ALTER TABLE ${tableName}...`);
```

**Fix XSS:**
- Tighten CSP policy (remove unsafe-inline)
- Add DOMPurify for widget config sanitization

### Phase 1 Success Criteria:
- ✅ Tenant isolation verified (cross-tenant access blocked)
- ✅ Security headers present on all responses
- ✅ New API keys work correctly
- ✅ WebSocket replay attacks blocked
- ✅ SQL injection vectors closed
- ✅ XSS mitigations in place
- ✅ Security audit passes

### Phase 1 Rollback Plan:
```bash
# If issues arise:
git revert <commit-hash>
pm2 restart meta-chat-api
# Monitor logs for errors
```

---

## PHASE 2: CORE FUNCTIONALITY (Week 2 - Days 6-10)

**Goal:** Fix broken features so all documented functionality works

**Duration:** 5 working days
**Effort:** 7.5 person-days
**Team:** 2 backend, 1 frontend
**Risk Level:** MEDIUM - Fixing broken features

### Issues to Fix:

#### Day 6-7: Critical Backend Fixes (PR #61)
**Effort:** 1 day
**Severity:** CRITICAL

**Problem 1: Billing routes missing authentication**
```typescript
// apps/api/src/routes/billing.ts
// Add authentication middleware
router.use(authenticateTenant);
```

**Problem 2: RAG chat broken (duplicate variable)**
```typescript
// apps/api/src/routes/chat.ts
// Fix duplicate 'messages' variable - remove second declaration
// Ensure RAG context is included in prompt
```

**Testing on VPS-00:**
```bash
# Test billing with auth
curl -H "Authorization: Bearer <token>" https://chat.genai.hr/api/billing/usage

# Test RAG chat includes context
# Upload document, ask question, verify response uses document content
```

#### Day 7-8: API Error Handling (PR #57)
**Effort:** 0.5 days

**Fix:** Wrap all route handlers in asyncHandler, sanitize error messages

#### Day 8-9: API Validation (PR #60)
**Effort:** 2 days

**Fix:** Add Zod schemas for all endpoints
```typescript
import { z } from 'zod';

const analyticsQuerySchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  limit: z.number().min(1).max(1000).default(100)
});
```

#### Day 9: RAG Pipeline Integration (PR #58)
**Effort:** 1 day

**Fix:** Update `/api/documents` route to use DocumentUploadPipeline instead of legacy processDocument

#### Day 10: Analytics Job (PR #59)
**Effort:** 0.5 days

**Fix:** Deploy cron schedule, test aggregation runs at midnight UTC

**Testing:**
```bash
# Manual trigger for testing
pm2 trigger meta-chat-worker aggregateAnalytics
# Check aggregated_analytics table for new rows
```

### Phase 2 Success Criteria:
- ✅ All API endpoints return correct responses (not 401/500)
- ✅ Billing routes authenticated and functional
- ✅ RAG chat includes document context
- ✅ Error messages don't leak internal details
- ✅ Input validation rejects invalid data
- ✅ Document upload creates embeddings
- ✅ Analytics aggregation runs successfully

---

## PHASE 3: STABILITY & UX POLISH (Week 3 - Days 11-15)

**Goal:** Production-grade user experience - no data loss, clear error states

**Duration:** 5 working days
**Effort:** 10 person-days
**Team:** 2 frontend, 1 backend
**Risk Level:** LOW - UX improvements

### Issues to Fix:

#### Day 11-12: Widget Resilience (PR #62, #63)
**Effort:** 3 days total

**Already Fixed (Merge PR #62):**
- Message persistence to localStorage ✅
- Message deduplication ✅

**Still Needed:**
- Add error UI for failed sends
- Add retry button for pending messages
- Add auto-retry queue with exponential backoff

**Merge PR #63:**
- Landing page navigation improvements
- Pricing display fixes

#### Day 13: Dashboard Improvements (PR #71)
**Effort:** 0.5 days

**Merge PR #71:**
- `/dashboard` alias
- Widget tenant selector
- Nav reorganization

#### Day 14: Rate Limiting (PR #72)
**Effort:** 0.5 days

**Deploy PR #72:**
- Identity-aware rate limiting
- IPv6 bypass fix
- Comprehensive tests included

**Note:** Still uses in-memory store - acceptable for single instance

#### Day 14-15: Dashboard State Management (PR #64)
**Effort:** 3 days

**Fixes:**
- Add error toast notifications for all mutations
- Add optimistic updates for toggles
- Add debouncing for search inputs
- Fix race conditions

### Phase 3 Success Criteria:
- ✅ Widget messages never lost on refresh
- ✅ Widget shows error states when send fails
- ✅ Users can retry failed messages
- ✅ Dashboard shows error toasts on failures
- ✅ Dashboard toggles update optimistically
- ✅ Rate limiting prevents abuse
- ✅ No console errors during normal operation

---

## PHASE 4: INTEGRATION & OBSERVABILITY (Week 4 - Days 16-20)

**Goal:** Complete integrations, improve monitoring, ensure operational readiness

**Duration:** 5 working days
**Effort:** 11.5 person-days
**Team:** 2 backend, 1 DevOps
**Risk Level:** MEDIUM - External integrations

### Issues to Fix:

#### Day 16: WhatsApp Integration (PR #65)
**Effort:** 0.5 days

**Fix:** Add webhook route `/api/webhooks/whatsapp` to receive inbound messages

**Testing:** Requires Meta webhook setup (manual verification)

#### Day 16-17: WebChat Integration (PR #66)
**Effort:** 1 day

**Fix:**
- Align Socket.IO server auth with adapter requirements
- Validate conversation ID in authentication
- Join sockets to conversation rooms
- Route messages through adapter

**Testing on VPS-00:**
```bash
# Test widget connection
# Verify messages routed through WebChat adapter
```

#### Day 17: Channel Connector Cleanup (PR #67)
**Effort:** 0.5 days

**Fix:** Extract webhook verification to shared utility (DRY)

#### Day 18: Backup Verification (PR #69)
**Effort:** 0.5 days

**Critical:** Perform actual restore test

```bash
# On VPS-00
createdb metachat_restore_test
gunzip < /home/deploy/backups/metachat_20251120_020001.sql.gz | psql metachat_restore_test
# Verify data integrity
dropdb metachat_restore_test
```

**Document:** Restore procedure in runbook

#### Day 18: Scalability Prep (PR #70)
**Effort:** 0.5 days

**Fix:** Add Socket.IO Redis adapter for multi-instance support

```typescript
// apps/api/src/server.ts
import { createAdapter } from '@socket.io/redis-adapter';
io.adapter(createAdapter(redisClient));
```

**Note:** Not critical for single instance, but required before scaling

#### Day 19: Monitoring & Logging (PR #76)
**Effort:** 1.5 days

**Improvements:**
- Add correlation IDs to worker logs
- Set up Sentry error tracking
- Create Grafana dashboards
- Add alerting rules (PagerDuty/email)

**Deploy:**
```bash
# Install Sentry SDK
npm install @sentry/node
# Configure in apps/api/src/server.ts and apps/worker/src/index.ts
```

#### Day 19-20: Resource Leak Fixes (PR #74)
**Effort:** 0.25 days

**Fixes:**
- Close PrismaClient in vector search service
- Clear dashboard timeouts on unmount

### Phase 4 Success Criteria:
- ✅ WhatsApp webhook receives messages
- ✅ WebChat messages routed correctly
- ✅ Backup restore verified (CRITICAL)
- ✅ Socket.IO scales across instances
- ✅ Errors tracked in Sentry
- ✅ Monitoring dashboards show key metrics
- ✅ Alerts fire on critical issues
- ✅ No connection leaks under load

---

## PHASE 5: TECHNICAL DEBT & DOCUMENTATION (Week 5+ - Days 21+)

**Goal:** Clean up tech debt, improve long-term maintainability

**Duration:** 7+ working days
**Effort:** 14.5 person-days
**Team:** Variable
**Risk Level:** LOW - Improvements only

### Issues to Fix:

#### Dependencies & Build (PR #51)
**Effort:** 1.5 days

- Add missing vitest devDependencies
- Fix Socket.io version conflict
- Add TypeScript project references
- Document build process

#### Data Integrity Automation (PR #68)
**Effort:** 2.5 days

- Automate data integrity checks (cron job)
- Add monitoring alerts for orphaned records
- Document remediation procedures

#### Migration Rollbacks (PR #73)
**Effort:** 3.5 days

- Write rollback scripts for all migrations
- Test migration reversibility
- Fix schema drift issues
- Document migration procedures

#### Performance Improvements (PR #74)
**Effort:** 0.25 days (minor fixes already identified)

#### Documentation PRs
**Effort:** 6.5 days total

All remaining documentation PRs (#30-#39, etc.) - Review and merge

### Phase 5 Success Criteria:
- ✅ All tests pass
- ✅ Build is reproducible
- ✅ Migrations are reversible
- ✅ Data integrity monitored
- ✅ Documentation complete and accurate

---

## RESOURCE ALLOCATION

### Optimal Team Structure

**3-Person Team (Recommended):**
- **Backend Lead (Full-time):** Phases 1, 2, 4
- **Frontend Developer (Full-time):** Phases 3, 4
- **DevOps/Backend (50%):** Phases 1, 4, 5

**Total Timeline:** ~4 weeks with 3 people (plus Phase 5 ongoing)

**Single Developer:**
- All phases sequential
- Timeline: 11-12 weeks
- High burnout risk

### Parallel Work Opportunities

**Week 1 (Phase 1):**
- Dev 1: Multi-tenant isolation (PR #56)
- Dev 2: Auth fixes (PR #53, #55)
- Dev 3: Security headers (PR #52, #54)

**Week 2 (Phase 2):**
- Dev 1: Backend fixes (PR #61, #57, #60)
- Dev 2: RAG integration (PR #58)
- Dev 3: Analytics (PR #59)

**Week 3 (Phase 3):**
- Dev 1: Widget resilience (PR #62)
- Dev 2: Dashboard improvements (PR #64, #71)
- Dev 3: Rate limiting (PR #72)

---

## RISK MANAGEMENT

### High-Risk Areas

1. **Multi-Tenant Isolation (PR #56)**
   - **Risk:** Breaking existing tenant functionality
   - **Mitigation:** Test with multiple test tenants before production
   - **Rollback:** Keep old routes available behind feature flag initially

2. **Authentication Changes (PR #53)**
   - **Risk:** Locking out all users
   - **Mitigation:** Create admin bypass mechanism
   - **Rollback:** Keep old API key validation in parallel for 1 week

3. **Database Migrations (PR #73)**
   - **Risk:** Data loss or corruption
   - **Mitigation:** ALWAYS test on backup-restored database first
   - **Rollback:** Have rollback scripts ready and tested

4. **Socket.IO Changes (PR #66, #70)**
   - **Risk:** Breaking real-time messaging
   - **Mitigation:** Deploy during low-traffic window
   - **Rollback:** Revert and restart API immediately if errors

### Mitigation Strategies

**Before ANY deployment:**
```bash
# 1. Create database backup
ssh admin@VPS-00 "/home/deploy/backup-database.sh"

# 2. Test restore (verify backup works)
# 3. Deploy to staging first (if available)
# 4. Deploy during low-traffic window
# 5. Monitor logs for 30 minutes post-deploy
pm2 logs --lines 100
```

**Emergency Rollback:**
```bash
# Revert last commit
git revert HEAD
npm run build
pm2 restart all

# Restore database (if needed)
gunzip < /path/to/backup.sql.gz | docker exec -i meta-chat-postgres psql -U metachat -d metachat
```

---

## TESTING STRATEGY

### Pre-Deployment Testing

**Local Testing:**
```bash
# Run all tests
npm run test:all

# Run linter
npm run lint

# Build check
npm run build
```

**Staging Environment (if available):**
- Deploy to staging first
- Run smoke tests
- Load test critical endpoints

### VPS-00 Validation (After Each Phase)

**Phase 1 Validation:**
```bash
# Test tenant isolation
# Attempt cross-tenant access (should fail)

# Test security headers
curl -I https://chat.genai.hr/api/health | grep -i "strict-transport-security"

# Test authentication
# Create new API key, verify it works
```

**Phase 2 Validation:**
```bash
# Test billing routes
curl -H "Authorization: Bearer $TOKEN" https://chat.genai.hr/api/billing/usage

# Test RAG chat
# Upload document, ask question about it, verify answer uses document

# Test analytics
docker exec meta-chat-postgres psql -U metachat -d metachat -c "SELECT COUNT(*) FROM aggregated_analytics;"
```

**Phase 3 Validation:**
```bash
# Test widget
# Open https://chat.genai.hr
# Send message, refresh page, verify message persists

# Test dashboard
# Login, toggle settings, verify no console errors
```

**Phase 4 Validation:**
```bash
# Test backup restore (CRITICAL)
# See backup verification procedure above

# Test monitoring
# Trigger error, verify Sentry captures it
```

### Regression Testing

**After Each Deployment:**
- Run automated test suite
- Manual smoke test of core flows:
  1. Signup new tenant
  2. Create API key
  3. Send message via API
  4. View messages in dashboard
  5. Upload document
  6. Ask RAG question

---

## SUCCESS METRICS

### Phase-Level Success Criteria

**Phase 1:** Security
- Zero cross-tenant access vulnerabilities
- All security headers present
- No authentication bypass possible

**Phase 2:** Functionality
- All documented features work
- No 500 errors in production logs
- RAG chat includes document context

**Phase 3:** UX
- Widget message loss rate: 0%
- Dashboard error rate: <1%
- User-facing error messages: 100% helpful

**Phase 4:** Operations
- Backup restore time: <10 minutes
- Error detection time: <5 minutes (via Sentry)
- P95 response time: <500ms

**Phase 5:** Quality
- Test coverage: >80% (currently 4%)
- Zero critical code smells (SonarQube)
- Documentation completeness: 100%

### Overall "Production Ready" Definition

System is production-ready when:
- ✅ All P0 and P1 issues resolved
- ✅ Security audit passes (no CRITICAL/HIGH findings)
- ✅ Backup/restore verified
- ✅ Monitoring and alerting operational
- ✅ Test coverage >60%
- ✅ Load tested to 2x expected traffic
- ✅ Runbook documented
- ✅ Team trained on operations

### Performance Benchmarks

**API Performance:**
- P50 response time: <200ms
- P95 response time: <500ms
- P99 response time: <1000ms

**Database:**
- Connection pool <80% utilized
- Query time P95: <100ms
- No connection leaks

**Worker:**
- Job processing latency: <5 seconds
- Job failure rate: <1%
- Memory stable (<200MB)

---

## DEPLOYMENT CADENCE

### Recommended Schedule

**Week 1-4 (Active Development):**
- Deploy daily to VPS-00 (off-peak hours: 2-4 AM CET)
- Each phase deploys as unit
- Full regression testing after each phase

**Week 5+ (Stabilization):**
- Deploy 2-3x per week
- Lower urgency fixes
- Can batch related changes

### Deployment Procedure

**For Each Deployment:**

```bash
# 1. Pre-deployment backup (ALWAYS)
ssh admin@VPS-00 "/home/deploy/backup-database.sh"

# 2. Pull latest code
cd /home/deploy/meta-chat-platform
git pull origin master

# 3. Install dependencies
npm install

# 4. Run migrations (if any)
cd packages/database
npm run migrate

# 5. Build
cd /home/deploy/meta-chat-platform
npm run build

# 6. Restart services (zero-downtime for API)
pm2 reload meta-chat-api
pm2 restart meta-chat-worker

# 7. Monitor for 15 minutes
pm2 logs --lines 50

# 8. Smoke test
curl https://chat.genai.hr/health
# Test login, send message

# 9. If errors: ROLLBACK
# git revert <commit>
# Repeat steps 3-6
```

### Deployment Windows

**Preferred:** 2-4 AM CET (lowest traffic)
**Acceptable:** 6-8 PM CET (if urgent)
**Avoid:** 9 AM - 5 PM CET (business hours)

**Expected Downtime:**
- Worker restart: ~5 seconds
- API reload: ~2 seconds (zero downtime with pm2 reload)
- Database migration: Variable (test in staging first)

---

## COMMUNICATION PLAN

### Internal Team Communication

**Daily Standup (During Phases 1-4):**
- What was deployed yesterday
- What's deploying today
- Blockers
- Risk assessment

**End-of-Phase Review:**
- Retrospective on what worked/didn't
- Update roadmap based on learnings
- Celebrate wins

### Stakeholder Updates

**Weekly Status Report:**
- Issues resolved this week
- Issues in progress
- Blockers requiring decisions
- Risk updates

**Template:**
```
Week X Status Report

✅ Completed: [List issues by PR#]
🔧 In Progress: [List issues]
🚧 Blocked: [List blockers]
📊 Progress: X/33 issues resolved (Y%)
🎯 On Track: Yes/No for Phase completion
⚠️ Risks: [Any new risks]
```

### User Notifications (If Needed)

**Planned Downtime:**
- 48 hours notice via email
- In-app banner 24 hours before
- Status page update

**Unplanned Outage:**
- Status page updated immediately
- Email within 1 hour
- Post-mortem within 24 hours

---

## CONTINUOUS IMPROVEMENT

### After Phase 5

**Monthly Review:**
- New issues identified?
- Performance degradation?
- User feedback themes?

**Quarterly Goals:**
- Test coverage target: 90%
- Zero high-severity security findings
- P95 response time <300ms

**Tech Debt Budget:**
- Allocate 20% of engineering time to tech debt
- Track tech debt in backlog
- Prioritize by impact × effort

---

## APPENDIX

### Quick Reference Commands

**Deploy:**
```bash
ssh admin@VPS-00
cd /home/deploy/meta-chat-platform
git pull && npm install && npm run build && pm2 reload all
```

**Rollback:**
```bash
git revert HEAD && npm run build && pm2 restart all
```

**Check Status:**
```bash
pm2 list
pm2 logs --lines 50
docker ps
```

**Database Backup:**
```bash
/home/deploy/backup-database.sh
```

**Database Restore:**
```bash
gunzip < backup.sql.gz | docker exec -i meta-chat-postgres psql -U metachat -d metachat
```

### Contact List

**On-Call Rotation:** TBD
**Escalation Path:** TBD
**PagerDuty:** TBD

---

## SUMMARY

This roadmap provides a **realistic 5-week plan** to address 33 identified issues in the Meta Chat Platform.

**Key Takeaways:**

1. **Start with Emergency Hotfix** - Worker is down, fix IMMEDIATELY
2. **Week 1: Security** - Make system safe
3. **Week 2: Functionality** - Make documented features work
4. **Week 3: UX** - Polish user experience
5. **Week 4: Operations** - Improve monitoring and integrations
6. **Week 5+: Debt** - Clean up technical debt

**Critical Success Factors:**
- Fix deployment blocker FIRST (npm install)
- Test tenant isolation thoroughly (highest risk)
- Verify backups before any risky changes
- Deploy incrementally, test after each phase
- Monitor aggressively, rollback quickly if needed

**With a 3-person team and proper execution, the platform can be production-ready in 4-5 weeks.**

---

**Last Updated:** 2025-11-20
**Next Review:** After Emergency Hotfix completion
