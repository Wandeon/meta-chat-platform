# WordPress + Elementor Integration Guide

**Integrate Meta Chat AI into your WordPress website** | Created: 2025-10-10

---

## 📋 Overview

This guide shows you how to add the Meta Chat AI assistant to your WordPress website with Elementor.

**What you'll get:**
- 💬 AI chat widget on your website
- 🤖 Powered by Ollama (llama3:latest) on your GPU server
- 🎨 Customizable appearance and position
- 📱 Mobile-friendly chat interface
- 🔒 Secure API key authentication

---

## 🚀 Quick Start (3 Steps)

### Step 1: Create a Tenant API Key

You need an API key for your website to communicate with the AI.

**Option A: Via Dashboard (Easiest)**
1. Go to https://chat.genai.hr
2. Login with admin key
3. Click **"Tenants"** → Click **"Metrica"**
4. Look for **"API Keys"** section
5. Click **"Create API Key"**
6. Label: "My WordPress Website"
7. Copy the generated key (starts with `ten_`)

**Option B: Via API (Direct)**
```bash
curl -X POST https://chat.genai.hr/api/tenants/cmgjuow6q0000g5jwvwyopzk6/api-keys \
  -H "x-admin-key: adm_t6DPQnsQFAzsKXZaVd3uC5KBzrzs-CWZLZozyG7TqPs" \
  -H "Content-Type: application/json" \
  -d '{
    "label": "WordPress Website"
  }'
```

**Save the API key!** You'll need it in Step 2.

---

### Step 2: Add Chat Widget Code to WordPress

#### Method 1: Using Elementor HTML Widget (Recommended)

1. **Edit your page in Elementor**
2. **Drag "HTML" widget** to where you want the chat button (usually footer or sidebar)
3. **Paste this code:**

