# DEPLOYMENT QUICK REFERENCE CHECKLIST
**Platform:** Meta Chat Platform
**Target:** VPS-00 (chat.genai.hr)
**Status:** Production Ready (96% complete)
**Date:** November 21, 2025

---

## ⚡ QUICK START (15 minutes)

### Step 1: Backup (2 minutes)
```bash
ssh admin@VPS-00
cd /home/deploy/meta-chat-platform
sudo -u postgres pg_dump -Fc meta_chat_platform > /backups/pre-deploy-$(date +%Y%m%d-%H%M%S).dump
```

### Step 2: Stop Services (1 minute)
```bash
pm2 stop all
pm2 status  # Verify all stopped
```

### Step 3: Update Code (3 minutes)
```bash
git fetch origin
git checkout master
git pull origin master
npm install --workspaces
npm run build --workspaces
```

### Step 4: Run Migration (2 minutes)
```bash
cd packages/database

# Pre-check
psql $DATABASE_URL -f prisma/migrations/20251121000002_restore_tenant_fk/check_orphaned_data.sql

# Migrate
npx prisma migrate deploy
npx prisma generate

# Validate (7 tests)
psql $DATABASE_URL -f prisma/migrations/20251121000002_restore_tenant_fk/validation_tests.sql
```

### Step 5: Restart Services (2 minutes)
```bash
cd /home/deploy/meta-chat-platform
pm2 restart ecosystem.config.js
sleep 10
pm2 status  # Verify all running
```

### Step 6: Validate (5 minutes)
```bash
# Health check
curl https://chat.genai.hr:3007/health

# Check logs
pm2 logs --lines 50

# Run tests
npm test  # Should see: 67 passing, 0 failures
```

---

## ✅ VALIDATION CHECKLIST

### Critical Validations

- [ ] **Health Check Passes**
  ```bash
  curl https://chat.genai.hr:3007/health
  # Expected: {"status":"healthy"}
  ```

- [ ] **Services Running**
  ```bash
  pm2 status
  # Expected: meta-chat-api (online), meta-chat-worker (online)
  ```

- [ ] **Database FK Constraint Exists**
  ```sql
  SELECT conname FROM pg_constraint WHERE conname = 'messages_tenant_id_fkey';
  # Expected: messages_tenant_id_fkey
  ```

- [ ] **Test Suite Passing**
  ```bash
  npm test
  # Expected: 67 tests passing, 0 failures
  ```

- [ ] **No Errors in Logs**
  ```bash
  pm2 logs --err --lines 20
  # Expected: Minimal or no errors
  ```

- [ ] **Event System Initialized**
  ```bash
  pm2 logs meta-chat-api | grep -i "event system"
  # Expected: "Event system initialized successfully"
  ```

- [ ] **Worker Secret Decryption Working**
  ```bash
  pm2 logs meta-chat-worker | grep -i "channel"
  # Expected: No "Invalid credentials" errors
  ```

### Feature Validations

- [ ] **RAG Semantic Search** - Query returns relevant context
- [ ] **Channel Messages** - WhatsApp/Messenger messages send successfully
- [ ] **Billing Enforcement** - Past-due tenants get grace period headers
- [ ] **Event Emission** - Events appear in Event table
- [ ] **Webhook Delivery** - Webhooks receive POST requests

---

## 🔧 TROUBLESHOOTING QUICK FIXES

### Services Won't Start
```bash
# Check specific error
pm2 logs --lines 100 --err

# Regenerate Prisma client
cd packages/database && npx prisma generate

# Rebuild all
cd /home/deploy/meta-chat-platform
npm run build --workspaces
```

### Migration Fails
```bash
# Check for orphaned data
psql $DATABASE_URL -c "SELECT COUNT(*) FROM messages m WHERE NOT EXISTS (SELECT 1 FROM tenants t WHERE t.id = m.\"tenantId\");"

# Clean if needed
psql $DATABASE_URL -c "DELETE FROM messages WHERE \"tenantId\" NOT IN (SELECT id FROM tenants);"

# Retry migration
npx prisma migrate deploy
```

