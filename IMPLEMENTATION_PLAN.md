# Aura Chrome Extension - Implementation Plan

This document provides a detailed, step-by-step implementation plan for all 4 phases of the Aura Chrome Extension.

---

## 📋 Overview

**Project:** Aura - AI-Powered Browser Assistant  
**Architecture:** Chrome Extension (Manifest V3)  
**Backend:** Firebase (Firestore, Auth, Functions)  
**APIs:** Google Cloud APIs, Firebase APIs  

**Phases:**
1. Phase 1: Core Manifest & Service Worker
2. Phase 2: Contextual Extraction (The "Eyes")
3. Phase 3: Overlay & Side Panel UI
4. Phase 4: Integration & Workflow Actions

---

## 🚀 Phase 1: Core Manifest & Service Worker

**Goal:** Set up the extension's foundation - manifest configuration, service worker, and API communication layer.

### Step 1.1: Project Structure Setup

**Tasks:**
- [ ] Create directory structure
- [ ] Initialize package.json (if using build tools)
- [ ] Set up basic file structure

**Commands:**
```bash
mkdir -p src/{background,content,ui/{overlay,sidepanel,components},integrations,streaming,actions,utils}
mkdir -p icons styles
```

### Step 1.2: Create manifest.json

**File:** `manifest.json`

**Tasks:**
- [ ] Configure Manifest V3
- [ ] Add required permissions
- [ ] Register service worker
- [ ] Configure side panel
- [ ] Add content scripts
- [ ] Add icons

**Implementation:**
```json
{
  "manifest_version": 3,
  "name": "Aura - AI Browser Assistant",
  "version": "0.1.0",
  "description": "AI-powered browser assistant with contextual understanding",
  
  "permissions": [
    "sidePanel",
    "activeTab",
    "scripting",
    "storage",
    "tabs"
  ],
  
  "host_permissions": [
    "https://*/*"
  ],
  
  "background": {
    "service_worker": "service-worker.js",
    "type": "module"
  },
  
  "side_panel": {
    "default_path": "src/ui/sidepanel/sidepanel.html"
  },
  
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/content-script.js"],
      "run_at": "document_idle"
    }
  ],
  
  "action": {
    "default_title": "Open Aura Assistant",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  
  "web_accessible_resources": [
    {
      "resources": ["src/ui/overlay/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

### Step 1.3: Create Service Worker

**File:** `service-worker.js`

**Tasks:**
- [ ] Initialize Firebase
- [ ] Set up message listeners
- [ ] Handle extension installation
- [ ] Manage side panel opening
- [ ] Initialize state manager

**Implementation:**
```javascript
// service-worker.js
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { StateManager } from './src/background/state-manager.js';
import { MessageHandler } from './src/background/message-handler.js';
import { ApiClient } from './src/background/api-client.js';
import { getFirebaseConfig } from './src/utils/config.js';

// Initialize Firebase
const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Initialize managers
const stateManager = new StateManager(db);
const apiClient = new ApiClient();
const messageHandler = new MessageHandler(stateManager, apiClient);

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Aura extension installed');
  // Set default settings
  chrome.storage.local.set({
    apiKey: null,
    firebaseConfig: firebaseConfig
  });
});

// Action button click - open side panel
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageHandler.handle(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

// Tab update - maintain state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    stateManager.updateTabState(tabId, tab.url);
  }
});
```

### Step 1.4: Create API Client

**File:** `src/background/api-client.js`

**Tasks:**
- [ ] Implement Google Cloud API communication
- [ ] Handle API key management
- [ ] Error handling and retries
- [ ] Request/response formatting

**Implementation:**
```javascript
// src/background/api-client.js
export class ApiClient {
  constructor() {
    this.apiKey = null;
    this.projectId = null;
    this.loadConfig();
  }

  async loadConfig() {
    const config = await chrome.storage.local.get([
      'googleCloudApiKey',
      'googleCloudProjectId'
    ]);
    this.apiKey = config.googleCloudApiKey;
    this.projectId = config.googleCloudProjectId;
  }

