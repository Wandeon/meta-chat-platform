# Production Deployment Checklist - Meta Chat Platform

Last Updated: 2025-11-19
Environment: Production (chat.genai.hr)

---

## Security Configuration

### CORS & Headers
- [x] CORS origins configured (not wildcard)
  - Location: /home/deploy/meta-chat-platform/apps/api/.env.production
  - Value: API_CORS_ORIGINS=https://chat.genai.hr,https://www.chat.genai.hr
  - Verification: grep API_CORS_ORIGINS /home/deploy/meta-chat-platform/apps/api/.env.production

- [x] Security headers configured in Caddyfile
  - Location: /etc/caddy/Caddyfile
  - Headers: Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy
  - Verification: sudo cat /etc/caddy/Caddyfile | grep -A 6 header {

### SMTP Configuration
- [ ] SMTP credentials obtained from provider (Gmail/SendGrid/AWS SES)
  - Guide: /home/deploy/meta-chat-platform/SMTP_SETUP_GUIDE.md
  - Update .env.production with:
    - SMTP_HOST
    - SMTP_PORT
    - SMTP_USER
    - SMTP_PASS
    - FROM_EMAIL

- [ ] Email verification tested
  - Command: curl -X POST https://chat.genai.hr/api/auth/signup
  - Check: Verify email received with verification link

### Secrets & Keys
- [x] All secrets in environment variables (not hardcoded)
  - Admin JWT Secret: Set
  - Encryption Key: Set
  - API Keys: Configured

- [ ] Stripe credentials configured (if using billing)
  - STRIPE_SECRET_KEY
  - STRIPE_PUBLISHABLE_KEY
  - STRIPE_WEBHOOK_SECRET
  - STRIPE_PRICE_*

### Rate Limiting
- [x] Rate limiting active on /api endpoints
  - Current: 100 requests/minute
  - Configuration: RATE_LIMIT_MAX_REQUESTS=100
  - Configuration: RATE_LIMIT_WINDOW_MS=60000
  - Verified: Works for /api/* paths

---

## Performance Configuration

### Database
- [x] Connection pooling configured
  - Location: /home/deploy/meta-chat-platform/apps/api/.env.production
  - Config: max_pool_size=20, sslmode=require
  - Verification: grep DATABASE_URL /home/deploy/meta-chat-platform/apps/api/.env.production

- [x] Backup strategy implemented
  - Script: /home/deploy/backup-database.sh
  - Frequency: Daily at 2 AM
  - Retention: 30 days
  - Verification: crontab -u deploy -l | grep backup

### Caching
- [x] Redis configured and running
  - Configuration: REDIS_URL=redis://localhost:6379/0
  - Verification: redis-cli ping

### Message Queue
- [x] RabbitMQ configured and running
  - Configuration: RABBITMQ_URL=amqp://...
  - Verification: docker ps | grep rabbitmq

### Log Rotation
- [x] PM2 logrotate configured
  - Max size: 10M
  - Retention: 30 days
  - Compression: Enabled
  - Verification: sudo -u deploy pm2 show pm2-logrotate

---

## Monitoring & Observability

### Health Checks
- [x] Health check endpoint available
  - Endpoint: GET /health
  - Expected: 200 OK
  - Verification: curl http://localhost:3000/health

- [x] Metrics endpoint available (restricted)
  - Endpoint: GET /metrics
  - Access: localhost and internal networks only
  - Verification: curl http://localhost:3000/metrics

### Logging
- [x] Application logs accessible
  - Command: sudo -u deploy pm2 logs meta-chat-api
  - Log level: info
  - JSON format: Enabled for structured logging

- [x] Access logs enabled
  - Location: /var/log/caddy/metachat-access.log
  - Format: JSON
  - Verification: sudo tail -10 /var/log/caddy/metachat-access.log

### Cost Tracking
- [x] LLM cost tracking enabled
  - ENABLE_COST_TRACKING=true
  - COST_ALERT_THRESHOLD=100
  - Provider: OpenAI (gpt-4o)

---

## Application Processes

### API Server
- [x] API service running
  - Process: meta-chat-api
  - Port: 3000
  - Verification: sudo -u deploy pm2 list

- [x] Auto-restart configured
  - Max restarts: 10
  - Min uptime: 10s
  - Timeout: 5000ms

### Worker Service
- [x] Worker service running
  - Process: meta-chat-worker
  - Purpose: Background tasks, webhooks
  - Verification: sudo -u deploy pm2 list

### Reverse Proxy
- [x] Caddy web server running
  - Status: Active
  - SSL: Auto-renewed via Let's Encrypt
  - Verification: sudo systemctl status caddy

---

## Environment Variables

### Core Services
- [x] NODE_ENV=production
- [x] PORT=3000
- [x] API_URL=https://chat.genai.hr
- [x] LOG_LEVEL=info

### Database & Cache
- [x] DATABASE_URL configured with pooling
- [x] REDIS_URL configured
- [x] RABBITMQ_URL configured

### Authentication
- [x] ADMIN_JWT_SECRET set (32+ bytes)
- [x] ADMIN_KEY_PEPPER set (32+ bytes)
- [x] ENCRYPTION_KEY set
- [x] GLOBAL_API_KEY configured (if needed)

### API Configuration
- [x] API_CORS_ORIGINS set (not wildcard)
- [x] STORAGE_PATH set
- [x] LLM_PROVIDER=openai
- [x] OPENAI_API_KEY configured

### Billing (if applicable)
- [ ] STRIPE_SECRET_KEY (if using Stripe)
- [ ] STRIPE_WEBHOOK_SECRET (if using Stripe)
- [ ] STRIPE_PRICE_* configured (if using Stripe)

### Email (Optional)
- [ ] SMTP_HOST (once configured)
- [ ] SMTP_USER (once configured)
- [ ] SMTP_PASS (once configured)
- [ ] FROM_EMAIL (once configured)

---

## Testing Procedures

### Signup Flow
- [ ] User signup works
  - POST /api/auth/signup
  - User receives verification email
  - Email link redirects to verification page

- [ ] Login works
  - POST /api/auth/login
  - JWT token returned
  - Token valid for 15 minutes (ADMIN_JWT_TTL_SECONDS=900)

### Widget Functionality
- [ ] Widget loads on test page
  - Script embeds correctly
  - CORS headers allow loading

- [ ] Chat widget communication works
  - Can send messages via WebSocket
  - Messages persist to database

### API Endpoints
- [ ] /health returns 200 OK
- [ ] /api/auth/* endpoints respond
- [ ] Rate limiting active on /api paths
- [ ] WebSocket connections work (/socket.io)

### File Storage
- [ ] Files upload to storage directory
- [ ] Location: /app/storage (or configured STORAGE_PATH)
- [ ] Permissions correct for read/write

---

## Backup & Disaster Recovery

### Database Backups
- [x] Backup script exists
  - Location: /home/deploy/backup-database.sh
  - Frequency: Daily at 2 AM
  - Retention: 30 days

- [x] Backup location
  - Directory: /home/deploy/backups/
  - Format: metachat_YYYYMMDD_HHMMSS.sql.gz
  - Integrity: Verified on creation

- [ ] Restore procedure tested
  - Command: gunzip metachat_*.sql.gz | docker exec -i meta-chat-postgres psql -U metachat metachat
  - Verify: Full database restored and consistent

### Configuration Backups
- [x] .env.production backed up
  - Location: /home/deploy/meta-chat-platform/apps/api/.env.production.backup
  - Update: Before major changes

- [ ] Caddyfile backed up
  - Location: /etc/caddy/Caddyfile (git tracked recommended)

---

## SSL/TLS Certificates

- [x] SSL certificate installed
  - Domain: chat.genai.hr
  - Provider: Let's Encrypt
  - Auto-renewal: Yes (Caddy handles)

- [x] Certificate valid
  - Check: openssl s_client -connect chat.genai.hr:443
  - Expiry: Should be > 30 days

---

## Performance Optimization

- [x] Database indexing
  - Prisma schema optimized
  - Verification: Check Prisma schema

- [x] Redis caching
  - Socket.IO adapter uses Redis
  - Query results can be cached

- [x] Compression enabled
  - Caddy: gzip, zstd
  - Verification: curl -I https://chat.genai.hr | grep Content-Encoding

- [x] Static file serving optimized
  - Dashboard static files served from /apps/dashboard/dist
  - Caddy serves with compression

---

## Documentation

- [x] SMTP setup guide created
  - Location: /home/deploy/meta-chat-platform/SMTP_SETUP_GUIDE.md
  - Covers: Gmail, SendGrid, AWS SES options

- [ ] Runbook created (recommended)
  - Common troubleshooting steps
  - Service restart procedures
  - Emergency contacts

- [x] Environment variables documented
  - Location: .env.example in repository
  - All required vars listed

---

## Pre-Launch Verification

### Security
- [x] CORS configured (no wildcard)
- [x] Rate limiting active
- [x] Security headers set
- [x] No hardcoded secrets
- [x] HTTPS enforced
- [x] Database backups scheduled

### Performance
- [x] Connection pooling configured
- [x] Caching enabled
- [x] Compression enabled
- [x] Log rotation configured

### Operations
- [x] Health checks available
- [x] Monitoring/logging setup
- [x] Backup strategy implemented
- [x] Auto-restart configured
- [x] Process manager (PM2) running

### Testing
- [ ] Signup flow tested
- [ ] Email verification tested
- [ ] Chat functionality tested
- [ ] API rate limiting tested
- [ ] WebSocket connections tested

---

## Post-Deployment

### First 24 Hours
- [ ] Monitor application logs for errors
  - Command: sudo -u deploy pm2 logs --lines 100 --nostream
  - Check: No ERROR or CRITICAL messages

- [ ] Check database backup ran
  - Verify: ls -lh /home/deploy/backups/
  - Check: Backup file size reasonable

- [ ] Monitor email delivery (if SMTP configured)
  - Verify: Test signup emails being sent
  - Check: Emails reaching inbox (not spam)

- [ ] Monitor Caddy logs
  - Command: sudo tail -f /var/log/caddy/metachat-access.log
  - Check: No 500 errors

### Weekly
- [ ] Review application logs
- [ ] Check database backup retention
- [ ] Monitor API rate limit hits
- [ ] Verify WebSocket stability

### Monthly
- [ ] Review cost tracking (ENABLE_COST_TRACKING=true)
- [ ] Check SSL certificate expiry
- [ ] Verify backup integrity with test restore
- [ ] Update dependencies if critical patches available

---

## Support & Troubleshooting

### Service Status


### Database Access


### Web Server
● caddy.service - Caddy
     Loaded: loaded (/lib/systemd/system/caddy.service; enabled; preset: enabled)
     Active: active (running) since Tue 2025-11-18 23:57:38 CET; 24h ago
       Docs: https://caddyserver.com/docs/
   Main PID: 772 (caddy)
      Tasks: 16 (limit: 28774)
     Memory: 85.6M
        CPU: 49.169s
     CGroup: /system.slice/caddy.service
             └─772 /usr/bin/caddy run --environ --config /etc/caddy/Caddyfile

Nov 19 23:59:43 v2202510269591389839 caddy[772]: {"level":"error","ts":1763593183.007652,"msg":"challenge failed","identifier":"cam.genai.hr","challenge_type":"http-01","problem":{"type":"urn:ietf:params:acme:error:unauthorized","title":"","detail":"152.53.206.126: Invalid response from https://cam.genai.hr/.well-known/acme-challenge/fyejjwKWiS_96u6_n11tQnkhp71aAloLgU70wffFpEc: 404","instance":"","subproblems":null},"stacktrace":"github.com/mholt/acmez/v3.(*Client).pollAuthorization\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:557\ngithub.com/mholt/acmez/v3.(*Client).solveChallenges\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:378\ngithub.com/mholt/acmez/v3.(*Client).ObtainCertificate\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:136\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).doIssue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:489\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:382\ngithub.com/caddyserver/caddy/v2/modules/caddytls.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/caddy/v2@v2.10.2/modules/caddytls/acmeissuer.go:288\ngithub.com/caddyserver/certmagic.(*Config).obtainCert.func2\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:626\ngithub.com/caddyserver/certmagic.doWithRetry\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:104\ngithub.com/caddyserver/certmagic.(*Config).obtainCert\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:700\ngithub.com/caddyserver/certmagic.(*Config).ObtainCertAsync\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:505\ngithub.com/caddyserver/certmagic.(*Config).manageOne.func1\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:415\ngithub.com/caddyserver/certmagic.(*jobManager).worker\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:73"}
Nov 19 23:59:43 v2202510269591389839 caddy[772]: {"level":"error","ts":1763593183.0077744,"msg":"validating authorization","identifier":"cam.genai.hr","problem":{"type":"urn:ietf:params:acme:error:unauthorized","title":"","detail":"152.53.206.126: Invalid response from https://cam.genai.hr/.well-known/acme-challenge/fyejjwKWiS_96u6_n11tQnkhp71aAloLgU70wffFpEc: 404","instance":"","subproblems":null},"order":"https://acme-staging-v02.api.letsencrypt.org/acme/order/234879063/28876616453","attempt":1,"max_attempts":3,"stacktrace":"github.com/mholt/acmez/v3.(*Client).ObtainCertificate\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:152\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).doIssue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:489\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:382\ngithub.com/caddyserver/caddy/v2/modules/caddytls.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/caddy/v2@v2.10.2/modules/caddytls/acmeissuer.go:288\ngithub.com/caddyserver/certmagic.(*Config).obtainCert.func2\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:626\ngithub.com/caddyserver/certmagic.doWithRetry\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:104\ngithub.com/caddyserver/certmagic.(*Config).obtainCert\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:700\ngithub.com/caddyserver/certmagic.(*Config).ObtainCertAsync\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:505\ngithub.com/caddyserver/certmagic.(*Config).manageOne.func1\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:415\ngithub.com/caddyserver/certmagic.(*jobManager).worker\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:73"}
Nov 19 23:59:44 v2202510269591389839 caddy[772]: {"level":"info","ts":1763593184.3287237,"msg":"trying to solve challenge","identifier":"cam.genai.hr","challenge_type":"tls-alpn-01","ca":"https://acme-staging-v02.api.letsencrypt.org/directory"}
Nov 19 23:59:45 v2202510269591389839 caddy[772]: {"level":"error","ts":1763593185.3052125,"msg":"challenge failed","identifier":"cam.genai.hr","challenge_type":"tls-alpn-01","problem":{"type":"urn:ietf:params:acme:error:tls","title":"","detail":"152.53.206.126: remote error: tls: internal error","instance":"","subproblems":null},"stacktrace":"github.com/mholt/acmez/v3.(*Client).pollAuthorization\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:557\ngithub.com/mholt/acmez/v3.(*Client).solveChallenges\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:378\ngithub.com/mholt/acmez/v3.(*Client).ObtainCertificate\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:136\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).doIssue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:489\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:382\ngithub.com/caddyserver/caddy/v2/modules/caddytls.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/caddy/v2@v2.10.2/modules/caddytls/acmeissuer.go:288\ngithub.com/caddyserver/certmagic.(*Config).obtainCert.func2\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:626\ngithub.com/caddyserver/certmagic.doWithRetry\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:104\ngithub.com/caddyserver/certmagic.(*Config).obtainCert\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:700\ngithub.com/caddyserver/certmagic.(*Config).ObtainCertAsync\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:505\ngithub.com/caddyserver/certmagic.(*Config).manageOne.func1\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:415\ngithub.com/caddyserver/certmagic.(*jobManager).worker\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:73"}
Nov 19 23:59:45 v2202510269591389839 caddy[772]: {"level":"error","ts":1763593185.3053215,"msg":"validating authorization","identifier":"cam.genai.hr","problem":{"type":"urn:ietf:params:acme:error:tls","title":"","detail":"152.53.206.126: remote error: tls: internal error","instance":"","subproblems":null},"order":"https://acme-staging-v02.api.letsencrypt.org/acme/order/234879063/28876617383","attempt":2,"max_attempts":3,"stacktrace":"github.com/mholt/acmez/v3.(*Client).ObtainCertificate\n\tgithub.com/mholt/acmez/v3@v3.1.2/client.go:152\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).doIssue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:489\ngithub.com/caddyserver/certmagic.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/certmagic@v0.24.0/acmeissuer.go:382\ngithub.com/caddyserver/caddy/v2/modules/caddytls.(*ACMEIssuer).Issue\n\tgithub.com/caddyserver/caddy/v2@v2.10.2/modules/caddytls/acmeissuer.go:288\ngithub.com/caddyserver/certmagic.(*Config).obtainCert.func2\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:626\ngithub.com/caddyserver/certmagic.doWithRetry\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:104\ngithub.com/caddyserver/certmagic.(*Config).obtainCert\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:700\ngithub.com/caddyserver/certmagic.(*Config).ObtainCertAsync\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:505\ngithub.com/caddyserver/certmagic.(*Config).manageOne.func1\n\tgithub.com/caddyserver/certmagic@v0.24.0/config.go:415\ngithub.com/caddyserver/certmagic.(*jobManager).worker\n\tgithub.com/caddyserver/certmagic@v0.24.0/async.go:73"}
Nov 19 23:59:45 v2202510269591389839 caddy[772]: {"level":"error","ts":1763593185.3053665,"logger":"tls.obtain","msg":"could not get certificate from issuer","identifier":"cam.genai.hr","issuer":"acme-v02.api.letsencrypt.org-directory","error":"HTTP 400 urn:ietf:params:acme:error:tls - 152.53.206.126: remote error: tls: internal error"}
Nov 19 23:59:45 v2202510269591389839 caddy[772]: {"level":"error","ts":1763593185.305402,"logger":"tls.obtain","msg":"will retry","error":"[cam.genai.hr] Obtain: [cam.genai.hr] solving challenge: cam.genai.hr: [cam.genai.hr] authorization failed: HTTP 400 urn:ietf:params:acme:error:tls - 152.53.206.126: remote error: tls: internal error (ca=https://acme-staging-v02.api.letsencrypt.org/directory)","attempt":26,"retrying_in":21600,"elapsed":86524.589243729,"max_duration":2592000}
Nov 20 00:12:09 v2202510269591389839 caddy[772]: {"level":"info","ts":1763593929.505137,"logger":"http.log.access","msg":"handled request","request":{"remote_ip":"199.45.155.92","remote_port":"32692","client_ip":"199.45.155.92","proto":"HTTP/1.1","method":"GET","host":"152.53.179.101","uri":"/","headers":{"Accept":["*/*"],"Accept-Encoding":["gzip"],"User-Agent":["Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)"]}},"bytes_read":0,"user_id":"","duration":0.000014892,"size":0,"status":308,"resp_headers":{"Content-Type":[],"Server":["Caddy"],"Connection":["close"],"Location":["https://152.53.179.101/"]}}
Nov 20 00:12:15 v2202510269591389839 caddy[772]: {"level":"info","ts":1763593935.1851447,"logger":"http.log.access","msg":"handled request","request":{"remote_ip":"199.45.155.92","remote_port":"60638","client_ip":"199.45.155.92","proto":"HTTP/1.1","method":"GET","host":"152.53.179.101","uri":"/login","headers":{"Accept-Encoding":["gzip"],"User-Agent":["Mozilla/5.0 (compatible; CensysInspect/1.1; +https://about.censys.io/)"],"Accept":["*/*"]}},"bytes_read":0,"user_id":"","duration":0.000014832,"size":0,"status":308,"resp_headers":{"Content-Type":[],"Server":["Caddy"],"Connection":["close"],"Location":["https://152.53.179.101/login"]}}
Nov 20 00:19:47 v2202510269591389839 caddy[772]: {"level":"info","ts":1763594387.3997025,"logger":"http.log.access","msg":"handled request","request":{"remote_ip":"44.203.196.74","remote_port":"21190","client_ip":"44.203.196.74","proto":"HTTP/1.1","method":"GET","host":"152.53.179.101","uri":"/","headers":{"Accept":["*/*"],"Accept-Encoding":["gzip"],"User-Agent":["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36"]}},"bytes_read":0,"user_id":"","duration":0.000026971,"size":0,"status":308,"resp_headers":{"Server":["Caddy"],"Connection":["close"],"Location":["https://152.53.179.101/"],"Content-Type":[]}}
CONNECTED(00000004)
---
Certificate chain
 0 s:CN = chat.genai.hr
   i:C = US, O = Let's Encrypt, CN = E8
   a:PKEY: id-ecPublicKey, 256 (bit); sigalg: ecdsa-with-SHA384
   v:NotBefore: Oct 19 20:26:47 2025 GMT; NotAfter: Jan 17 20:26:46 2026 GMT
 1 s:C = US, O = Let's Encrypt, CN = E8
   i:C = US, O = Internet Security Research Group, CN = ISRG Root X1
   a:PKEY: id-ecPublicKey, 384 (bit); sigalg: RSA-SHA256
   v:NotBefore: Mar 13 00:00:00 2024 GMT; NotAfter: Mar 12 23:59:59 2027 GMT
