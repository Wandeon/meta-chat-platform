# FAQs - Frequently Asked Questions

**Last Updated:** 2025-11-19
**Last Section Updated:** 2025-11-19

## AI & Accuracy

### How accurate is the AI?

**Short answer:** Typically 85-95% accurate for questions in your knowledge base.

**Longer answer:**
- **With knowledge base:** Very accurate (85-95%)
  - Answers based on your actual documents
  - Less hallucination
- **Without knowledge base:** Good but generic (70-80%)
  - Uses general AI knowledge
  - Might not be specific to you

**Ways to improve:**
1. Upload quality documents
2. Update documents regularly
3. Upload recent/specific information
4. Remove outdated documents
5. Ask follow-up questions in chat

### What if the chatbot gets something wrong?

**Immediate:**
1. Correct the user manually
2. Note what was wrong
3. Check your knowledge base

**Long-term fix:**
1. Find the document that should have correct answer
2. Update/replace the document
3. Delete outdated documents
4. Chatbot learns from updated documents

**For quality issues:**
1. Go to Conversations
2. Find the problematic conversation
3. Flag or report issue
4. We analyze and help improve

### Can the chatbot learn from conversations?

**Current:** No automatic learning from chats
- Chatbot doesn't update knowledge from conversations
- Only uses documents you upload

**Why:** Safety and accuracy
- We want to be sure information is correct
- Automatic learning could introduce errors
- Manual updates = quality control

**Best practice:**
- Review conversation to find gaps
- Update documents to fill gaps
- Documents stay authoritative

### How do you prevent hallucinations?

**Hallucinations** = AI making up information

**We prevent this by:**
1. Using your knowledge base
2. Requiring answers be based on documents
3. Confidence scoring
4. Human escalation for uncertain responses

**You can improve by:**
1. Uploading more documents
2. Being specific in documents
3. Using clear headings and structure
4. Removing contradictory information

---

## LLM & Models

### Can I use my own LLM?

**Currently:** No

**What we support:**
- OpenAI GPT-4o (default)
- Anthropic Claude (some plans)
- Local/custom LLMs (contact sales)

**Roadmap:** Custom LLM support coming Q2 2025

**For now:**
1. Free and Starter = GPT-4o only
2. Professional = Choice of Claude or GPT-4o
3. Enterprise = Custom LLM possible

### What models do you support?

**Default:** OpenAI GPT-4o
- Latest, most capable model
- Good balance of speed and quality
- Can handle complex queries

**Alternative:** Anthropic Claude 3
- Excellent reasoning
- Better for technical topics
- Slightly slower

**Coming soon:**
- Local Ollama support
- Custom fine-tuned models
- Open-source models

### How do you handle data when using external LLMs?

**OpenAI & Claude:**
- Your documents and messages are sent to their API
- You agree to their terms when using their models
- We don't use your data to train models
- Data is encrypted in transit

**Enterprise/Local LLMs:**
- Data stays on your servers
- No external API calls
- Complete data privacy
- Contact sales for setup

### Can I download my data?

**Yes.**

**Documents:**
1. Go to Knowledge Base
2. Click document
3. Click **Download**

**Conversations:**
1. Go to Conversations
2. Select conversations
3. Click **Export**
4. Choose format: PDF, CSV, JSON

**All data:**
1. Go to Settings
2. Click **Data Export**
3. Request full export
4. We email you ZIP file
5. Takes 24-48 hours for large exports

---

## Languages & Internationalization

### What languages are supported?

**AI Response:**
- English
- Spanish
- French
- German
- Italian
- Portuguese
- Russian
- Chinese (Simplified & Traditional)
- Japanese
- Korean
- Arabic
- Hindi
- Turkish
- Dutch
- And 10+ more

**Knowledge Base:**
- Supports any language
- Just upload documents in that language
- Chatbot will respond in that language

