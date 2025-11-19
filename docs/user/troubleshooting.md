# Troubleshooting Guide

**Last Updated:** 2025-11-19
**Time to Complete:** Varies by issue (5-30 minutes)
**Difficulty:** Beginner-friendly

Fix common issues and get your chatbot working. This guide covers the most frequent problems and solutions.

## Getting Help

**Before you start:**
1. Note what happened exactly
2. Note when it started
3. Check browser console for errors (Ctrl+Shift+J)
4. Try refreshing the page
5. Try a different browser

**If that doesn't work:**
- Follow the relevant section below
- Or email support@metachats.ai with details

---

## Widget Not Loading

The chat box doesn't appear on your website.

### Checklist

**First, verify:**
- [ ] You pasted the embed code correctly
- [ ] You replaced `YOUR_WORKSPACE_ID` with actual ID
- [ ] Code is before `</body>` tag
- [ ] Website is public (not localhost)
- [ ] You waited 30 seconds

### Solution 1: Verify Embed Code

**Check the code:**

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="workspace_abc123"></script>
```

Should have:
- ✓ `https://chat.metachats.ai/widget.js`
- ✓ `data-tenant="workspace_..."`
- ✓ Not `YOUR_WORKSPACE_ID`
- ✓ Your actual workspace ID

**If wrong:**
1. Go to Dashboard
2. Settings → Widget
3. Copy code again (use copy button)
4. Replace code in website
5. Save/update file
6. Refresh website

### Solution 2: Clear Browser Cache

Browsers cache old code. Force refresh:

**Windows:**
- Ctrl+Shift+R

**Mac:**
- Cmd+Shift+R

**Or manually:**
1. Right-click → Inspect
2. Settings (gear icon)
3. Check "Disable cache (while DevTools open)"
4. Refresh

### Solution 3: Check Browser Console

See errors:

1. Right-click → Inspect
2. Go to **Console** tab
3. Look for red error messages
4. Note the error

**Common errors:**

**"Failed to load resource"**
- Network issue
- Domain blocked
- Check internet connection
- Try different network

**"CORS error"**
- Domain not whitelisted
- Solution: Go to Settings → Domains
- Add your domain
- Wait 1-2 minutes
- Refresh

**"undefined is not a function"**
- Code conflict with your site
- Contact support with error

### Solution 4: Check if Code is Really There

**View page source:**
1. Right-click → View Page Source
2. Press Ctrl+F
3. Search: `chat.metachats.ai`
4. Should find your script tag

**If not found:**
- Code wasn't pasted/saved
- Platform didn't save your changes
- Re-add code to website
- Verify it was saved

### Solution 5: Wait & Reload

Sometimes takes 30 seconds to fully load:

1. Refresh page (F5)
2. Wait 30 seconds
3. Scroll to bottom right
4. Look for chat icon
5. May be minimized

### Solution 6: Try Different Platform

If widget works on WordPress but not custom site:

**Test with:**
- Different website
- Different browser
- Different device
- Different internet connection

### Solution 7: Contact Support

If none work:

**Email: support@metachats.ai**

Include:
- Your website URL
- Error message (from console)
- Browser you're using
- When it stopped working (or never worked)
- Screenshot of problem

---

## Widget Loads But Chat Doesn't Work

Chat box appears but messages don't work.

### Checklist

- [ ] Chat box says "Connected"
- [ ] You waited 10-15 seconds for first response
- [ ] You asked a simple question (not complex)
- [ ] Internet connection is working

### Solution 1: Check Connection Status

**Look at top of chat:**
- **Green "Connected"** = OK, should work
- **Red "Disconnected"** = Problem

**If disconnected:**
1. Check internet: Open google.com
2. If internet works:
   - Refresh page
   - Close browser tabs
   - Restart browser
   - Try different network

### Solution 2: Wait for First Response

First response takes **10-15 seconds** because:
- System processing query
- AI thinking
- Loading context

**Don't:**
- Refresh page
- Close chat
- Ask new questions
- Turn off internet

**Do:**
- Wait patiently
- Watch for "typing..." indicator
- Response will come

### Solution 3: Try Simple Question

Complex questions might timeout:

**Try asking:**
- "Hello"
- "Hi"
- "Are you there?"

**Then try:**
- Slightly longer question
- Work up to complex questions

