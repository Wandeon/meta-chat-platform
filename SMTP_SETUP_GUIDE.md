# SMTP Configuration Guide for Meta Chat Platform

Email verification is a critical feature for user registration and security. This guide covers three SMTP setup options from simplest to most production-ready.

## Prerequisites

- Meta Chat Platform running on your server
- Access to the  file at 
- Admin access to verify email functionality

---

## Option 1: Gmail (Easiest for Testing)

Gmail provides a simple way to test email functionality quickly.

### Setup Steps:

1. **Enable 2-Factor Authentication on Gmail:**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password:**
   - Visit https://myaccount.google.com/apppasswords
   - Select Mail and Windows Computer (or your device)
   - Google will generate a 16-character password
   - Copy this password (it includes spaces)

3. **Update .env.production:**
   

4. **Test Email Sending:**
   {"success":false,"error":"Failed to send verification email. Please try again."}

5. **Check Logs:**
   5|meta-cha | 2025-11-20 00:21:47 +01:00: Error sending verification email: Error: connect ECONNREFUSED 127.0.0.1:587
5|meta-cha | 2025-11-20 00:21:47 +01:00: Failed to send verification email: Error: Failed to send verification email
5|meta-cha | 2025-11-20 00:21:47 +01:00:     at EmailService.sendVerificationEmail (/home/deploy/meta-chat-platform/apps/api/src/services/EmailService.ts:116:13)

### Limitations:
- Gmail limits to 500 emails/day for free accounts
- Not suitable for production with multiple users
- May be flagged as less secure by Gmail

---

## Option 2: SendGrid (Recommended for Production)

SendGrid is a professional email delivery service with excellent deliverability.

### Setup Steps:

1. **Create SendGrid Account:**
   - Sign up at https://sendgrid.com
   - Verify your domain for authentication (DKIM, SPF)
   - This ensures emails land in inbox, not spam

2. **Create API Key:**
   - Go to Settings → API Keys
   - Click Create API Key
   - Select Full Access or create restricted key for email only
   - Copy the API key (starts with SG....)

3. **Update .env.production:**
   

4. **Domain Verification (Critical for Production):**
   - In SendGrid Dashboard: Settings → Sender Authentication
   - Choose Domain Authentication
   - Add your domain (chat.genai.hr)
   - Follow DNS setup instructions
   - Wait for verification (usually < 1 hour)

5. **Test Configuration:**
   Use --update-env to update environment variables
[PM2] Applying action restartProcessId on app [meta-chat-api](ids: [ 5 ])

6. **Monitor Delivery:**
   - SendGrid Dashboard → Activity → Email Log
   - Check delivery status, bounces, and spam reports

### Benefits:
- Unlimited email sending (based on plan)
- Excellent deliverability and ISP relationships
- Detailed analytics and logs
- 24/7 support
- Plans start at 9.95/month

---

## Option 3: AWS SES (Best for Scale)

Use if you're already on AWS or need extremely high volume.

### Setup Steps:

1. **Verify Domain in AWS SES:**
   - AWS Console → SES → Verified Identities
   - Add Domain (chat.genai.hr)
   - Add DNS records as instructed
   - Wait for verification

2. **Request Production Access:**
   - By default, AWS limits SES to sandbox mode
   - Submit request to move to production
   - Provide use case and expected volume

3. **Create SMTP Credentials:**
   - AWS Console → SES → SMTP Settings
   - Click Create My SMTP Credentials
   - Download credentials (Username and Password)

4. **Update .env.production:**
   

### Benefits:
- Integrates with AWS ecosystem
- Very cost-effective at scale
- Built-in authentication with AWS IAM
- Excellent for high volumes (24+ emails/second)

---

## Required Environment Variables

Regardless of provider, ensure these are set in :



---

## Verification Steps After Configuration

### 1. Check Environment Variables Are Loaded:
# SMTP Configuration - Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
# SMTP Configuration - SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_actual_sendgrid_api_key_here
# SMTP Configuration - AWS SES
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password

### 2. Restart API Service:
Use --update-env to update environment variables
[PM2] Applying action restartProcessId on app [meta-chat-api](ids: [ 5 ])

### 3. Check for Startup Errors:
/home/deploy/meta-chat-platform/logs/api-error.log last 100 lines:
5|meta-cha | 2025-11-20 00:09:46 +01:00: Error: listen EADDRINUSE: address already in use :::3000
5|meta-cha | 2025-11-20 00:09:46 +01:00: Error: listen EADDRINUSE: address already in use :::3000
5|meta-cha | 2025-11-20 00:09:47 +01:00: Error: listen EADDRINUSE: address already in use :::3000
5|meta-cha | 2025-11-20 00:09:47 +01:00: Error: listen EADDRINUSE: address already in use :::3000
5|meta-cha | 2025-11-20 00:09:47 +01:00: Error: listen EADDRINUSE: address already in use :::3000
5|meta-cha | 2025-11-20 00:21:47 +01:00: Error sending verification email: Error: connect ECONNREFUSED 127.0.0.1:587
5|meta-cha | 2025-11-20 00:21:47 +01:00: Failed to send verification email: Error: Failed to send verification email
5|meta-cha | 2025-11-20 00:21:47 +01:00:     at EmailService.sendVerificationEmail (/home/deploy/meta-chat-platform/apps/api/src/services/EmailService.ts:116:13)

