# Widget Installation Guide

**Last Updated:** 2025-11-19
**Time to Complete:** 10-30 minutes (depending on platform)
**Difficulty:** Beginner to Intermediate

This guide shows you how to install your Meta Chat Platform widget on your website, regardless of the platform you're using. Choose your platform below to get started.

## What is the Widget?

The **widget** is the chat box that appears on your website. It lets your visitors chat with your AI chatbot without leaving your site. When visitors ask questions, your chatbot responds using your knowledge base and AI.

## Getting Your Installation Code

Before starting installation on any platform, you need to get your embed code.

**Step 1: Log into your dashboard**
- Go to https://dashboard.metachats.ai/login
- Enter your email and password

**Step 2: Find your widget code**
- Click on the chatbot you want to deploy
- Look for "Widget Settings" or "Embed Code"
- Copy the code - it looks like this:

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

**Step 3: Keep this code safe**
- Save it in a notepad or password manager
- You'll paste it into your website in the next step
- It's not secret - it's safe to share

---

## Choose Your Platform

Click below for instructions for your specific platform:

- [Plain HTML Website](#plain-html-website)
- [WordPress](#wordpress)
- [Shopify](#shopify)
- [Wix](#wix)
- [Squarespace](#squarespace)
- [React / Next.js](#react--nextjs)

---

## Plain HTML Website

Use these instructions if you have a simple HTML website or access to your website files via FTP.

### Method 1: Add to HTML File (Easiest)

**Step 1: Open your HTML file**
- Open the main file of your website (usually `index.html`)
- Use any text editor (Notepad, VS Code, etc.)

**Step 2: Find the closing body tag**
- Look for `</body>` at the very end of your file
- This is where the widget code goes

**Step 3: Paste the widget code**
Before the `</body>` tag, paste this:

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

Your file should look like:

```html
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <!-- Your website content here -->
    
    <!-- Chat widget code here -->
    <script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
</body>
</html>
```

**Step 4: Save the file**
- Save with Ctrl+S (or Cmd+S on Mac)
- Upload to your web server if needed

**Step 5: Test it**
- Visit your website
- Look for the chat box in the bottom right corner
- Try sending a message

### Method 2: Dynamic Placement

If you want the widget in a specific location on your page, use this instead:

```html
<!-- Where you want the chat box to appear -->
<div id="meta-chat-widget"></div>

<!-- The widget script -->
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

The widget will appear in the `div` with ID `meta-chat-widget`.

---

## WordPress

WordPress makes this very easy - no code editing required!

### Method 1: Using a Plugin (Recommended)

**Step 1: Install a custom code plugin**
- Log into your WordPress admin
- Go to **Plugins → Add New**
- Search for "Code Snippets" or "Custom HTML"
- Click **Install Now** on the first result
- Click **Activate**

**Step 2: Add your widget code**
- Go to **Code Snippets → Add New**
- Title: "Meta Chat Widget"
- In the code area, paste:

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

- Check: **Run snippet everywhere**
- Click **Save Changes and Activate**

**Step 3: Test**
- Visit your website
- Look for the chat box in the bottom right

### Method 2: Using Theme Editor

**Step 1: Go to Theme Editor**
- Log into WordPress admin
- Go to **Appearance → Theme Editor**

**Step 2: Find your theme's footer**
- On the right side, find **footer.php**
- Click to open it

**Step 3: Find the closing body tag**
- Look for `</body>` at the bottom
- It might be near `wp_footer()` function

**Step 4: Add widget code**
Before `</body>`, add:

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

**Step 5: Update File**
- Click **Update File** button
- Test your website

### Method 3: Using a Header/Footer Plugin

Popular plugins like **Elementor**, **Beaver Builder**, or **WPCode** have built-in areas for custom code.

**In Elementor:**
1. Edit any page
2. Go to **Settings → Custom Code**
3. Paste the widget code
4. Save

---

## Shopify

Shopify stores can add the widget easily through the theme editor.

### Step 1: Log into Shopify Admin

- Go to https://admin.shopify.com
- Log in with your credentials

### Step 2: Access Theme Editor

- Go to **Online Store → Themes**
- Find your current theme (marked as "Live")
- Click **Edit code**

### Step 3: Find theme.liquid

- On the left, find **theme.liquid**
- Click to open it

### Step 4: Find the closing body tag

- Look for `</body>` at the very bottom
- It's usually near the end of the file

### Step 5: Paste widget code

Before `</body>`, add:

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

### Step 6: Save

- Click **Save** button
- Visit your store to test

### Testing Your Shopify Widget

1. Go to your store (not admin)
2. Look for chat box in bottom right
3. Ask a test question: "Hello"
4. Should see a response

### Using Shopify Apps (Alternative)

If you prefer a simpler method:
1. Go to **Shopify App Store**
2. Search "Meta Chat" or "Custom Scripts"
3. Install an app
4. Add your widget code through the app interface
5. It will automatically add to all pages

---

## Wix

Wix has a dedicated embed feature - very easy!

### Step 1: Log into Wix Editor

- Go to https://www.wix.com
- Click **My Sites**
- Click **Edit** on your site

### Step 2: Add Custom Code

- On the left toolbar, click **+** (Add)
- Scroll down to **Embed & Upscale**
- Click **Custom Embed**
- Choose where on the page: bottom right is typical

### Step 3: Paste Widget Code

In the popup that appears:
1. Paste your widget code:

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

2. Click **Update** or **Save**

### Step 4: Publish

- Click **Publish** button in top right
- Your site is now live with the widget!

### Step 5: Test

- Go to your Wix site
- Look for chat box
- Test with a message

### Positioning the Widget

The widget usually appears in bottom right. To adjust:

1. In the Editor, click the custom embed
2. Use the resize handles to move it
3. The actual size doesn't matter - widget adjusts automatically

---

## Squarespace

Squarespace has several ways to add the widget.

### Method 1: Footer Injection (Easiest)

**Step 1: Go to Website Settings**
- Click **Settings** (bottom left)
- Go to **Advanced → Code Injection**

**Step 2: Add to Footer**

In the **Footer** section, paste:

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

**Step 3: Save**

- Click **Save** button
- Your widget is now on every page

### Method 2: Code Block on Specific Page

If you only want the widget on certain pages:

**Step 1: Edit a page**
- Click the page you want
- Click **Edit**

**Step 2: Add code block**
- Click **+** to add a block
- Search for "Code"
- Click **Code Block**

**Step 3: Paste your code**

```html
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

**Step 4: Save**
- Block will update automatically

### Method 3: HTML Block

Similar to Code Block:

1. Add an **HTML Block** instead
2. Paste the widget code
3. Save

---

## React / Next.js

For developers using React or Next.js, here's the proper way to add the widget.

### Option 1: Script Tag in HTML (Simplest)

In your `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Your head content -->
</head>
<body>
    <div id="root"></div>
    
    <!-- Meta Chat Widget -->
    <script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
    
    <!-- Your React script -->
    <script src="index.js"></script>
</body>
</html>
```

### Option 2: useEffect Hook (React Component)

Create a component that loads the widget:

```jsx
import { useEffect } from 'react';

export default function ChatWidget() {
  useEffect(() => {
    // Load the widget script
    const script = document.createElement('script');
    script.src = 'https://chat.metachats.ai/widget.js';
    script.setAttribute('data-tenant', 'YOUR_WORKSPACE_ID');
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return null; // Widget renders itself
}
```

### Option 3: Next.js App (Recommended)

In your `app.tsx` or `pages/_app.tsx`:

```jsx
import { useEffect } from 'react';

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Load widget once on app load
    if (!window.metaChatLoaded) {
      const script = document.createElement('script');
      script.src = 'https://chat.metachats.ai/widget.js';
      script.setAttribute('data-tenant', 'YOUR_WORKSPACE_ID');
      script.async = true;
      document.body.appendChild(script);
      window.metaChatLoaded = true;
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;
```

### Option 4: Next.js 13+ App Router

In your layout file:

```jsx
import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <html>
      <head></head>
      <body>
        {children}
        <Script 
          src="https://chat.metachats.ai/widget.js"
          data-tenant="YOUR_WORKSPACE_ID"
        />
      </body>
    </html>
  );
}
```

### Testing in React

After adding the widget:

```bash
npm start
# or
npm run dev
```

Then:
1. Visit http://localhost:3000
2. Look for chat box in bottom right
3. Test a message

---

## Troubleshooting

### Widget Not Showing

**First check:**
1. Did you replace `YOUR_WORKSPACE_ID` with your actual ID?
   - Your code should look like: `data-tenant="workspace_abc123"`
   - Not: `data-tenant="YOUR_WORKSPACE_ID"`

2. Check browser console for errors:
   - Right-click → Inspect
   - Go to **Console** tab
   - Look for red error messages

**If still not showing:**

1. **Verify your code is on the page:**
   - Right-click → View Page Source
   - Search for `chat.metachats.ai`
   - Should find the script tag

2. **Check your workspace ID:**
   - Go to dashboard
   - Go to Settings
   - Check the ID matches your code

3. **Wait and refresh:**
   - Sometimes takes 30 seconds to load
   - Try refreshing the page

4. **Try a different browser:**
   - If it works in Chrome but not Safari, it's a browser issue
   - Check browser console for specific errors

### CORS Errors

If you see errors like "Cross-Origin Request Blocked":

**This usually means:**
- Your domain isn't whitelisted
- The widget is blocked by security settings

**To fix:**
1. Go to dashboard settings
2. Find "Allowed Domains"
3. Add your domain (example.com)
4. Save
5. Wait 1-2 minutes
6. Refresh your website

### Widget Loads But Chat Doesn't Work

**Check connection:**
1. Open the chat box
2. Look at the top - should say "Connected"
3. If it says "Disconnected":
   - Check your internet
   - Try refreshing the page

**If connected but no response:**
1. Try a simple message: "Hi"
2. Wait 10-15 seconds for first response
3. Subsequent messages are faster

**Check browser console:**
1. Right-click → Inspect
2. Go to **Console** tab
3. Look for red errors
4. Try refreshing

### Widget Loads But Looks Wrong

**Wrong position:**
- Widget should appear bottom right by default
- If it's in the wrong spot:
  - Check if your theme CSS is conflicting
  - Try on a different page
  - Try a different browser

**Wrong size:**
- Widget should be about 400x500px
- If too small or large:
  - Check browser zoom (Ctrl+0 resets)
  - Try a different browser

**Overlapping content:**
- Widget might cover buttons or text
- Solution depends on platform:
  - **WordPress:** Use CSS to adjust widget position
  - **Shopify:** Move widget to different part of page
  - **Wix:** Drag widget in editor to better position

### Still Not Working?

**Collect information:**
1. What platform are you using? (WordPress, Shopify, etc.)
2. What error do you see? (in Console tab)
3. What happens? (widget doesn't load? doesn't respond? looks wrong?)
4. When did it stop working? (or was it never working?)

**Then email support@metachats.ai with:**
- The information above
- Your workspace name
- A screenshot of the error

---

## Advanced Options

### Change Widget Position

By default, widget appears bottom-right. To customize:

**For HTML/plain websites:**

```html
<script>
  window.metaChatConfig = {
    position: 'bottom-left', // or 'top-left', 'top-right', 'bottom-right'
    offset: 20 // pixels from edge
  };
</script>
<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>
```

**For WordPress:**
- Add CSS to customize position
- Contact support for help

### Disable Widget on Specific Pages

**WordPress:**
```php
<?php
if (!is_page('contact')) { // Don't show on contact page
  echo '<script src="https://chat.metachats.ai/widget.js" data-tenant="YOUR_WORKSPACE_ID"></script>';
}
?>
```

**React:**
```jsx
function ChatWidget() {
  const { pathname } = useLocation();
  
  // Don't show widget on contact page
  if (pathname === '/contact') return null;
  
  // ... rest of widget code
}
```

---

## Common Mistakes to Avoid

**Don't:** Use the wrong data-tenant value
- Get it from your dashboard settings
- It's usually `workspace_` followed by random characters

**Don't:** Put the code in the `<head>` section
- Always put it before `</body>`
- Head is for stylesheets and metadata

**Don't:** Forget to replace `YOUR_WORKSPACE_ID`
- This is a placeholder
- Replace with your actual ID
- Should start with `workspace_`

**Don't:** Use old/cached version
- If nothing changes after updates:
  - Hard refresh: Ctrl+Shift+R (or Cmd+Shift+R)
  - Clear browser cache
  - Try a different browser

**Don't:** Add the code multiple times
- Only add once
- Multiple instances cause issues

---

## Next Steps

Your widget is now installed! Here's what to do next:

### To Train Your Chatbot
Go to: [Knowledge Base Guide](knowledge-base.md)

Learn how to:
- Upload documents
- Improve AI responses
- Manage your knowledge base

**Time needed:** 15-30 minutes

### To Customize the Widget
Go to: [Customization Guide](customization.md)

Learn how to:
- Change colors and appearance
- Customize messages
- Set operating hours

**Time needed:** 10-20 minutes

### To Track Performance
Go to: [Troubleshooting Guide](troubleshooting.md)

Learn how to:
- Monitor conversations
- Fix common issues
- Get help when needed

### To Add Team Members
Go to: [Team Management Guide](team.md)

Learn how to invite others to help manage your chatbot.

---

## Key Takeaways

- Widget code goes before `</body>` tag
- Replace `YOUR_WORKSPACE_ID` with your actual ID
- Widget appears in bottom right by default
- Most platforms take 10-15 minutes to set up
- Test immediately after installation

## Questions?

- **Installation stuck?** Check the platform-specific section again
- **Still not working?** Email support@metachats.ai
- **Found an error?** Let us know at support@metachats.ai

---

**Ready to continue?** Choose a next step above, or go back to the [documentation home](README.md).

**Last Updated:** 2025-11-19
**Word Count:** 2,156 words