**Widget:**
- English
- Spanish
- French
- German
- Portuguese
- More coming

### How do you handle multi-language?

**Process:**
1. User writes in any language
2. System detects language
3. Response in same language
4. Uses knowledge base in that language

**Setup:**
1. Go to Settings
2. Enable languages you support
3. Upload documents in each language
4. (Optional) Custom system prompt per language

**Limitations:**
- Knowledge base must exist in that language
- Chatbot won't translate documents automatically
- You must upload Spanish docs for Spanish questions

---

## Data & Privacy

### How is my data protected?

**In transit:**
- SSL/TLS encryption
- All connections are HTTPS
- 256-bit encryption

**At rest:**
- Encrypted database
- Secure servers
- Regular backups
- Access logs

**Compliance:**
- GDPR compliant (EU users)
- CCPA compliant (California)
- SOC 2 Type II certified
- HIPAA available for healthcare

### Do you use my data to train models?

**No.**

We do **NOT**:
- Train our models on your data
- Share data with model providers
- Use conversations to improve default model
- Sell your data

We **DO**:
- Store data securely
- Use data only for your chatbot
- Delete data if you request
- Encrypt all data

### What happens to conversations?

**Storage:**
- Stored indefinitely unless you delete
- Accessible via Conversations tab
- Searchable and exportable

**Retention:**
- You control retention
- Can manually delete conversations
- Can set auto-delete policy (coming soon)

**Privacy:**
- Only you and your team can see
- Not shared with anyone
- Encrypted in database

### Can I delete my data?

**Yes, several ways:**

**Delete specific conversation:**
1. Go to Conversations
2. Find conversation
3. Click delete icon
4. Confirm

**Delete all conversations:**
1. Settings → Data Management
2. Click **Delete All Conversations**
3. Confirm (irreversible)

**Delete documents:**
1. Knowledge Base
2. Find document
3. Click delete
4. Confirm

**Delete entire workspace:**
1. Settings → Danger Zone
2. Click **Delete Workspace**
3. Confirm multiple times
4. All data removed (irreversible)

**Export before deleting:**
1. Do this FIRST
2. Settings → Export Data
3. Download ZIP file
4. Keep for records
5. Then delete if needed

---

## Limits & Billing

### What happens if I exceed my plan limits?

**Message limit exceeded:**
- Chatbot stops responding
- See message: "Message limit reached"
- Options:
  1. Upgrade plan (instant)
  2. Wait for next month (resets)
  3. Buy additional messages

**Document limit exceeded:**
- Can't upload new documents
- See message: "Document limit reached"
- Options:
  1. Delete old documents
  2. Upgrade plan
  3. Merge small documents

**Team member limit:**
- Can't invite more people
- See message: "Team limit reached"
- Options:
  1. Remove unused members
  2. Upgrade plan

### Can I get extra messages without upgrading?

**Yes.**

**Option 1: Pay-as-you-go**
- Starter plan: Extra $0.50 per 100 messages
- Professional: Extra $0.25 per 100 messages

**Option 2: Upgrade plan**
- Starter: 5,000 messages/month
- Professional: 50,000 messages/month

**Option 3: Contact sales**
- Custom pricing
- Volume discounts
- Enterprise contracts

### How do message limits reset?

**Monthly reset:**
- Resets on your billing date
- Example: Billed on 15th
- Messages reset on 15th each month
- Not calendar month

**Tracking:**
1. Dashboard shows current usage
2. "X of Y messages used"
3. Shows days until reset

**Planning:**
- Know your monthly limits
- Monitor usage
- Upgrade before running out
- We notify you at 80% usage

---

## Data Export & GDPR

### How do I export my data?

**Step 1: Request Export**
1. Settings → Data Management
2. Click **Request Export**
3. Choose what to export:
   - All conversations
   - All documents
   - All settings
   - Specific date range

**Step 2: Receive Email**
- Email sent within 24 hours
- Contains download link
- Link valid for 7 days
- ZIP file with data

