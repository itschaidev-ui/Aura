// src/ui/overlay/floating-ui.js
class FloatingUI {
  constructor() {
    this.commandBar = null;
    this.mainWindow = null;
    this.isWindowOpen = false;
    this.shadowRoot = null;
    this.currentContext = null;
    this.faviconButton = null;
    this.init();
  }

  init() {
    if (document.body) {
      this.createFloatingUI();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.createFloatingUI();
      });
    }

    // Listen for keyboard shortcut (Cmd/Ctrl + K)
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.toggleCommandBar();
      }
    });
  }

  createFloatingUI() {
    // Create shadow host
    const host = document.createElement('div');
    host.id = 'aura-floating-ui-host';
    host.style.cssText = `
      position: fixed;
      z-index: 2147483647;
      pointer-events: none;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    `;
    document.body.appendChild(host);

    // Create shadow root
    this.shadowRoot = host.attachShadow({ mode: 'closed' });
    this.injectStyles();
    this.createFaviconButton();
    this.createCommandBar();
    this.createMainWindow();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .command-bar {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 600px;
        max-width: 90vw;
        height: 56px;
        background: #1a1a1a;
        border-radius: 28px;
        display: flex;
        align-items: center;
        padding: 0 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(255, 255, 255, 0.1);
        pointer-events: auto;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(20px);
      }

      .command-bar.visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .command-bar-logo {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .command-bar-logo svg {
        width: 20px;
        height: 20px;
        fill: white;
      }

      .command-bar-input {
        flex: 1;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 15px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
        outline: none;
        padding: 0;
        height: 100%;
      }

      .command-bar-input::placeholder {
        color: #9ca3af;
      }

      .command-bar-actions {
        display: flex;
        gap: 8px;
        margin-left: 12px;
      }

      .command-bar-btn {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.1);
        border: none;
        color: #ffffff;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .command-bar-btn:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .main-window {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 720px;
        max-width: 90vw;
        max-height: 85vh;
        background: #1a1a1a;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(20px);
        overflow: hidden;
      }

      .main-window.visible {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }

      .window-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .window-title {
        display: flex;
        align-items: center;
        gap: 12px;
        color: #ffffff;
        font-size: 16px;
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      }

      .window-title-logo {
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .window-title-logo svg {
        width: 20px;
        height: 20px;
        fill: #6366f1;
      }

      .window-actions {
        display: flex;
        gap: 8px;
      }

      .window-btn {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        background: transparent;
        border: none;
        color: #9ca3af;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }

      .window-btn:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      .window-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        color: #ffffff;
      }

      .window-content::-webkit-scrollbar {
        width: 6px;
      }

      .window-content::-webkit-scrollbar-track {
        background: transparent;
      }

      .window-content::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.2);
        border-radius: 3px;
      }

      .recent-activity {
        margin-bottom: 24px;
      }

      .section-title {
        font-size: 14px;
        font-weight: 600;
        color: #ffffff;
        margin-bottom: 12px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      }

      .activity-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border-radius: 8px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: rgba(255, 255, 255, 0.03);
      }

      .activity-item:hover {
        background: rgba(255, 255, 255, 0.08);
      }

      .activity-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .activity-text {
        flex: 1;
        font-size: 14px;
        color: #e5e7eb;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      }

      .chat-messages {
        display: flex;
        flex-direction: column;
        gap: 16px;
        margin-bottom: 20px;
      }

      .message {
        padding: 12px 16px;
        border-radius: 12px;
        max-width: 85%;
        word-wrap: break-word;
        line-height: 1.6;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      }

      .message.user {
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        color: white;
        align-self: flex-end;
      }

      .message.assistant {
        background: rgba(255, 255, 255, 0.1);
        color: #e5e7eb;
        align-self: flex-start;
      }

      .input-area {
        padding: 16px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }

      .input-wrapper {
        display: flex;
        gap: 8px;
        align-items: flex-end;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px 16px;
      }

      .input-wrapper:focus-within {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
      }

      .input-field {
        flex: 1;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 14px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
        outline: none;
        resize: none;
        max-height: 120px;
        overflow-y: auto;
      }

      .input-field::placeholder {
        color: #6b7280;
      }

      .send-btn {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        background: #6366f1;
        border: none;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }

      .send-btn:hover:not(:disabled) {
        background: #4f46e5;
      }

      .send-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .overlay-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        backdrop-filter: blur(4px);
        pointer-events: auto;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .overlay-backdrop.visible {
        opacity: 1;
      }

      .favicon-button {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: #1a1a1a;
        border: 2px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3), 0 0 0 0 rgba(99, 102, 241, 0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        pointer-events: auto;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 2147483646;
        backdrop-filter: blur(10px);
      }

      .favicon-button:hover {
        transform: translateX(-50%) scale(1.1);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4), 0 0 0 4px rgba(99, 102, 241, 0.2);
      }

      .favicon-button:active {
        transform: translateX(-50%) scale(0.95);
      }

      .favicon-button img {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        object-fit: cover;
      }

      .favicon-button .default-icon {
        width: 28px;
        height: 28px;
        fill: #6366f1;
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  createFaviconButton() {
    this.faviconButton = document.createElement('div');
    this.faviconButton.className = 'favicon-button';
    this.faviconButton.title = 'Open Aura Assistant';
    this.faviconButton.setAttribute('aria-label', 'Open Aura Assistant');
    
    // Update favicon
    this.updateFavicon();
    
    // Add click handler
    this.faviconButton.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCommandBar();
    });

    // Add hover effect
    this.faviconButton.addEventListener('mouseenter', () => {
      this.faviconButton.style.transform = 'translateX(-50%) scale(1.1)';
    });

    this.faviconButton.addEventListener('mouseleave', () => {
      this.faviconButton.style.transform = 'translateX(-50%) scale(1)';
    });

    this.shadowRoot.appendChild(this.faviconButton);
    
    // Update favicon when page changes
    this.observePageChanges();
  }

  updateFavicon() {
    if (!this.faviconButton) return;
    
    // Try to get favicon from current page
    const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    let faviconUrl = null;
    
    if (favicon) {
      faviconUrl = favicon.href;
      // Handle relative URLs
      if (faviconUrl.startsWith('/')) {
        faviconUrl = window.location.origin + faviconUrl;
      }
    } else {
      // Fallback to default favicon location
      faviconUrl = `${window.location.origin}/favicon.ico`;
    }
    
    // Create or update favicon image
    let faviconImg = this.faviconButton.querySelector('img');
    
    if (!faviconImg) {
      faviconImg = document.createElement('img');
      this.faviconButton.innerHTML = '';
      this.faviconButton.appendChild(faviconImg);
    }
    
    faviconImg.src = faviconUrl;
    faviconImg.alt = document.title || 'Page icon';
    
    // Fallback to default icon if image fails to load
    faviconImg.onerror = () => {
      this.faviconButton.innerHTML = `
        <svg class="default-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      `;
    };
  }

  observePageChanges() {
    // Update favicon when URL changes (for SPAs)
    let lastUrl = window.location.href;
    
    const checkUrl = () => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        setTimeout(() => this.updateFavicon(), 500);
      }
    };
    
    // Check periodically for SPA navigation
    setInterval(checkUrl, 1000);
    
    // Also listen for popstate (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.updateFavicon(), 500);
    });
  }

  createCommandBar() {
    this.commandBar = document.createElement('div');
    this.commandBar.className = 'command-bar';
    
    const logo = document.createElement('div');
    logo.className = 'command-bar-logo';
    logo.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    
    const input = document.createElement('input');
    input.className = 'command-bar-input';
    input.type = 'text';
    input.placeholder = 'Ask Aura...';
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.openMainWindow(input.value);
        this.hideCommandBar();
      } else if (e.key === 'Escape') {
        this.hideCommandBar();
      }
    });
    input.addEventListener('focus', () => {
      this.openMainWindow();
    });
    
    const actions = document.createElement('div');
    actions.className = 'command-bar-actions';
    
    const menuBtn = document.createElement('button');
    menuBtn.className = 'command-bar-btn';
    menuBtn.innerHTML = '⋯';
    menuBtn.title = 'Menu';
    
    this.commandBar.appendChild(logo);
    this.commandBar.appendChild(input);
    this.commandBar.appendChild(actions);
    actions.appendChild(menuBtn);
    
    this.shadowRoot.appendChild(this.commandBar);
  }

  createMainWindow() {
    this.mainWindow = document.createElement('div');
    this.mainWindow.className = 'main-window';
    
    // Header
    const header = document.createElement('div');
    header.className = 'window-header';
    
    const title = document.createElement('div');
    title.className = 'window-title';
    title.innerHTML = `
      <div class="window-title-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7L12 12L22 7L12 2Z"/>
          <path d="M2 17L12 22L22 17"/>
          <path d="M2 12L12 17L22 12"/>
        </svg>
      </div>
      <span>Aura | The AI Assistant</span>
    `;
    
    const actions = document.createElement('div');
    actions.className = 'window-actions';
    
    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'window-btn';
    settingsBtn.innerHTML = '⚙';
    settingsBtn.title = 'Settings';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'window-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.title = 'Close';
    closeBtn.addEventListener('click', () => this.closeMainWindow());
    
    actions.appendChild(settingsBtn);
    actions.appendChild(closeBtn);
    header.appendChild(title);
    header.appendChild(actions);
    
    // Content
    const content = document.createElement('div');
    content.className = 'window-content';
    
    // Recent Activity
    const recentActivity = document.createElement('div');
    recentActivity.className = 'recent-activity';
    recentActivity.innerHTML = `
      <div class="section-title">Context</div>
      <div class="activity-item" id="context-item">
        <div class="activity-icon" style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        </div>
        <div class="activity-text">Reading current page...</div>
      </div>
    `;
    
    // Chat messages
    const messagesContainer = document.createElement('div');
    messagesContainer.className = 'chat-messages';
    messagesContainer.id = 'aura-chat-messages';
    
    content.appendChild(recentActivity);
    content.appendChild(messagesContainer);
    
    // Input area
    const inputArea = document.createElement('div');
    inputArea.className = 'input-area';
    
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';
    
    const input = document.createElement('textarea');
    input.className = 'input-field';
    input.placeholder = 'Ask Aura anything about this page...';
    input.rows = 1;
    
    const sendBtn = document.createElement('button');
    sendBtn.className = 'send-btn';
    sendBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="22" y1="2" x2="11" y2="13"/>
        <polygon points="22 2 15 22 11 13 2 9 22 2"/>
      </svg>
    `;
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage(input.value);
        input.value = '';
      }
    });
    
    sendBtn.addEventListener('click', () => {
      this.sendMessage(input.value);
      input.value = '';
    });
    
    inputWrapper.appendChild(input);
    inputWrapper.appendChild(sendBtn);
    inputArea.appendChild(inputWrapper);
    
    this.mainWindow.appendChild(header);
    this.mainWindow.appendChild(content);
    this.mainWindow.appendChild(inputArea);
    
    this.shadowRoot.appendChild(this.mainWindow);
    
    // Backdrop
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'overlay-backdrop';
    this.backdrop.addEventListener('click', () => this.closeMainWindow());
    this.shadowRoot.appendChild(this.backdrop);
  }

  toggleCommandBar() {
    if (this.commandBar.classList.contains('visible')) {
      this.hideCommandBar();
    } else {
      this.showCommandBar();
    }
  }

  showCommandBar() {
    this.commandBar.classList.add('visible');
    const input = this.commandBar.querySelector('.command-bar-input');
    setTimeout(() => input.focus(), 100);
  }

  hideCommandBar() {
    this.commandBar.classList.remove('visible');
    const input = this.commandBar.querySelector('.command-bar-input');
    input.value = '';
    input.blur();
  }

  async openMainWindow(initialQuery = '') {
    this.isWindowOpen = true;
    this.mainWindow.classList.add('visible');
    this.backdrop.classList.add('visible');
    this.hideCommandBar();
    
    // Update context display
    this.updateContextDisplay();
    
    // Request fresh context
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PAGE_CONTEXT'
      });
      if (response && response.context) {
        this.currentContext = response.context;
        this.updateContextDisplay();
      }
    } catch (e) {
      // Extension context invalidated - extension was reloaded
      // This is expected during development and can be safely ignored
      if (e.message && !e.message.includes('Extension context invalidated')) {
        console.log('Failed to get context', e);
      }
    }
    
    if (initialQuery) {
      const input = this.mainWindow.querySelector('.input-field');
      input.value = initialQuery;
      this.sendMessage(initialQuery);
    }
  }
  
  updateContextDisplay() {
    const activityText = this.mainWindow.querySelector('.activity-text');
    if (this.currentContext && this.currentContext.title) {
      activityText.textContent = `Reading: ${this.currentContext.title}`;
    } else if (document.title) {
      activityText.textContent = `Reading: ${document.title}`;
    } else {
      activityText.textContent = 'Reading current page...';
    }
  }

  closeMainWindow() {
    this.isWindowOpen = false;
    this.mainWindow.classList.remove('visible');
    this.backdrop.classList.remove('visible');
  }

  async sendMessage(text) {
    if (!text.trim()) return;
    
    const messagesContainer = this.mainWindow.querySelector('#aura-chat-messages');
    
    // Add user message
    const userMsg = document.createElement('div');
    userMsg.className = 'message user';
    userMsg.textContent = text;
    messagesContainer.appendChild(userMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add typing indicator
    const typingMsg = document.createElement('div');
    typingMsg.className = 'message assistant';
    typingMsg.textContent = '...';
    typingMsg.id = 'typing-indicator';
    messagesContainer.appendChild(typingMsg);
    
    try {
      // Get context if we don't have it
      if (!this.currentContext) {
        // We'll rely on the background script to fetch it via message handler
      }
      
      const response = await chrome.runtime.sendMessage({
        type: 'SEND_MESSAGE',
        data: {
          prompt: text,
          context: this.currentContext // Pass current context if available
        }
      });
      
      typingMsg.remove();
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      if (!response) {
        throw new Error('No response from extension. Please reload the extension.');
      }
      
      const assistantMsg = document.createElement('div');
      assistantMsg.className = 'message assistant';
      assistantMsg.innerHTML = this.formatMessage(response.response);
      messagesContainer.appendChild(assistantMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    } catch (error) {
      typingMsg.remove();
      const errorMsg = document.createElement('div');
      errorMsg.className = 'message assistant';
      errorMsg.style.color = '#ef4444';
      
      // Handle extension context invalidated gracefully
      if (error.message && error.message.includes('Extension context invalidated')) {
        errorMsg.textContent = 'Extension was reloaded. Please refresh this page to continue using Aura.';
      } else {
        errorMsg.textContent = `Error: ${error.message || 'Unknown error'}`;
      }
      
      messagesContainer.appendChild(errorMsg);
    }
  }
  
  formatMessage(text) {
    // Basic formatting: code blocks, inline code, bold, links
    let formatted = text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener" style="color: #6366f1;">$1</a>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }
}

// Initialize
let floatingUI = null;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    floatingUI = new FloatingUI();
  });
} else {
  floatingUI = new FloatingUI();
}

// Listen for messages from service worker
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'OPEN_AURA') {
    if (floatingUI) {
      floatingUI.showCommandBar();
    }
  }
});