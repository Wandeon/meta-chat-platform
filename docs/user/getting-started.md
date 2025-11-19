# Getting Started with Meta Chat Platform

**Last Updated:** 2025-11-19
**Time to Complete:** 10-15 minutes
**Difficulty:** Beginner-friendly

This guide walks you through creating your account, verifying your email, logging in, and setting up your first chatbot. By the end, you'll have a working chatbot ready to be deployed on your website.

## What You'll Learn

By the end of this guide, you'll be able to:
- Create a Meta Chat Platform account
- Verify your email address
- Access your dashboard
- Understand the main dashboard sections
- Create your first AI chatbot
- Get your widget embed code

## Prerequisites

You'll need:
- A valid email address
- Access to your email inbox
- A web browser (Chrome, Firefox, Safari, or Edge)
- 10-15 minutes

## Step 1: Create Your Account

**Go to the signup page:**

Visit https://dashboard.metachats.ai/signup

**Fill in your details:**

1. **Email Address** - Use the email you have access to
   - You'll need to verify this email in the next step
   
2. **Password** - Create a strong password
   - At least 8 characters
   - Mix of letters, numbers, and symbols (recommended)
   - Don't use the same password as other accounts

3. **Workspace Name** - What is your business called?
   - This is what appears in your chatbot's messages
   - Example: "Acme Corp Support" or "Jane's Coffee Shop"

4. **Agree to Terms** - Read and check the checkbox
   - Quick summary: You agree to our Terms of Service
   - We agree not to use your data to train our AI

**Click "Create Account"**

You should see: "Check your email to verify your account"

---

## Step 2: Verify Your Email

**Check your inbox:**

1. Open your email inbox
2. Look for an email from **noreply@metachats.ai**
3. Subject: "Verify your email address"

**If you don't see it:**
- Check your spam/junk folder
- Wait 2-3 minutes and refresh
- Check you entered the correct email address

**Verify your email:**

1. Open the email from Meta Chat
2. Click the blue "Verify Email" button
   - Or copy the link and paste it in your browser
3. You should see: "Email verified successfully!"

---

## Step 3: First Login

**Go to the login page:**

Visit https://dashboard.metachats.ai/login

**Enter your credentials:**

1. **Email** - The email you used to sign up
2. **Password** - The password you created
3. Click "Login"

**First time?** 
If this is your first login, you may be asked a few setup questions:
- Choose your LLM provider (default is fine to start)
- Select your primary use case
- Accept usage terms

Just click through - you can change these later!

After login, you'll see your dashboard.

---

## Step 4: Understand Your Dashboard

Your dashboard has several main sections. Here's what you'll see:

### Top Navigation Bar
- **Logo** (left) - Click to go home anytime
- **Workspace Name** - Shows which workspace you're in
- **Settings** (gear icon) - Account, API keys, team
- **Profile** (your name) - Your account settings, logout

### Main Tabs (Left Sidebar)

**1. Dashboard** (Home icon)
- Overview of your chatbots
- Quick stats about conversations
- Recent activity

**2. Chatbots** (Chat bubble icon)
- List of all your chatbots
- Create new chatbots here
- Manage existing chatbots

**3. Knowledge Base** (Document icon)
- Upload documents to train your AI
- Manage documents
- See what documents are being used

**4. Conversations** (Messages icon)
- View all conversations with users
- Search conversations
- See what users are asking

**5. Integrations** (Puzzle piece icon)
- Connect to CRM tools
- Set up webhooks
- View integration status

**6. Analytics** (Chart icon)
- See how your chatbot is performing
- Track conversation metrics
- Monitor user satisfaction

### Your First View

When you first log in, you'll see:
- An empty chatbots list
- An "Create First Chatbot" button
- A quick tutorial (you can skip this)

---

## Step 5: Create Your First Chatbot

Now let's create your first chatbot!

**Click "Create Chatbot"** (or "Chatbots" tab → "New Chatbot")

**Fill in the basics:**

1. **Chatbot Name** - What should users see?
   - Example: "Customer Support Bot" or "Sales Assistant"
   - Users will see this name in the chat window

2. **Description** - Brief description of what it helps with
   - Example: "I can help with product questions and order status"
   - This helps remember what each chatbot does

3. **System Prompt** - How should the chatbot behave?
   - This is a template you can customize
   - Default is good for most cases
   - Example default: "You are a helpful assistant for [Company Name]. Answer questions based on provided knowledge and be friendly and professional."

4. **Language** - What language should it respond in?
   - Default: English
   - You can change this anytime

**Click "Create Chatbot"**

You'll see: "Chatbot created successfully!"

---

## Step 6: Get Your Widget Embed Code

Your widget is the chat box that appears on your website. Let's get the embed code.

**From your chatbot's page:**

1. Look for a "Widget" or "Settings" button
2. Click "Widget Settings" or "Get Embed Code"

**You'll see a code block that looks like this:**

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

**Copy this code:**

1. Click the "Copy" button next to the code
   - Or highlight and use Ctrl+C (or Cmd+C on Mac)
2. Save it somewhere safe (notepad, password manager, etc.)
3. You'll use this in the next step