### 4. Test with Real Email:


Check your inbox for verification email (may take 1-2 minutes).

### 5. Verify Email Was Sent:
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.558Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.558Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.559Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}
5|meta-cha | 2025-11-20 00:21:52 +01:00: {"level":"INFO","time":"2025-11-19T23:21:52.560Z","pid":1055627,"hostname":"v2202504269591335677","scope":"Database","message":"Disconnecting Prisma client"}

---

## Troubleshooting

### Email Not Sending

1. **Check credentials in .env.production:**
   # SMTP Configuration - Gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx
# SMTP Configuration - SendGrid
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASS=SG.your_actual_sendgrid_api_key_here
# SMTP Configuration - AWS SES
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-ses-username
SMTP_PASS=your-ses-password

2. **Verify environment was reloaded:**
   

3. **Check API logs for SMTP errors:**
   [TAILING] Tailing last 15 lines for [meta-chat-api] process (change the value with --lines option)
/home/deploy/meta-chat-platform/logs/api-error.log last 15 lines:
5|meta-cha | 2025-11-20 00:09:47 +01:00: }
5|meta-cha | 2025-11-20 00:21:47 +01:00: Error sending verification email: Error: connect ECONNREFUSED 127.0.0.1:587
5|meta-cha | 2025-11-20 00:21:47 +01:00:     at TCPConnectWrap.afterConnect [as oncomplete] (node:net:1611:16)
5|meta-cha | 2025-11-20 00:21:47 +01:00:     at TCPConnectWrap.callbackTrampoline (node:internal/async_hooks:130:17) {
5|meta-cha | 2025-11-20 00:21:47 +01:00:   errno: -111,
5|meta-cha | 2025-11-20 00:21:47 +01:00:   code: 'ESOCKET',
5|meta-cha | 2025-11-20 00:21:47 +01:00:   syscall: 'connect',
5|meta-cha | 2025-11-20 00:21:47 +01:00:   address: '127.0.0.1',
5|meta-cha | 2025-11-20 00:21:47 +01:00:   port: 587,
5|meta-cha | 2025-11-20 00:21:47 +01:00:   command: 'CONN'
5|meta-cha | 2025-11-20 00:21:47 +01:00: }
5|meta-cha | 2025-11-20 00:21:47 +01:00: Failed to send verification email: Error: Failed to send verification email
5|meta-cha | 2025-11-20 00:21:47 +01:00:     at EmailService.sendVerificationEmail (/home/deploy/meta-chat-platform/apps/api/src/services/EmailService.ts:116:13)
5|meta-cha | 2025-11-20 00:21:47 +01:00:     at processTicksAndRejections (node:internal/process/task_queues:95:5)
5|meta-cha | 2025-11-20 00:21:47 +01:00:     at /home/deploy/meta-chat-platform/apps/api/src/routes/auth/signup.ts:86:4

4. **Test SMTP connection manually:**
   Trying 2a00:1450:400c:c02::6c...
Connected to smtp.gmail.com.
Escape character is '^]'.

### Email in Spam Folder

1. **For Gmail:** Less secure apps need allowlist
2. **For SendGrid:** Domain verification is incomplete
3. **For AWS SES:** May need to whitelist recipient addresses in sandbox mode

### Rate Limiting Errors

- Gmail limits to 500 emails/day
- Check plan limits for your provider
- Consider upgrading if near limits

---

## Security Best Practices

1. **Never commit credentials to git:**
   

2. **Use app-specific passwords:**
   - Gmail: App Passwords (not account password)
   - SendGrid: API Keys (not account credentials)
   - AWS SES: IAM credentials with minimal permissions

3. **Rotate credentials regularly:**
   - Every 90 days minimum
   - After team member departures
   - If compromised

4. **Restrict sender address:**
   - Use noreply@ address for transactional emails
   - Set FROM_EMAIL carefully

5. **Monitor email delivery:**
   - Check bounce rates weekly
   - Monitor complaint rates
   - Review provider dashboards

---

## Production Checklist

- [ ] SMTP credentials obtained from provider
- [ ] .env.production updated with SMTP settings
- [ ] API service restarted and verified running
- [ ] Test signup request sent
- [ ] Verification email received
- [ ] Domain authenticated with provider (SendGrid/SES)
- [ ] Rate limits understood and documented
- [ ] Email logs accessible for monitoring
- [ ] Credentials backed up securely
- [ ] Team trained on email issue troubleshooting

---

## Next Steps

1. Choose a provider (Gmail for testing, SendGrid/SES for production)
2. Follow the setup steps for your chosen provider
3. Update .env.production with credentials
4. Run verification steps
5. Monitor first 24 hours for delivery issues
6. Set up monitoring alerts if available

---

## Support Resources

- **SendGrid:** https://sendgrid.com/docs/
- **AWS SES:** https://docs.aws.amazon.com/ses/
- **Gmail:** https://support.google.com/mail/
- **Meta Chat Platform:** Check logs at 

