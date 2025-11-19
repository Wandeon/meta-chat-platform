# Customization Guide

**Last Updated:** 2025-11-19
**Time to Complete:** 10-20 minutes
**Difficulty:** Beginner-friendly

Customize how your chatbot looks, sounds, and behaves. Make it match your brand and communicate your way.

## Widget Appearance

### Change Colors

**Step 1: Go to Widget Settings**
1. Dashboard → Chatbots
2. Select your chatbot
3. Click **Widget Settings** or **Appearance**

**Step 2: Customize Colors**
- **Primary Color:** Main button and accent color
- **Secondary Color:** Supporting elements
- **Text Color:** Message text
- **Background Color:** Chat window background

**Step 3: Preview**
- See changes in real-time preview
- Click **Save** when happy

**Popular Color Schemes:**
- Brand colors: Use your company colors
- Professional: Dark blue + white
- Friendly: Light blue + orange
- Modern: Dark theme with accent color

### Position on Page

Control where the chat box appears:

**Options:**
- Bottom right (default)
- Bottom left
- Top right
- Top left

**Offset:**
- Adjust distance from edge (10-50 pixels usually)
- Prevents overlapping page content

## Chatbot Personality

### System Prompt

The **system prompt** tells your chatbot how to behave. Edit it to set personality and tone.

**Go to Settings:**
1. Dashboard → Chatbots → Your Chatbot
2. Click **Settings** tab
3. Find **System Prompt** field
4. Edit the text

**Example Prompts:**

**Friendly & Casual:**
```
You're a friendly support assistant for Acme Corp. 
Be warm and conversational. Use casual language. 
Answer questions based on the knowledge base provided.
```

**Professional & Formal:**
```
You are a professional customer service representative.
Maintain a formal tone. Provide concise, accurate answers.
Always cite your sources from the knowledge base.
```

**Excited & Energetic:**
```
You're an enthusiastic member of our team!
Be upbeat and helpful. Show excitement about our products.
Use exclamation marks! Emojis are okay.
```

### Custom Instructions

Add specific behaviors to your system prompt:

```
You are a helpful customer service assistant.

IMPORTANT RULES:
1. Always be polite and helpful
2. If unsure, say so instead of guessing
3. Offer to escalate to human agent for complex issues
4. Keep responses under 150 words
5. Use simple language, avoid jargon
```

## Multi-Language Support

### Enable Multiple Languages

**Step 1: Go to Chatbot Settings**
1. Dashboard → Your Chatbot → Settings
2. Find **Languages** section

**Step 2: Add Languages**
- Click **Add Language**
- Select from list:
  - English
  - Spanish
  - French
  - German
  - Italian
  - Portuguese
  - Russian
  - Chinese
  - Japanese
  - Korean
  - Arabic
  - And 10+ more

**Step 3: Set System Prompts**
- Each language can have its own system prompt
- Customize tone for each language
- Dialects matter (Spanish vs. Latin American Spanish)

### Language Detection

The chatbot automatically detects the user's language and responds appropriately. If a user writes in Spanish, they get responses in Spanish.

**Note:** Knowledge base documents must be in supported languages.

## Operating Hours & Offline Messages

### Set Operating Hours

**Step 1: Go to Availability Settings**
1. Dashboard → Chatbot Settings
2. Find **Operating Hours**

**Step 2: Set Hours for Each Day**
- Monday: 9:00 AM - 5:00 PM
- Tuesday: 9:00 AM - 5:00 PM
- etc.

**Step 3: Set Timezone**
- Choose your timezone
- Ensures accurate hours

### Offline Message

**When chatbot is offline, show message:**

```
Thanks for reaching out! Our team is currently offline.
We'll be back online tomorrow at 9:00 AM.
In the meantime, feel free to leave a message.
```

**Edit your message:**
1. Go to Operating Hours settings
2. Find **Offline Message** field
3. Type your custom message
4. Save

**Options:**
- Show chat history only
- Show offline form
- Show with contact info
- Redirect to email signup

## Welcome Message & First Impression

### Customize Welcome Message

**Step 1: Go to Messages**
1. Dashboard → Chatbot Settings
2. Find **Messages** or **Welcome**

**Step 2: Edit Welcome Message**

**Example:**
```
Hi there! I'm here to help answer questions about our products.
What can I help you with today?
```

**Tips:**
- Keep it short (1-2 sentences)
- Set expectations
- Be friendly
- Include call-to-action

### Chat Window Title

What shows at the top of the chat box:

**Examples:**
- "Customer Support"
- "Ask Me Anything"
- "How Can We Help?"
- "[Your Company] Chat"

**Edit:**
1. Widget Settings
2. Find **Title** field
3. Type your title
4. Save

## Input Placeholder Text

The grayed-out text in the message box:

**Default:** "Type a message..."

**Better options:**
- "Ask a question..."
- "What can we help with?"
- "Type your question here..."
- "[Your product] support..."