### Test Suite Fails
```bash
# Regenerate Prisma
cd packages/database && npx prisma generate

# Clear and reinstall
rm -rf node_modules package-lock.json
npm install
npm test
```

---

## 🔄 ROLLBACK (If Needed)

### Quick Rollback (5 minutes)
```bash
ssh admin@VPS-00
cd /home/deploy/meta-chat-platform

# Stop services
pm2 stop all

# Revert code
git log --oneline -10  # Find previous commit
git checkout <PREVIOUS_COMMIT_HASH>

# Rebuild
npm run build --workspaces

# Restart
pm2 restart all
pm2 logs --lines 50
```

### Database Rollback (10 minutes)
```bash
# Restore backup
sudo -u postgres pg_restore -d meta_chat_platform -c /backups/pre-deploy-TIMESTAMP.dump
```

---

## 📊 SUCCESS METRICS

| Metric | Target | Command |
|--------|--------|---------|
| Services Running | 2/2 | `pm2 status` |
| Health Check | "healthy" | `curl https://chat.genai.hr:3007/health` |
| Tests Passing | 67/67 | `npm test` |
| FK Constraint | Exists | Query `pg_constraint` |
| No Errors | Clean logs | `pm2 logs --err` |
| Memory Usage | < 400MB/service | `pm2 monit` |

---

## 📁 DEPLOYMENT ARTIFACTS

### Branches to Merge (9 branches)
1. `fix/issue-043-complete-stripe-webhooks`
2. `fix/issue-044-decrypt-channel-secrets`
3. `fix/issue-045-remove-pm2-secrets`
4. `fix/issue-046-wire-vector-search`
5. `fix/issue-047-restore-tenant-fk`
6. `fix/issue-048-fix-test-suite`
7. `fix/issue-049-add-env-example`
8. `fix/issue-041-initialize-event-system`
9. `fix/issue-042-wire-orchestrator`

### Key Files Modified
- `ecosystem.config.js` - PM2 config (secrets removed)
- `apps/worker/src/channel-adapters.ts` - Secret decryption
- `apps/api/src/services/vectorSearch.ts` - pgvector integration
- `apps/api/src/server.ts` - Event system initialization
- `packages/orchestrator/src/index.ts` - Functional implementation
- `packages/database/prisma/migrations/` - FK restoration

### Documentation Created
- `DEPLOYMENT_GUIDE.md` - Full deployment procedures
- `PROJECT_FINAL_SUMMARY.md` - Project completion report
- `DEPLOYMENT_CHECKLIST.md` - This quick reference
- `PARALLEL_AGENTS_SESSION_2_REPORT.md` - Session 2 results
- `ACTUAL_COMPLETION_STATUS.md` - Current status (96%)

---

## 🎯 DEPLOYMENT SIGN-OFF

**Pre-Deployment:**
- [ ] All branches reviewed
- [ ] Backup completed
- [ ] Deployment window scheduled
- [ ] Team notified

**Post-Deployment:**
- [ ] Services running (pm2 status green)
- [ ] Health check passing
- [ ] Migration completed (7/7 tests passed)
- [ ] No errors in logs
- [ ] Test suite passing (67/67)
- [ ] Features validated

**Final Approval:**
- Deployed By: __________________
- Date: __________________
- Time: __________________
- Status: ☐ SUCCESS  ☐ ROLLBACK

---

## 📞 SUPPORT

**Full Guide:** `/home/admin/meta-chat-platform/DEPLOYMENT_GUIDE.md`
**Server:** `ssh admin@VPS-00`
**Production Path:** `/home/deploy/meta-chat-platform`

---

**Document Version:** 1.0
**Last Updated:** November 21, 2025
**Status:** ✅ Ready for Production Deployment