**What this code does:**
- Tells your website to load the chat widget
- Connects to your chatbot
- Displays the chat box on your page

---

## Step 7: Test Your Chatbot

Before deploying to your website, let's test it!

**Find the chat widget:**

1. Still on the chatbot settings page?
2. Look for a "Preview" or "Test Chat" button
3. Click it to open the test chat window

**Ask a test question:**

1. Type: "Hello, are you working?"
2. The chatbot should respond with something like: "Hello! Yes, I'm here to help. How can I assist you today?"

**If it doesn't respond:**
- Wait a few seconds
- Check that you see "Connected" at the top
- Try refreshing the page
- See "Troubleshooting" section below

---

## Understanding Your Next Steps

Congratulations! You now have:
- A working account
- Your first chatbot
- An embed code ready to deploy

### What Comes Next?

**Option 1: Deploy to Your Website**
- Follow the [Widget Installation Guide](widget-installation.md)
- Instructions for WordPress, Shopify, plain HTML, and more
- Takes 5-10 minutes

**Option 2: Train Your Chatbot**
- Follow the [Knowledge Base Guide](knowledge-base.md)
- Upload documents (PDF, Word, text files)
- Your chatbot will answer questions based on these documents
- Takes 15-30 minutes depending on documents

**Option 3: Customize Its Look & Feel**
- Follow the [Customization Guide](customization.md)
- Change colors, position, messages
- Adjust tone and personality
- Takes 10-20 minutes

---

## Troubleshooting

### I didn't receive the verification email

**Wait a few minutes:**
- Email can take 2-3 minutes to arrive
- Check your spam/junk folder
- Check you spelled your email correctly

**Resend the email:**
1. Go to https://dashboard.metachats.ai/login
2. Click "Didn't receive verification email?"
3. Enter your email address
4. Click "Resend verification email"

### I forgot my password

1. Go to https://dashboard.metachats.ai/login
2. Click "Forgot password?"
3. Enter your email address
4. Check your email for reset link
5. Follow the link and create a new password

### The test chatbot isn't responding

**First, wait:**
- The first response can take 10-15 seconds
- Don't refresh or close the window

**Check connection:**
- Look at the top of the chat box
- Should say "Connected" in green
- If it says "Disconnected", try refreshing

**Try again with a simpler question:**
- Instead of a complex question, try: "Hello"
- Simple questions usually get faster responses

**Check your internet:**
- Open another website to confirm internet works
- Try in a different browser
- Try on a different device

### I can't see the chatbot test preview

1. Refresh the page (Ctrl+R or Cmd+R)
2. Try a different browser
3. Check if you have JavaScript enabled
   - Most websites need JavaScript to work

### The embed code looks wrong

Your embed code should have:
- `<script src=` at the start
- `https://chat.metachats.ai/widget.js`
- `data-tenant="` with your workspace ID
- `</script>` at the end

**If it's cut off:**
- Click the copy button instead of manual copying
- Or highlight the entire code block

---

## Common Mistakes to Avoid

**Don't:** Share your embed code in email
- Instead: Only share with team members who need it
- Your workspace ID is like a username - it's safe to share

**Don't:** Close the browser immediately after signing up
- Wait for verification email (2-3 minutes)
- Then verify your email

**Don't:** Use a weak password
- It's your security! Make it strong
- At least 8 characters with letters, numbers, symbols

**Don't:** Create multiple accounts with the same email
- You can only use each email once
- Use your account settings to invite other team members

---

## Next Steps

You're ready to move forward! Choose based on what you want to do next:

### To Deploy Your Chatbot
Go to: [Widget Installation Guide](widget-installation.md)

You'll learn how to install the widget on:
- Your own HTML website
- WordPress sites
- Shopify stores
- Wix sites
- Squarespace sites
- React or Next.js apps

**Time needed:** 10-15 minutes depending on your platform

### To Train Your Chatbot
Go to: [Knowledge Base Guide](knowledge-base.md)

You'll learn how to:
- Upload documents (PDF, Word, text, CSV)
- Help your chatbot answer specific questions
- Manage documents over time

**Time needed:** 15-30 minutes

### To Customize Your Chatbot
Go to: [Customization Guide](customization.md)

You'll learn how to:
- Change colors and appearance
- Customize messages
- Set operating hours
- Add multiple languages

**Time needed:** 10-20 minutes

### To Add Team Members
Go to: [Team Management Guide](team.md)

You'll learn how to:
- Invite other users
- Set their permissions
- Control what they can access

**Time needed:** 5-10 minutes

---

## Key Takeaways

- Your account is secure with a strong password
- Your workspace contains all your chatbots
- The embed code deploys your chatbot to your website
- Always test before going live
- Documents help your chatbot answer better

## Questions?

- **Stuck on a step?** Re-read the section - each step is standalone
- **Need more details?** Check the guide for your next step
- **Found an error in this guide?** Email support@metachats.ai

---

**Ready to continue?** Click one of the "Next Steps" links above, or go back to the [documentation home](README.md).

**Last Updated:** 2025-11-19
**Word Count:** 2,847 words