**Change:**
1. Go to Messages settings
2. Find **Input Placeholder**
3. Edit text
4. Save

## Response Behavior

### Response Length

Control how long responses are:

**Options:**
- Short (50-100 words)
- Medium (100-200 words) - Default
- Long (200-400 words)
- Variable (AI decides)

**When to use:**
- Short: Mobile users, quick answers
- Medium: Most cases
- Long: Complex topics, detailed docs
- Variable: Flexible responses

### Typing Indicator

Show "chatbot is typing" while generating response:

**Options:**
- Always show
- Show only for long responses
- Never show

**Impact:**
- Shows: User knows bot is working
- Hides: Response feels faster

## Error Handling

### When Chatbot Can't Answer

Configure what happens when chatbot doesn't know:

**Options:**
1. "I don't know" response
2. "Let me escalate this"
3. "Here are related topics..."
4. Custom message

**Example custom:**
```
I don't have information about that.
Would you like to:
1. Ask a different question?
2. Contact our support team?
3. Check our FAQ?
```

## Conversation Management

### Message History

How many previous messages does chatbot remember?

**Options:**
- 0 messages (no history)
- 5 messages (short context)
- 20 messages (standard) - Default
- 50 messages (full context)

**Impact:**
- More messages = better context but slower responses
- Fewer messages = faster but less context

### Conversation Timeout

When should a conversation end?

**Options:**
- Never (keep conversation going)
- 30 minutes
- 1 hour
- 8 hours
- 24 hours

**After timeout:** New conversation starts

## Advanced Customization

### Confidence Threshold

Only respond if chatbot is confident enough:

**Slider: 0-100%**
- 50% (low): Respond to almost anything
- 70% (medium) - Default: Balanced
- 90% (high): Only respond if very sure

**Effect:**
- Lower: More responses but some wrong
- Higher: Fewer responses but more accurate

### Response Format

Control response structure:

**Options:**
- Natural text
- Bullet points
- Numbered lists
- Paragraphs with headings
- Custom format

## Branding & Logo

### Add Your Logo

Some plans allow custom branding:

1. Go to Widget Settings
2. Find **Branding** section
3. Upload your logo (PNG or SVG)
4. Position and size it
5. Save

**Best logo specs:**
- Square or rectangular
- 100x100px minimum
- Transparent background (PNG)
- Less than 1MB

### Company Info in Header

Add your company name/info to widget:

**Default:** "[Chatbot Name]"

**Custom options:**
- Your company name
- "Company Support Chat"
- "[Company] AI Assistant"

## Testing Your Customizations

### Preview Chat

After making changes:

1. Go to your chatbot
2. Click **Preview** or **Test Chat**
3. Chat test messages
4. Verify colors, messages, behavior

### Check Across Devices

Test on:
- Desktop browser
- Tablet
- Mobile phone

**Common issues:**
- Text too small on mobile
- Colors don't match on some devices
- Layout broken on older browsers

### Test Different Languages

If you enabled multiple languages:

1. Test messages in each language
2. Verify formatting
3. Check if knowledge base is available
4. Test response quality

## Troubleshooting

### Changes Not Showing

**First try:**
1. Refresh the page (Ctrl+R or Cmd+R)
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Close browser and reopen
4. Try different browser

**If still not showing:**
1. Check if you clicked "Save"
2. Wait 2-3 minutes
3. Check if changes were actually saved
4. Try changing again

### Colors Look Wrong

**On your site:**
- Other CSS might override colors
- Try bright/vibrant colors for better visibility
- Test on actual website

**In preview:**
- Preview might look different than live
- Deploy to website to see actual appearance

### Language Not Working

**Check:**
1. Is language enabled in settings?
2. Is knowledge base in that language?
3. Try asking in that language
4. Check if system prompt was set

## Customization Checklist

Before going live:

- [ ] Colors match your brand
- [ ] Welcome message is clear
- [ ] System prompt sets right tone
- [ ] Timezone is correct
- [ ] Offline message exists (if needed)
- [ ] Tested on desktop AND mobile
- [ ] Tested conversations
- [ ] Checked error messages

## Next Steps

Your chatbot is customized! What's next?

### To Monitor Performance
Go to: [Analytics & Monitoring](troubleshooting.md)

See how users interact with your chatbot.

### To Add Team Members
Go to: [Team Management](team.md)

Invite others to help manage the chatbot.

### To Add Integrations
Go to: [Integrations Guide](integrations.md)

Connect to CRM, Zapier, webhooks, etc.

## Key Takeaways

- Customize colors, position, and messages
- System prompt sets personality
- Support multiple languages
- Set operating hours and offline message
- Test on desktop and mobile
- Changes save immediately

## Questions?

- **Change not showing?** Hard refresh (Ctrl+Shift+R)
- **Need more features?** Check your plan
- **Still stuck?** Email support@metachats.ai

---

**Last Updated:** 2025-11-19
**Word Count:** 1,321 words