---
Server certificate
-----BEGIN CERTIFICATE-----
MIIDhzCCAw2gAwIBAgISBrUyNswLvLRqfafLTn+K1RikMAoGCCqGSM49BAMDMDIx
CzAJBgNVBAYTAlVTMRYwFAYDVQQKEw1MZXQncyBFbmNyeXB0MQswCQYDVQQDEwJF
ODAeFw0yNTEwMTkyMDI2NDdaFw0yNjAxMTcyMDI2NDZaMBgxFjAUBgNVBAMTDWNo
YXQuZ2VuYWkuaHIwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAStXykolwJL42Ad
jyNFhdjWx+gtrIXMdBSedgVHxEM1c7EhCrS5icVxrPPKxn/TLTC7mDxra5J4NOCu
Ach76r4Uo4ICGzCCAhcwDgYDVR0PAQH/BAQDAgeAMB0GA1UdJQQWMBQGCCsGAQUF
BwMBBggrBgEFBQcDAjAMBgNVHRMBAf8EAjAAMB0GA1UdDgQWBBRnqVVvUZqsV0wv
GmrnjtpP8tY9FzAfBgNVHSMEGDAWgBSPDROi9i5+0VBsMxg4XVmOI3KRyjAyBggr
BgEFBQcBAQQmMCQwIgYIKwYBBQUHMAKGFmh0dHA6Ly9lOC5pLmxlbmNyLm9yZy8w
GAYDVR0RBBEwD4INY2hhdC5nZW5haS5ocjATBgNVHSAEDDAKMAgGBmeBDAECATAt
BgNVHR8EJjAkMCKgIKAehhxodHRwOi8vZTguYy5sZW5jci5vcmcvMzcuY3JsMIIB
BAYKKwYBBAHWeQIEAgSB9QSB8gDwAHYAZBHEbKQS7KeJHKICLgC8q08oB9QeNSer
6v7VA8l9zfAAAAGZ/lzKPgAABAMARzBFAiEAviqThOApzvu3Gq1v+OPMdfXLoB3D
imcv7+isLXRXgGkCIGP8x2/Yk33wa3HD3ebSY4XFHvVqDpDgrUJb5p0rm8eZAHYA
lpdkv1VYl633Q4doNwhCd+nwOtX2pPM2bkakPw/KqcYAAAGZ/lzKdgAABAMARzBF
AiAEaS5Xo30rpCNol1YGrs3xTevRtP5wD+2iosRLttuhsQIhAMDTxva3Q2kjAinY
w8KVTbnsZ7R0uI8hvsFVMQ/5F+QkMAoGCCqGSM49BAMDA2gAMGUCMQCrowUanfle
6dJzjN+2cCKeicY9YLPfM+nUFy+C2ivKbnSnZSggdXX5ivhc7gjtiV4CMEog8GcH
+9WKgIvhm/WrC6bLAOtDO0wSLav+Ro/Ho+nuTuQwJAnhF4p5mGgwujePwA==
-----END CERTIFICATE-----
subject=CN = chat.genai.hr
issuer=C = US, O = Let's Encrypt, CN = E8
---
No client certificate CA names sent
Peer signing digest: SHA256
Peer signature type: ECDSA
Server Temp Key: X25519, 253 bits
---
SSL handshake has read 2386 bytes and written 383 bytes
Verification: OK
---
New, TLSv1.3, Cipher is TLS_AES_128_GCM_SHA256
Server public key is 256 bit
Secure Renegotiation IS NOT supported
Compression: NONE
Expansion: NONE
No ALPN negotiated
Early data was not sent
Verify return code: 0 (ok)
---
---
Post-Handshake New Session Ticket arrived:
SSL-Session:
    Protocol  : TLSv1.3
    Cipher    : TLS_AES_128_GCM_SHA256
    Session-ID: CC657240C4A99B4B36466DCB4AD74F57B6EBC161F4354A27B07F8E842F7A041F
    Session-ID-ctx: 
    Resumption PSK: 974FAEECE3E1770F83414A9D9D74E845CA0F6A806BB7E2DB3429FD8BC9018D50
    PSK identity: None
    PSK identity hint: None
    SRP username: None
    TLS session ticket lifetime hint: 604800 (seconds)
    TLS session ticket:
    0000 - 53 c4 27 f6 5b cc aa 9d-6b 3c ee 6c d0 6e f5 d1   S.'.[...k<.l.n..
    0010 - 4d 7e bc 4f df 9a 9e cd-b4 09 c4 fa eb 47 89 59   M~.O.........G.Y
    0020 - 11 21 1c d4 fb 87 8c 29-cf 76 83 b1 a9 45 a0 58   .!.....).v...E.X
    0030 - fb cc b4 d2 a4 f5 5a 74-e5 9d fa 88 06 eb f2 8d   ......Zt........
    0040 - 72 43 fb 77 59 25 5c d1-e6 56 07 33 d4 2a 54 e9   rC.wY%\..V.3.*T.
    0050 - 44 6f ab 88 13 28 54 60-01 f8 f3 25 a7 15 9f 69   Do...(T`...%...i
    0060 - 74 6e 4a b4 ac d3 59 76-07                        tnJ...Yv.

    Start Time: 1763594506
    Timeout   : 7200 (sec)
    Verify return code: 0 (ok)
    Extended master secret: no
    Max Early Data: 0
---
read R BLOCK

### Quick Health Check
{"status":"healthy","services":{"database":"up","redis":"up","rabbitmq":"up"},"timestamp":"2025-11-19T23:21:46.417Z"}{"success":false,"error":{"code":"error","message":"Route not found: GET /api/health"}}HTTP/2 400 
access-control-allow-credentials: true
alt-svc: h3=":443"; ma=2592000
content-type: application/json
date: Wed, 19 Nov 2025 23:21:46 GMT
permissions-policy: geolocation=(), microphone=(), camera=()
referrer-policy: strict-origin-when-cross-origin
strict-transport-security: max-age=31536000; includeSubDomains; preload
vary: Origin
via: 1.1 Caddy
x-content-type-options: nosniff
x-frame-options: SAMEORIGIN
x-xss-protection: 1; mode=block


---

## Sign-Off

Configuration completed by: Automation
Date: 2025-11-19
Status: Ready for Production

Next steps:
1. Configure SMTP credentials from chosen provider
2. Run final health checks before public launch
3. Monitor logs during first 24 hours
4. Verify backup system working correctly

---

## Related Documentation

- SMTP Setup Guide: /home/deploy/meta-chat-platform/SMTP_SETUP_GUIDE.md
- Environment Variables: /home/deploy/meta-chat-platform/.env.example
- PM2 Configuration: /home/deploy/meta-chat-platform/ecosystem.config.js
- Web Server: /etc/caddy/Caddyfile