**Step 3: Download**
- Click link
- Download ZIP
- Extract on your computer

**Formats included:**
- Conversations: JSON, CSV
- Documents: Original files + metadata
- Settings: JSON
- Metadata: Full export log

### Is Meta Chat GDPR compliant?

**Yes.**

**What we comply with:**
- Data protection regulations
- Right to access
- Right to delete
- Right to export
- Consent management

**Your rights:**
- Access your data anytime
- Export your data anytime
- Delete your data anytime
- Know what data we have
- Know how we use it

**Data Processing:**
- We have Data Processing Agreement
- Legitimate business interest
- Or your consent
- No third-party sharing

### How long do you keep data?

**While account active:**
- Indefinite storage
- You control retention

**After account deleted:**
- Deleted immediately
- Backup retention: 30 days
- Then permanently destroyed
- We can expedite deletion

**Legal holds:**
- Might retain longer if required by law
- Rare circumstances
- You'll be notified

---

## Support & Troubleshooting

### Where can I get help?

**Self-service:**
1. Check [Getting Started Guide](getting-started.md)
2. Search [FAQs](faq.md)
3. Check [Troubleshooting Guide](troubleshooting.md)
4. Search documentation

**Email support:**
- Email: support@metachats.ai
- Response time: 24 hours (usually faster)
- Include: Error, steps taken, account ID

**Premium support (Paid plans):**
- Priority response (2 hours)
- Chat support
- Phone support (Enterprise)

### What if I found a bug?

**Report it:**
1. Go to Help → Report Bug
2. Or email: support@metachats.ai
3. Include:
   - What you were doing
   - What went wrong
   - Browser and device
   - Screenshot/error message
4. We investigate and fix

**Workaround:**
- Check Troubleshooting Guide
- Try different browser
- Try different device
- Clear cache and cookies

### How often are updates released?

**Deployment schedule:**
- Critical fixes: Immediately
- Features: Weekly
- Updates: Monthly
- Major releases: Quarterly

**You're notified:**
- In-app notifications
- Email notifications (if enabled)
- Status page: status.metachats.ai

---

## Miscellaneous

### Can I use Meta Chat for my own AI product?

**Depends on plan:**

**Not allowed:**
- Using as white-label reseller
- Building competing service
- Reverse engineering

**Allowed:**
- Using as chatbot for your business
- Embedding on your site
- API integration with your product
- Custom development

**For reselling:**
- Contact sales@metachats.ai
- White-label option
- Custom pricing
- Reseller agreement

### Do you have a free trial?

**Yes - Free Plan:**
- 1 chatbot
- 10 documents
- 100 messages/month
- Full features (no paywalls)
- No credit card needed
- Forever (no expiration)

**Best for:**
- Testing platform
- Small projects
- Learning
- Proof of concept

### Can I cancel anytime?

**Yes.**

**How:**
1. Go to Settings → Billing
2. Click **Cancel Subscription**
3. Confirm

**What happens:**
- No new charges
- Access until billing date
- Then downgrade to Free
- No refund for current month

**Example:**
- Pay $29 on Jan 1
- Cancel Jan 15
- Use Starter until Feb 1
- Free plan after

### How do I contact sales?

**Sales team:**
- Email: sales@metachats.ai
- Phone: +1 (555) 123-4567
- Website: metachats.ai/sales
- Calendly: calendly.com/metachats/sales

**They help with:**
- Custom plans
- Enterprise features
- Volume pricing
- Technical requirements

---

## Still Have Questions?

**Before contacting support:**
1. Read relevant guide
2. Check FAQs (this page)
3. Check Troubleshooting Guide
4. Try solution in documentation

**Then contact:**
- Email: support@metachats.ai
- Include error message and steps

We're here to help!

---

**Last Updated:** 2025-11-19
**Word Count:** 2,142 words