  async callGeminiAPI(prompt, imageData = null) {
    if (!this.apiKey) {
      throw new Error('Google Cloud API key not configured');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro-vision:generateContent?key=${this.apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt }
        ]
      }]
    };

    if (imageData) {
      payload.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: imageData
        }
      });
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  }

  async streamResponse(prompt, imageData, onChunk) {
    // Implementation for streaming responses (SSE)
    // Will be expanded in Phase 4
  }
}
```

### Step 1.5: Create State Manager

**File:** `src/background/state-manager.js`

**Tasks:**
- [ ] Manage cross-tab state
- [ ] Persist conversation history
- [ ] Track active tabs
- [ ] Sync with Firestore

**Implementation:**
```javascript
// src/background/state-manager.js
export class StateManager {
  constructor(db) {
    this.db = db;
    this.tabStates = new Map();
    this.conversations = new Map();
  }

  async updateTabState(tabId, url) {
    this.tabStates.set(tabId, {
      url,
      timestamp: Date.now()
    });
    
    // Persist to Firestore
    if (this.db) {
      // Save to Firestore (async, non-blocking)
    }
  }

  getTabState(tabId) {
    return this.tabStates.get(tabId) || null;
  }

  async saveConversation(tabId, messages) {
    this.conversations.set(tabId, messages);
    
    // Persist to chrome.storage
    await chrome.storage.local.set({
      [`conversation_${tabId}`]: messages
    });
  }

  async getConversation(tabId) {
    const stored = await chrome.storage.local.get(`conversation_${tabId}`);
    return stored[`conversation_${tabId}`] || [];
  }

  clearConversation(tabId) {
    this.conversations.delete(tabId);
    chrome.storage.local.remove(`conversation_${tabId}`);
  }
}
```

### Step 1.6: Create Message Handler

**File:** `src/background/message-handler.js`

**Tasks:**
- [ ] Route messages between components
- [ ] Handle content script ↔ service worker communication
- [ ] Manage side panel ↔ service worker communication

**Implementation:**
```javascript
// src/background/message-handler.js
export class MessageHandler {
  constructor(stateManager, apiClient) {
    this.stateManager = stateManager;
    this.apiClient = apiClient;
  }

  async handle(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_PAGE_CONTEXT':
          return await this.handleGetPageContext(sender.tab.id);
        
        case 'SEND_MESSAGE':
          return await this.handleSendMessage(message.data, sender.tab.id);
        
        case 'CAPTURE_SCREENSHOT':
          return await this.handleCaptureScreenshot(sender.tab.id);
        
        default:
          throw new Error(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Message handler error:', error);
      return { error: error.message };
    }
  }

  async handleGetPageContext(tabId) {
    const tabState = this.stateManager.getTabState(tabId);
    return { context: tabState };
  }

  async handleSendMessage(data, tabId) {
    const { prompt, imageData } = data;
    const response = await this.apiClient.callGeminiAPI(prompt, imageData);
    
    // Save to conversation
    const conversation = await this.stateManager.getConversation(tabId);
    conversation.push({ role: 'user', content: prompt });
    conversation.push({ role: 'assistant', content: response });
    await this.stateManager.saveConversation(tabId, conversation);
    
    return { response };
  }