**If simple works but complex doesn't:**
- Responses are too long
- Knowledge base has issue
- See: [Documents Not Indexing](#documents-not-indexing)

### Solution 4: Check Knowledge Base

If chatbot responds but information is wrong:

**Verify documents:**
1. Go to Knowledge Base
2. See if documents are:
   - Status: "Ready" (not Processing)
   - Visible in list
   - Recently updated
3. Click document to preview

**If no documents:**
- Upload documents
- See [Knowledge Base Guide](knowledge-base.md)

**If document is wrong:**
- Update/replace document
- Test again in 2-3 minutes

### Solution 5: Test from Dashboard

**Use preview chat:**
1. Go to your chatbot
2. Click **Preview** or **Test Chat**
3. Try message
4. Does it work here?

**If YES:**
- Issue is with website embed
- See: [Widget Not Loading](#widget-not-loading)

**If NO:**
- Chatbot itself has problem
- Check configuration
- Restart chatbot
- Contact support

---

## Documents Not Indexing

Documents uploaded but not being used by chatbot.

### Checklist

- [ ] Document status is "Ready" (not "Processing")
- [ ] Document is visible in Knowledge Base list
- [ ] Enough time has passed (wait 1-2 minutes)
- [ ] You asked question related to document content

### Solution 1: Check Document Status

**In Knowledge Base:**
1. Find your document
2. Look at status column
3. Should show:
   - **Ready** = Using now
   - **Processing** = Still being prepared (wait)
   - **Error** = Problem uploading

**If Processing:**
- Small documents: Wait 30 seconds
- Large documents: Wait 2-5 minutes
- Refresh page to check progress

**If Error:**
- See: [Upload Fails](#upload-fails)

### Solution 2: Verify Question Matches Document

Chatbot needs question to relate to document content:

**Document contains:**
"Shipping takes 3-5 business days"

**Good question:**
- "How long is shipping?"
- "What's your shipping time?"

**Bad question:**
- "How's the weather?" (unrelated)
- "Do you exist?" (not in doc)

### Solution 3: Check Document Quality

**Bad documents don't index well:**

**Problems:**
- Scanned PDF with poor OCR
- Image-only PDF (no text)
- Corrupted file
- Very bad formatting
- Foreign language not in system prompt

**Solutions:**
1. Delete bad document
2. Fix source document
3. Re-upload
4. Or provide as different format

**For scanned PDFs:**
1. Use OCR tool first (free options: SmallPDF, ILovePDF)
2. Convert scanned image to text PDF
3. Upload new version
4. Should work better

### Solution 4: Test Specific Phrases

Ask exact phrases from document:

**From document:**
"Our return policy is 30 days"

**Ask chatbot:**
- "What's your return policy?"
- "Can I return items?"
- "How long for returns?"
- "30 day return"

**One should trigger the knowledge base**

### Solution 5: Re-upload Document

If it's been processing too long:

1. Go to Knowledge Base
2. Find document
3. Click **Delete**
4. Confirm deletion
5. Upload the document again
6. Wait 1-2 minutes

### Solution 6: Check Document Content

**Make sure document has:**
- Text (not just images)
- Relevant information
- Clear structure
- Current information (not outdated)

**Test document:**
1. Open PDF on your computer
2. Try to select text (not image)
3. If you can copy text → good
4. If you can't → scanned PDF issue

---

## Chatbot Not Responding

Messages sent but no response.

### Solution 1: Check Connection

**Is "Connected" shown at top?**

**If YES:**
1. Wait 10-15 seconds
2. Should get response
3. If still nothing → see Solution 2

**If NO:**
1. Refresh page
2. Check internet connection
3. Try different network
4. Try different device

### Solution 2: Check System Status

**Is our system down?**

1. Go to: status.metachats.ai
2. Check if there's red/yellow status
3. If yes, we're fixing it
4. Wait and try again in a few minutes

### Solution 3: Check API Key

**If using API:**

1. Go to Settings → API Keys
2. Verify key is correct
3. Check if key was revoked/deleted
4. Try regenerating key
5. Update your code with new key

### Solution 4: Check Rate Limits

**If sending many messages:**

- Default: 120 messages per 60 seconds
- If exceeded: Returns 429 error
- Wait 60 seconds and try again
- Or upgrade plan for higher limits

### Solution 5: Check Chatbot Settings

1. Go to your chatbot
2. Click **Settings**
3. Verify:
   - Chatbot is **Enabled** (not disabled)
   - LLM is selected (OpenAI, Claude, etc.)
   - System prompt is set
4. Save any changes
5. Test again

---

## Email Verification Issues

### I Didn't Receive Verification Email

**Wait first:**
- Check spam/junk folder
- Wait 2-3 minutes
- Refresh email page

**If still nothing:**
1. Go to: dashboard.metachats.ai/login
2. Click "Didn't get verification email?"
3. Enter your email
4. Click **Resend Email**
5. Check inbox again

**Still nothing?**
1. Check email is correct
2. Check with email provider
3. Try different email (if possible)
4. Contact support@metachats.ai

### Email Verified But Can't Log In

**If verification was successful:**

1. Go to: dashboard.metachats.ai/login
2. Enter email and password
3. Should log in

**If can't log in:**
- Password might be wrong
- Click **Forgot Password?**
- Reset password
- Try logging in again

### Verification Link Expired

Links valid for **24 hours**

**If expired:**
1. Go to: dashboard.metachats.ai/login
2. Click "Didn't get verification email?"
3. Resend link
4. Click new link immediately
5. Complete verification

---

## Payment & Billing Issues

### Card Declined

**Common reasons:**
- Card expired
- Insufficient funds
- Bank blocked transaction
- Wrong zip code

**Solutions:**
1. Check card details
2. Try different card
3. Call your bank
4. Ask bank to approve Meta Chat transactions

### Didn't Get Invoice

**Check:**
1. Settings → Billing → Invoices
2. List all invoices there
3. Might not be emailed
4. You can download/print

**If you need emailed:**
- Set up invoice emails in settings
- Go to Billing Preferences
- Enable email invoices

### Charge Appeared But No Access

**Wait:**
1. Refresh dashboard
2. Log out and back in
3. Wait 5 minutes
4. Check "Current Plan" section

**If still no access:**
1. Check Billing
2. See if payment status is "Pending"
3. If pending, wait 2-3 hours
4. If failed, see: [Card Declined](#card-declined)

### Want to Cancel Subscription

**To cancel:**
1. Settings → Billing
2. Click **Cancel Subscription**
3. Confirm
4. You keep access until billing date
5. No new charges

**For refund:**
- Within 7 days of upgrade: Possible
- After 7 days: Credit toward next month
- Contact: support@metachats.ai for exceptions

---

## Login Problems

### Forgot Password

**Reset it:**
1. Go to: dashboard.metachats.ai/login
2. Click **Forgot Password?**
3. Enter email
4. Check email for reset link
5. Click link
6. Create new password
7. Log in

### Account Locked

**If too many failed attempts:**

1. Wait 15 minutes
2. Try again
3. Make sure you use correct email
4. Make sure password is correct
5. Try resetting password instead

### Can't Find Account

**If you can't log in:**

1. Check email address is correct
2. Did you spell it right when signing up?
3. Check spam folder for confirmation email
4. Try resetting password
5. Email support@metachats.ai with details

### Two-Factor Auth Issues

**If 2FA enabled and having issues:**

1. Check code generation app
2. Make sure time is synced
3. Use backup codes if available
4. Disable 2FA (with backup code)
5. Enable it again

---

## Performance Issues

### Chat is Very Slow

**If responses take too long:**

**First check:**
1. Internet speed (speedtest.net)
2. Larger documents = slower (expected)
3. Complex questions = longer thinking time

**To improve:**
1. Reduce documents (delete old ones)
2. Ask simpler questions
3. Use shorter documents
4. Upgrade plan for better performance

### Widget is Slow/Freezes

**If chat box is slow or freezes:**

1. Check internet connection
2. Refresh page
3. Close other browser tabs
4. Restart browser
5. Try different browser
6. Try different device

### Knowledge Base Search Slow

**If searching documents is slow:**

1. You might have too many documents (500+)
2. Solution:
   - Delete old documents
   - Merge related docs
   - Organize by category
   - Archive unused docs

---

## Still Stuck?

**What to do:**
1. Check relevant section above
2. Try suggested solutions
3. Gather error information
4. Contact support

**Contact support:**

**Email:** support@metachats.ai

**Include:**
- What you were trying to do
- What went wrong
- When it happened
- Error message (if any)
- Screenshots
- Browser and device
- Your workspace name

**Response time:**
- Free/Starter: 24 hours (usually faster)
- Professional+: 2 hours (usually faster)
- Enterprise: 1 hour + phone support

---

## Troubleshooting Checklist

**For any problem:**

- [ ] Try refreshing page (Ctrl+R)
- [ ] Hard refresh (Ctrl+Shift+R)
- [ ] Close and reopen browser
- [ ] Check internet connection
- [ ] Check browser console (Ctrl+Shift+J)
- [ ] Try different browser
- [ ] Try different device
- [ ] Check documentation
- [ ] Check FAQs (faq.md)
- [ ] Then contact support

---

## Common Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| "CORS error" | Domain not allowed | Add domain in Settings → Domains |
| "Rate limit exceeded" | Too many requests | Wait 60 seconds, try again |
| "Invalid API key" | Wrong key | Check Settings → API Keys |
| "Conversation not found" | Old conversation | Might be deleted, check date |
| "Document upload failed" | Bad file | Check format, file size, file type |
| "Unauthorized" | Not logged in | Log in to dashboard |

---

## Key Takeaways

- Refresh often solves most issues
- Clear browser cache if changes don't show
- Wait for first response (10-15 seconds)
- Check document status before asking questions
- Always verify you replaced template values
- Contact support if stuck

---

**Last Updated:** 2025-11-19
**Word Count:** 1,956 words