```html
<!-- Meta Chat Widget -->
<div id="meta-chat-widget"></div>

<script>
(function() {
  // Configuration
  const config = {
    apiUrl: 'https://chat.genai.hr',
    apiKey: 'YOUR_TENANT_API_KEY_HERE', // Replace with your actual key
    tenantId: 'cmgjuow6q0000g5jwvwyopzk6',

    // Customization
    position: 'bottom-right', // or 'bottom-left'
    buttonColor: '#4f46e5',
    buttonText: '💬 Chat with AI',
    welcomeMessage: 'Hello! How can I help you today?',
    placeholder: 'Type your message...',
  };

  // Chat Widget HTML
  const widgetHTML = `
    <style>
      #meta-chat-container {
        position: fixed;
        ${config.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
        bottom: 20px;
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      #meta-chat-button {
        background: ${config.buttonColor};
        color: white;
        border: none;
        border-radius: 50px;
        padding: 15px 25px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        transition: transform 0.2s;
      }

      #meta-chat-button:hover {
        transform: scale(1.05);
      }

      #meta-chat-window {
        display: none;
        position: fixed;
        ${config.position === 'bottom-right' ? 'right: 20px;' : 'left: 20px;'}
        bottom: 80px;
        width: 380px;
        max-width: calc(100vw - 40px);
        height: 600px;
        max-height: calc(100vh - 120px);
        background: white;
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.2);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      #meta-chat-window.open {
        display: flex;
      }

      #meta-chat-header {
        background: ${config.buttonColor};
        color: white;
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      #meta-chat-close {
        background: none;
        border: none;
        color: white;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      #meta-chat-messages {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        background: #f8f9fa;
      }

      .chat-message {
        margin-bottom: 15px;
        display: flex;
        flex-direction: column;
      }

      .chat-message.user {
        align-items: flex-end;
      }

      .chat-message.assistant {
        align-items: flex-start;
      }

      .message-bubble {
        max-width: 80%;
        padding: 12px 16px;
        border-radius: 12px;
        word-wrap: break-word;
      }

      .chat-message.user .message-bubble {
        background: ${config.buttonColor};
        color: white;
      }

      .chat-message.assistant .message-bubble {
        background: white;
        color: #333;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .typing-indicator {
        display: none;
        padding: 12px 16px;
        background: white;
        border-radius: 12px;
        width: fit-content;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }

      .typing-indicator.show {
        display: block;
      }

      .typing-indicator span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #999;
        margin: 0 2px;
        animation: typing 1.4s infinite;
      }

      .typing-indicator span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .typing-indicator span:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes typing {
        0%, 60%, 100% { opacity: 0.3; }
        30% { opacity: 1; }
      }

      #meta-chat-input-container {
        padding: 15px;
        border-top: 1px solid #e0e0e0;
        background: white;
      }

      #meta-chat-input {
        width: 100%;
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 14px;
        resize: none;
        font-family: inherit;
      }

      #meta-chat-send {
        margin-top: 10px;
        width: 100%;
        background: ${config.buttonColor};
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
      }

      #meta-chat-send:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    </style>

    <div id="meta-chat-container">
      <button id="meta-chat-button">${config.buttonText}</button>

      <div id="meta-chat-window">
        <div id="meta-chat-header">
          <h3 style="margin: 0; font-size: 18px;">Metrica AI Assistant</h3>
          <button id="meta-chat-close">×</button>
        </div>

        <div id="meta-chat-messages">
          <div class="chat-message assistant">
            <div class="message-bubble">${config.welcomeMessage}</div>
          </div>
          <div class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>

        <div id="meta-chat-input-container">
          <textarea
            id="meta-chat-input"
            placeholder="${config.placeholder}"
            rows="2"
          ></textarea>
          <button id="meta-chat-send">Send</button>
        </div>
      </div>
    </div>
  `;

  // Insert widget
  document.getElementById('meta-chat-widget').innerHTML = widgetHTML;

  // Widget logic
  const chatButton = document.getElementById('meta-chat-button');
  const chatWindow = document.getElementById('meta-chat-window');
  const chatClose = document.getElementById('meta-chat-close');
  const chatMessages = document.getElementById('meta-chat-messages');
  const chatInput = document.getElementById('meta-chat-input');
  const chatSend = document.getElementById('meta-chat-send');
  const typingIndicator = document.querySelector('.typing-indicator');

  let conversationId = null;

  // Toggle chat window
  chatButton.addEventListener('click', () => {
    chatWindow.classList.toggle('open');
    if (chatWindow.classList.contains('open')) {
      chatInput.focus();
    }
  });

  chatClose.addEventListener('click', () => {
    chatWindow.classList.remove('open');
  });

  // Send message
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';
    chatSend.disabled = true;
    typingIndicator.classList.add('show');

    try {
      const response = await fetch(`${config.apiUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey,
        },
        body: JSON.stringify({
          tenantId: config.tenantId,
          message: message,
          conversationId: conversationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        conversationId = data.data.conversationId;
        addMessage(data.data.message, 'assistant');
      } else {
        addMessage('Sorry, I encountered an error. Please try again.', 'assistant');
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('Sorry, I\'m having trouble connecting. Please try again later.', 'assistant');
    } finally {
      typingIndicator.classList.remove('show');
      chatSend.disabled = false;
      chatInput.focus();
    }
  }

  function addMessage(text, role) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${role}`;
    messageDiv.innerHTML = `<div class="message-bubble">${escapeHtml(text)}</div>`;

    chatMessages.insertBefore(messageDiv, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  chatSend.addEventListener('click', sendMessage);
  chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
})();
</script>
```

4. **Replace `YOUR_TENANT_API_KEY_HERE`** with your actual API key from Step 1
5. **Save** and **publish** your page

---

#### Method 2: Theme Footer (Site-Wide)

1. Go to **Appearance → Theme File Editor** (or use a child theme)
2. Edit **footer.php**
3. Add the same code above **before the closing `</body>` tag**
4. Save

---

#### Method 3: Using a Plugin

1. Install **"Insert Headers and Footers"** plugin
2. Go to **Settings → Insert Headers and Footers**
3. Paste the code in **"Scripts in Footer"**
4. Save

---

### Step 3: Test the Chat

1. **Visit your website** (not in Elementor editor)
2. **Click the chat button** (bottom-right corner)
3. **Type a message:** "Hello! What can you help me with?"
4. **Wait 10-30 seconds** for AI response from your Ollama server
5. **Continue the conversation!**

---

## 🎨 Customization Options

Edit the `config` object in the code:

### Position
```javascript
position: 'bottom-right', // or 'bottom-left'
```

### Colors
```javascript
buttonColor: '#4f46e5', // Any hex color
```

### Text
```javascript
buttonText: '💬 Chat with AI',
welcomeMessage: 'Hello! How can I help you today?',
placeholder: 'Type your message...',
```

### Button Style
Change the button appearance by editing the `#meta-chat-button` CSS:
```css
#meta-chat-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); /* Gradient */
  padding: 18px 30px; /* Bigger button */
  font-size: 18px; /* Larger text */
}
```

