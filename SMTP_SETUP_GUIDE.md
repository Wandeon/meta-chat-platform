# SMTP Configuration Guide for Meta Chat Platform

Email verification is a critical feature for user registration and security.

## Option 1: Gmail (Easiest for Testing)

Setup Steps:
1. Enable 2-Factor Authentication: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Add to .env.production:
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=xxxx xxxx xxxx xxxx
   FROM_EMAIL=your-gmail@gmail.com
   BASE_URL=https://chat.genai.hr

4. Restart: sudo -u deploy pm2 restart meta-chat-api

Limitations: 500 emails/day, not for production

---

## Option 2: SendGrid (Recommended for Production)

Setup Steps:
1. Create account at https://sendgrid.com
2. Verify domain: chat.genai.hr
3. Create API Key
4. Add to .env.production:
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=apikey
   SMTP_PASS=SG.your_api_key_here
   FROM_EMAIL=noreply@chat.genai.hr
   BASE_URL=https://chat.genai.hr

5. Restart service and test

Benefits:
- Unlimited emails (plan-based)
- Excellent deliverability
- Detailed analytics
- Professional support
- Starting at $19.95/month

---

## Option 3: AWS SES (Best for Scale)

Setup Steps:
1. Verify domain in AWS SES
2. Request production access
3. Create SMTP credentials
4. Add to .env.production:
   SMTP_HOST=email-smtp.us-east-1.amazonaws.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-ses-username
   SMTP_PASS=your-ses-password
   FROM_EMAIL=noreply@chat.genai.hr
   BASE_URL=https://chat.genai.hr

---

## Verification Steps

1. Check environment:
   grep SMTP /home/deploy/meta-chat-platform/apps/api/.env.production

2. Restart API service:
   sudo -u deploy pm2 restart meta-chat-api && sleep 5

3. Check for errors:
   sudo -u deploy pm2 logs meta-chat-api --lines 100 --nostream | grep -i error

4. Test signup and check for verification email

5. Verify logs:
   sudo -u deploy pm2 logs meta-chat-api --lines 50 --nostream | tail -20

---

## Troubleshooting

Email not sending:
- Check .env.production credentials
- View API logs for SMTP errors
- Verify service restarted
- Test SMTP port connectivity

Email in spam:
- Gmail: Add to safe senders
- SendGrid: Complete domain verification
- AWS SES: Whitelist addresses if in sandbox mode

---

## Production Checklist

- SMTP credentials obtained
- .env.production updated
- API restarted
- Test signup sent
- Email received
- Domain authenticated
- Rate limits documented
- Monitoring configured