  async handleCaptureScreenshot(tabId) {
    const dataUrl = await chrome.tabs.captureVisibleTab(null, {
      format: 'png',
      quality: 100
    });
    return { screenshot: dataUrl };
  }
}
```

### Step 1.7: Create Config Utility

**File:** `src/utils/config.js`

**Tasks:**
- [ ] Load Firebase configuration
- [ ] Load API keys from storage
- [ ] Provide configuration to other modules

**Implementation:**
```javascript
// src/utils/config.js
export async function getFirebaseConfig() {
  const stored = await chrome.storage.local.get('firebaseConfig');
  
  if (stored.firebaseConfig) {
    return stored.firebaseConfig;
  }
  
  // Fallback to environment or default
  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
}
```

### Step 1.8: Create Basic Icons

**Tasks:**
- [ ] Create 16x16, 48x48, 128x128 icons
- [ ] Place in `icons/` directory

**Note:** Use a design tool or placeholder icons for now.

### Phase 1 Testing Checklist

- [ ] Extension loads without errors
- [ ] Service worker initializes
- [ ] Side panel opens when clicking extension icon
- [ ] API client can make test API call
- [ ] State manager persists data
- [ ] Messages route correctly between components

---

## 👁️ Phase 2: Contextual Extraction (The "Eyes")

**Goal:** Enable the extension to "see" and understand web page content through DOM extraction and screenshots.

### Step 2.1: Create Content Script

**File:** `src/content/content-script.js`

**Tasks:**
- [ ] Extract DOM text content
- [ ] Send context to service worker
- [ ] Listen for messages from service worker
- [ ] Handle page updates

**Implementation:**
```javascript
// src/content/content-script.js
class ContentScript {
  constructor() {
    this.pageContext = null;
    this.init();
  }