---

## 🔧 Advanced Configuration

### Hide on Mobile
Add this CSS:
```css
@media (max-width: 768px) {
  #meta-chat-container {
    display: none;
  }
}
```

### Show Only on Specific Pages
Wrap the code in Elementor "Display Conditions" or use this PHP:
```php
<?php if (is_page('contact')) : ?>
  <!-- Chat widget code here -->
<?php endif; ?>
```

### Custom Trigger Button
Instead of the default button, trigger chat from your own button:
```html
<button onclick="document.getElementById('meta-chat-window').classList.add('open')">
  Talk to Support
</button>
```

---

## 🐛 Troubleshooting

### Chat Button Not Appearing
- **Check:** Widget code is in the page
- **Check:** No JavaScript errors in browser console (F12)
- **Try:** Clear WordPress cache
- **Try:** Disable other chat plugins

### "Error" or No Response
- **Check:** API key is correct (starts with `ten_`)
- **Check:** Tenant ID is correct: `cmgjuow6q0000g5jwvwyopzk6`
- **Test:** API endpoint directly:
  ```bash
  curl -X POST https://chat.genai.hr/api/chat \
    -H "x-api-key: YOUR_KEY" \
    -H "Content-Type: application/json" \
    -d '{"tenantId":"cmgjuow6q0000g5jwvwyopzk6","message":"test"}'
  ```

### Slow Responses (>60 seconds)
- **Normal:** First response can be slow (15-30s)
- **Check:** gpu-01 server is online and Ollama is running
- **Try:** Use smaller model (phi3:latest) for faster responses
- **Check:** Network connection between servers

### Widget Looks Broken
- **Check:** No CSS conflicts with your theme
- **Try:** Increase z-index value (9999 → 99999)
- **Try:** Add `!important` to critical styles

---

## 📊 Monitor Usage

### Via Dashboard
1. Go to https://chat.genai.hr
2. Click **"Conversations"**
3. Filter by tenant: **Metrica**
4. See all website chats

### Via API
```bash
curl -X GET "https://chat.genai.hr/api/conversations?tenantId=cmgjuow6q0000g5jwvwyopzk6" \
  -H "x-admin-key: adm_t6DPQnsQFAzsKXZaVd3uC5KBzrzs-CWZLZozyG7TqPs"
```

---

## 🔐 Security Best Practices

### Tenant API Key Security
- ✅ **DO:** Use tenant API keys (start with `ten_`) for websites
- ❌ **DON'T:** Use admin API keys (start with `adm_`) in public code
- ✅ **DO:** Regenerate keys if exposed
- ✅ **DO:** Use different keys for dev/staging/production

### Rate Limiting
Current limits:
- **100 requests/minute** per API key
- If exceeded, requests will be throttled

### HTTPS
- ✅ Website uses HTTPS
- ✅ API uses HTTPS
- ✅ Secure communication

---

## 🎯 Next Steps

### Enhance Your Chat
1. **Customize AI personality** via Tenant Settings
2. **Add RAG** (upload documents for AI to reference)
3. **Enable function calling** for dynamic features
4. **Set up webhooks** for notifications

### Analytics
1. Track conversation metrics
2. Monitor response quality
3. Analyze common questions
4. Improve based on feedback

### Advanced Features
1. **Human handoff** - Transfer to live agent
2. **File uploads** - Let users upload images/documents
3. **Voice input** - Add speech-to-text
4. **Multilingual** - Support multiple languages

---

## 📞 Support

**Need Help?**
- Test endpoint: https://chat.genai.hr/testing
- Check docs: `/home/deploy/meta-chat-platform/docs/`
- Review logs: `pm2 logs meta-chat-api`

---

## 📝 Quick Reference

**Your Configuration:**
- **API URL:** https://chat.genai.hr
- **Tenant ID:** cmgjuow6q0000g5jwvwyopzk6
- **Tenant Name:** Metrica
- **AI Model:** llama3:latest (8B parameters)
- **AI Server:** gpu-01.taildb94e1.ts.net
- **Response Time:** 10-30 seconds typical

**Admin Access:**
- **Dashboard:** https://chat.genai.hr
- **Admin Key:** adm_t6DPQnsQFAzsKXZaVd3uC5KBzrzs-CWZLZozyG7TqPs

---

**Last Updated:** 2025-10-10
**Status:** Ready for Production ✅