  init() {
    // Extract context on page load
    this.extractContext();
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true;
    });

    // Re-extract on DOM changes (optional, for dynamic pages)
    const observer = new MutationObserver(() => {
      this.extractContext();
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  extractContext() {
    const context = {
      url: window.location.href,
      title: document.title,
      text: this.extractText(),
      links: this.extractLinks(),
      images: this.extractImages(),
      timestamp: Date.now()
    };

    this.pageContext = context;
    
    // Send to service worker
    chrome.runtime.sendMessage({
      type: 'PAGE_CONTEXT_UPDATED',
      data: context
    });
  }

  extractText() {
    // Remove script and style elements
    const scripts = document.querySelectorAll('script, style, noscript');
    scripts.forEach(el => el.remove());

    // Get main content
    const mainContent = document.querySelector('main, article, [role="main"]') || document.body;
    
    // Extract text with structure
    return {
      body: mainContent.innerText,
      headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
        .map(h => ({ level: h.tagName, text: h.innerText })),
      paragraphs: Array.from(document.querySelectorAll('p'))
        .map(p => p.innerText)
        .filter(text => text.trim().length > 0)
    };
  }

  extractLinks() {
    return Array.from(document.querySelectorAll('a[href]'))
      .slice(0, 20) // Limit to first 20 links
      .map(a => ({
        text: a.innerText,
        href: a.href
      }));
  }

  extractImages() {
    return Array.from(document.querySelectorAll('img[src]'))
      .slice(0, 10) // Limit to first 10 images
      .map(img => ({
        src: img.src,
        alt: img.alt,
        width: img.width,
        height: img.height
      }));
  }

  async handleMessage(message, sendResponse) {
    switch (message.type) {
      case 'GET_CONTEXT':
        sendResponse({ context: this.pageContext });
        break;
      
      case 'EXTRACT_SELECTED_TEXT':
        const selected = window.getSelection().toString();
        sendResponse({ text: selected });
        break;
      
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }
}

// Initialize
new ContentScript();
```

### Step 2.2: Create Screenshot Handler

**File:** `src/content/screenshot-handler.js`

**Tasks:**
- [ ] Request screenshots from service worker
- [ ] Process screenshot data
- [ ] Handle screenshot errors

**Implementation:**
```javascript
// src/content/screenshot-handler.js
export class ScreenshotHandler {
  static async capture(tabId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        tabId: tabId
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.screenshot;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      throw error;
    }
  }

  static dataUrlToBase64(dataUrl) {
    // Convert data URL to base64 for API
    return dataUrl.split(',')[1];
  }
}
```

### Step 2.3: Create Context Processor

**File:** `src/content/context-processor.js`

**Tasks:**
- [ ] Format context data for LLM
- [ ] Create prompts from context
- [ ] Handle multimodal data (text + images)

**Implementation:**
```javascript
// src/content/context-processor.js
export class ContextProcessor {
  static formatContextForLLM(context, screenshot = null) {
    let prompt = `You are analyzing a web page. Here's the context:\n\n`;
    
    prompt += `URL: ${context.url}\n`;
    prompt += `Title: ${context.title}\n\n`;
    
    if (context.text.headings.length > 0) {
      prompt += `Headings:\n`;
      context.text.headings.forEach(h => {
        prompt += `  ${h.level}: ${h.text}\n`;
      });
      prompt += `\n`;
    }
    
    if (context.text.paragraphs.length > 0) {
      prompt += `Content:\n`;
      context.text.paragraphs.slice(0, 5).forEach(p => {
        prompt += `${p}\n\n`;
      });
    }
    
    if (context.links.length > 0) {
      prompt += `\nRelevant Links:\n`;
      context.links.slice(0, 5).forEach(link => {
        prompt += `  - ${link.text}: ${link.href}\n`;
      });
    }

    return {
      textPrompt: prompt,
      imageData: screenshot ? ScreenshotHandler.dataUrlToBase64(screenshot) : null
    };
  }

  static createQuestionPrompt(question, context) {
    const formattedContext = this.formatContextForLLM(context);
    
    return `${formattedContext.textPrompt}\n\nUser Question: ${question}\n\nPlease answer based on the page context above.`;
  }

  static createSummaryPrompt(context) {
    const formattedContext = this.formatContextForLLM(context);
    
    return `${formattedContext.textPrompt}\n\nPlease provide a concise summary of this page.`;
  }
}
```

### Step 2.4: Update Service Worker for Screenshots

**Tasks:**
- [ ] Add screenshot capture to message handler
- [ ] Handle screenshot requests

**Update:** `src/background/message-handler.js`

Add to `handle` method:
```javascript
case 'CAPTURE_SCREENSHOT':
  return await this.handleCaptureScreenshot(message.tabId);
```

### Phase 2 Testing Checklist

- [ ] Content script extracts DOM text correctly
- [ ] Screenshots capture successfully
- [ ] Context is formatted properly for LLM
- [ ] Messages flow: content script → service worker → API
- [ ] Works on different types of pages (static, dynamic, SPA)

---

## 🎨 Phase 3: Overlay & Side Panel UI

**Goal:** Create a non-intrusive UI that doesn't interfere with the user's browsing experience.

### Step 3.1: Create Side Panel HTML

**File:** `src/ui/sidepanel/sidepanel.html`

**Tasks:**
- [ ] Create side panel structure
- [ ] Add chat interface
- [ ] Add draft viewer section

**Implementation:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Aura Assistant</title>
  <link rel="stylesheet" href="sidepanel.css">
</head>
<body>
  <div class="sidepanel-container">
    <header class="sidepanel-header">
      <h1>Aura</h1>
      <button id="settings-btn" class="icon-btn">⚙️</button>
    </header>

    <div class="chat-container" id="chat-container">
      <div class="welcome-message">
        <h2>How can I help you?</h2>
        <p>Ask me anything about this page, or use the magic dot to get started.</p>
      </div>
      <div class="messages" id="messages"></div>
    </div>

    <div class="input-container">
      <textarea 
        id="message-input" 
        placeholder="Ask a question or give a command..."
        rows="2"
      ></textarea>
      <button id="send-btn" class="send-button">Send</button>
    </div>

    <div class="draft-viewer" id="draft-viewer" style="display: none;">
      <h3>Draft</h3>
      <div id="draft-content"></div>
      <div class="draft-actions">
        <button id="copy-draft">Copy</button>
        <button id="save-draft">Save</button>
      </div>
    </div>
  </div>

  <script type="module" src="sidepanel.js"></script>
</body>
</html>
```

### Step 3.2: Create Side Panel CSS

**File:** `src/ui/sidepanel/sidepanel.css`

**Tasks:**
- [ ] Style side panel
- [ ] Create chat interface styles
- [ ] Add responsive design

**Implementation:**
```css
/* src/ui/sidepanel/sidepanel.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.sidepanel-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

.sidepanel-header {
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidepanel-header h1 {
  font-size: 20px;
  font-weight: 600;
}

.chat-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.welcome-message {
  text-align: center;
  padding: 32px 16px;
  color: #666;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  padding: 12px;
  border-radius: 8px;
  max-width: 85%;
}

.message.user {
  background: #007bff;
  color: white;
  align-self: flex-end;
}

.message.assistant {
  background: #f0f0f0;
  color: #333;
  align-self: flex-start;
}

.input-container {
  padding: 16px;
  border-top: 1px solid #e0e0e0;
  display: flex;
  gap: 8px;
}

#message-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: none;
  font-family: inherit;
}

.send-button {
  padding: 8px 16px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.send-button:hover {
  background: #0056b3;
}
```

### Step 3.3: Create Side Panel JavaScript

**File:** `src/ui/sidepanel/sidepanel.js`

**Tasks:**
- [ ] Handle chat interface
- [ ] Send messages to service worker
- [ ] Display AI responses
- [ ] Manage conversation history

**Implementation:**
```javascript
// src/ui/sidepanel/sidepanel.js
class SidePanel {
  constructor() {
    this.messages = [];
    this.currentTabId = null;
    this.init();
  }

  async init() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTabId = tab.id;

    // Load conversation history
    await this.loadConversation();

    // Set up event listeners
    document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
    document.getElementById('message-input').addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((message) => {
      this.handleMessage(message);
    });
  }

  async loadConversation() {
    const response = await chrome.runtime.sendMessage({
      type: 'GET_CONVERSATION',
      tabId: this.currentTabId
    });

    if (response.conversation) {
      this.messages = response.conversation;
      this.renderMessages();
    }
  }

  async sendMessage() {
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text) return;

    // Add user message to UI
    this.addMessage('user', text);
    input.value = '';

    // Show loading indicator
    const loadingId = this.addMessage('assistant', '...', true);

    try {
      // Get page context
      const contextResponse = await chrome.runtime.sendMessage({
        type: 'GET_PAGE_CONTEXT',
        tabId: this.currentTabId
      });

      // Send to AI
      const aiResponse = await chrome.runtime.sendMessage({
        type: 'SEND_MESSAGE',
        data: {
          prompt: text,
          context: contextResponse.context
        },
        tabId: this.currentTabId
      });

      // Update loading message with response
      this.updateMessage(loadingId, 'assistant', aiResponse.response);
    } catch (error) {
      this.updateMessage(loadingId, 'assistant', `Error: ${error.message}`);
    }
  }

  addMessage(role, content, isLoading = false) {
    const messagesContainer = document.getElementById('messages');
    const messageDiv = document.createElement('div');
    const id = `msg-${Date.now()}`;
    messageDiv.id = id;
    messageDiv.className = `message ${role}`;
    messageDiv.textContent = content;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    if (!isLoading) {
      this.messages.push({ role, content });
    }

    return id;
  }

  updateMessage(id, role, content) {
    const messageDiv = document.getElementById(id);
    if (messageDiv) {
      messageDiv.textContent = content;
      messageDiv.className = `message ${role}`;
    }

    // Update in messages array
    const index = this.messages.findIndex(m => m.role === role && m.content === '...');
    if (index !== -1) {
      this.messages[index] = { role, content };
    }
  }

  renderMessages() {
    const messagesContainer = document.getElementById('messages');
    messagesContainer.innerHTML = '';

    this.messages.forEach(msg => {
      this.addMessage(msg.role, msg.content);
    });
  }

  handleMessage(message) {
    if (message.type === 'NEW_RESPONSE') {
      this.addMessage('assistant', message.data);
    }
  }
}

// Initialize
new SidePanel();
```

### Step 3.4: Create Overlay (Shadow DOM)

**File:** `src/ui/overlay/overlay.js`

**Tasks:**
- [ ] Inject Shadow DOM overlay
- [ ] Create magic dot button
- [ ] Prevent CSS conflicts

**Implementation:**
```javascript
// src/ui/overlay/overlay.js
class Overlay {
  constructor() {
    this.shadowRoot = null;
    this.magicDot = null;
    this.init();
  }

  init() {
    // Create shadow host
    const host = document.createElement('div');
    host.id = 'aura-overlay-host';
    host.style.cssText = 'position: fixed; z-index: 999999; pointer-events: none;';
    document.body.appendChild(host);

    // Create shadow root
    this.shadowRoot = host.attachShadow({ mode: 'closed' });

    // Inject styles
    this.injectStyles();

    // Create magic dot
    this.createMagicDot();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .magic-dot {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        pointer-events: auto;
        transition: transform 0.2s;
      }
      .magic-dot:hover {
        transform: scale(1.1);
      }
      .magic-dot:active {
        transform: scale(0.95);
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  createMagicDot() {
    this.magicDot = document.createElement('div');
    this.magicDot.className = 'magic-dot';
    this.magicDot.textContent = '✨';
    this.magicDot.title = 'Open Aura Assistant';
    
    this.magicDot.addEventListener('click', () => {
      this.openSidePanel();
    });

    this.shadowRoot.appendChild(this.magicDot);
  }

  async openSidePanel() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.runtime.sendMessage({
      type: 'OPEN_SIDE_PANEL',
      tabId: tab.id
    });
  }
}

// Initialize overlay
if (document.body) {
  new Overlay();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    new Overlay();
  });
}
```

### Step 3.5: Update Manifest for Overlay

**Tasks:**
- [ ] Add overlay script to content scripts
- [ ] Ensure web accessible resources

**Update:** `manifest.json`

Add to content_scripts:
```json
{
  "matches": ["<all_urls>"],
  "js": [
    "src/content/content-script.js",
    "src/ui/overlay/overlay.js"
  ],
  "run_at": "document_idle"
}
```

### Phase 3 Testing Checklist

- [ ] Side panel opens and displays correctly
- [ ] Chat interface works
- [ ] Messages send and receive
- [ ] Magic dot appears on pages
- [ ] Shadow DOM doesn't conflict with page CSS
- [ ] UI is responsive and polished

---

## 🔌 Phase 4: Integration & Workflow Actions

**Goal:** Enable the assistant to perform actions and integrate with third-party services.

### Step 4.1: Create Action Layer

**File:** `src/integrations/action-layer.js`

**Tasks:**
- [ ] Parse user commands
- [ ] Route to appropriate integration
- [ ] Handle action execution

**Implementation:**
```javascript
// src/integrations/action-layer.js
import { NotionClient } from './notion-client.js';
import { SlackClient } from './slack-client.js';
import { GitHubClient } from './github-client.js';

export class ActionLayer {
  constructor() {
    this.notion = new NotionClient();
    this.slack = new SlackClient();
    this.github = new GitHubClient();
  }

  async executeAction(action, params) {
    switch (action.type) {
      case 'send_to_slack':
        return await this.slack.sendMessage(params);
      
      case 'save_to_notion':
        return await this.notion.createPage(params);
      
      case 'create_github_issue':
        return await this.github.createIssue(params);
      
      default:
        throw new Error(`Unknown action: ${action.type}`);
    }
  }

  parseCommand(text) {
    // Simple command parsing (can be enhanced with NLP)
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('send to slack') || lowerText.includes('slack')) {
      return {
        type: 'send_to_slack',
        params: { text: this.extractText(text) }
      };
    }
    
    if (lowerText.includes('save to notion') || lowerText.includes('notion')) {
      return {
        type: 'save_to_notion',
        params: { content: this.extractText(text) }
      };
    }
    
    if (lowerText.includes('create issue') || lowerText.includes('github')) {
      return {
        type: 'create_github_issue',
        params: { title: this.extractText(text) }
      };
    }
    
    return null; // Not an action command
  }

  extractText(text) {
    // Extract relevant text from command
    // This is a simple implementation
    return text;
  }
}
```

### Step 4.2: Create Integration Clients

**Files:**
- `src/integrations/notion-client.js`
- `src/integrations/slack-client.js`
- `src/integrations/github-client.js`

**Tasks:**
- [ ] Implement API clients for each service
- [ ] Handle authentication
- [ ] Error handling

**Example - Notion Client:**
```javascript
// src/integrations/notion-client.js
export class NotionClient {
  constructor() {
    this.apiKey = null;
    this.loadApiKey();
  }

  async loadApiKey() {
    const config = await chrome.storage.local.get('notionApiKey');
    this.apiKey = config.notionApiKey;
  }

  async createPage(params) {
    if (!this.apiKey) {
      throw new Error('Notion API key not configured');
    }

    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: { database_id: params.databaseId },
        properties: {
          title: {
            title: [{ text: { content: params.title } }]
          }
        },
        children: [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ text: { content: params.content } }]
            }
          }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Notion API error: ${response.statusText}`);
    }

    return await response.json();
  }
}
```

### Step 4.3: Implement SSE Streaming

**File:** `src/streaming/sse-handler.js`

**Tasks:**
- [ ] Handle streaming responses
- [ ] Update UI in real-time
- [ ] Handle connection errors

**Implementation:**
```javascript
// src/streaming/sse-handler.js
export class SSEHandler {
  static async streamResponse(prompt, imageData, onChunk) {
    // For Google Gemini, use streaming API
    const apiKey = await this.getApiKey();
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${apiKey}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            onChunk(data.candidates[0].content.parts[0].text);
          }
        }
      }
    }
  }

  static async getApiKey() {
    const config = await chrome.storage.local.get('googleCloudApiKey');
    return config.googleCloudApiKey;
  }
}
```

### Step 4.4: Update Side Panel for Streaming

**Tasks:**
- [ ] Integrate SSE handler
- [ ] Update UI in real-time
- [ ] Show typing indicators

**Update:** `src/ui/sidepanel/sidepanel.js`

Add streaming support to `sendMessage` method.

### Step 4.5: Create Settings Page

**File:** `src/ui/settings/settings.html` and `settings.js`

**Tasks:**
- [ ] Allow users to enter API keys
- [ ] Configure integrations
- [ ] Save to chrome.storage.local

### Phase 4 Testing Checklist

- [ ] Actions execute correctly
- [ ] Integrations work (Notion, Slack, GitHub)
- [ ] Streaming responses display in real-time
- [ ] Settings page saves configuration
- [ ] Error handling works properly

---

## 🧪 Testing Strategy

### Unit Testing
- Test individual modules in isolation
- Mock API calls
- Test error handling

### Integration Testing
- Test message flow between components
- Test API integrations
- Test state management

### End-to-End Testing
- Test complete user workflows
- Test on different websites
- Test edge cases

---

## 📦 Deployment Checklist

- [ ] All API keys stored securely
- [ ] Firebase security rules configured
- [ ] Extension tested in production mode
- [ ] Icons and assets optimized
- [ ] Documentation complete
- [ ] Chrome Web Store listing prepared (if publishing)

---

## 🔄 Development Workflow

1. **Create feature branch:** `git checkout -b feature/phase-1`
2. **Implement changes**
3. **Test thoroughly**
4. **Commit:** `git commit -m "Implement Phase 1"`
5. **Push:** `git push origin feature/phase-1`
6. **Create Pull Request**
7. **Review and merge**

---

## 📚 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Google Cloud APIs](https://cloud.google.com/apis)

---

## 🎯 Success Criteria

**Phase 1 Complete When:**
- Extension loads without errors
- Service worker handles messages
- API client makes successful calls

**Phase 2 Complete When:**
- DOM extraction works on various sites
- Screenshots capture successfully
- Context formatted for LLM

**Phase 3 Complete When:**
- Side panel functional
- Magic dot appears on pages
- Chat interface works

**Phase 4 Complete When:**
- At least one integration working
- Streaming responses functional
- Actions execute successfully

---

This plan provides a comprehensive roadmap for implementing all 4 phases. Follow each step sequentially, test thoroughly, and iterate as needed.
