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
        width: 600px;
        height: 600px;
        min-width: 400px;
        min-height: 400px;
        max-width: 90vw;
        max-height: 90vh;
        background: #1a1a1a;
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1);
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.95);
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        backdrop-filter: blur(20px);
        overflow: hidden;
        z-index: 2147483648;
        resize: both;
      }

      .main-window.resizing {
        transition: none;
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
        z-index: 2147483646;
      }

      .overlay-backdrop.visible {
        opacity: 1;
      }

      .resize-handle {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 20px;
        height: 20px;
        cursor: nwse-resize;
        z-index: 10;
        background: linear-gradient(135deg, transparent 0%, transparent 30%, rgba(255, 255, 255, 0.2) 30%, rgba(255, 255, 255, 0.2) 50%, transparent 50%);
      }

      .resize-handle:hover {
        background: linear-gradient(135deg, transparent 0%, transparent 30%, rgba(255, 255, 255, 0.4) 30%, rgba(255, 255, 255, 0.4) 50%, transparent 50%);
      }

      .favicon-button {
        position: fixed !important;
        top: 20px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        width: 56px !important;
        height: 56px !important;
        border-radius: 50% !important;
        background: #1a1a1a !important;
        border: 2px solid rgba(255, 255, 255, 0.2) !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5) !important;
        cursor: pointer !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        pointer-events: auto !important;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
        z-index: 2147483647 !important;
        backdrop-filter: blur(10px) !important;
        visibility: visible !important;
        opacity: 1 !important;
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

      .tasks-section {
        margin-bottom: 24px;
        padding: 16px;
        background: rgba(255, 255, 255, 0.03);
        border-radius: 8px;
      }

      .tasks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-top: 12px;
      }

      .task-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px;
        border-radius: 6px;
        transition: background 0.2s ease;
      }

      .task-item:hover {
        background: rgba(255, 255, 255, 0.05);
      }

      .task-item.completed .task-text {
        text-decoration: line-through;
        opacity: 0.6;
      }

      .task-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .task-text {
        flex: 1;
        font-size: 14px;
        color: #e5e7eb;
      }

      .streaming-text {
        display: inline;
      }

      .streaming-cursor {
        display: inline-block;
        width: 2px;
        height: 1em;
        background: #6366f1;
        animation: blink 1s infinite;
        margin-left: 2px;
      }

      @keyframes blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  createFaviconButton() {
    this.faviconButton = document.createElement('div');
    this.faviconButton.className = 'favicon-button';
    this.faviconButton.title = 'Open Aura Assistant';
    this.faviconButton.setAttribute('aria-label', 'Open Aura Assistant');
    
    // Set inline styles to ensure visibility
    this.faviconButton.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      width: 56px !important;
      height: 56px !important;
      border-radius: 50% !important;
      background: #1a1a1a !important;
      border: 2px solid rgba(255, 255, 255, 0.2) !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4) !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      pointer-events: auto !important;
      z-index: 2147483647 !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
    
    // Add default icon immediately so button is always visible
    this.faviconButton.innerHTML = `
      <svg class="default-icon" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="width: 28px; height: 28px;">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    `;
    
    // Update favicon (will replace default icon if found)
    this.updateFavicon();
    
    // Add click handler
    this.faviconButton.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
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
    
    // Log for debugging
    console.log('Aura favicon button created at top center');
  }

  updateFavicon() {
    if (!this.faviconButton) return;
    
    // Try multiple methods to get favicon
    let faviconUrl = null;
    
    // Method 1: Check for favicon link tags
    const faviconLink = document.querySelector('link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]');
    if (faviconLink && faviconLink.href) {
      faviconUrl = faviconLink.href;
      // Handle relative URLs
      if (faviconUrl.startsWith('/')) {
        faviconUrl = window.location.origin + faviconUrl;
      } else if (!faviconUrl.startsWith('http')) {
        faviconUrl = window.location.origin + '/' + faviconUrl;
      }
    }
    
    // Method 2: Try Google's favicon service as fallback
    if (!faviconUrl) {
      const domain = window.location.hostname;
      faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }
    
    // Create or update favicon image
    let faviconImg = this.faviconButton.querySelector('img');
    
    if (!faviconImg) {
      faviconImg = document.createElement('img');
      faviconImg.style.cssText = 'width: 32px; height: 32px; border-radius: 6px; object-fit: cover;';
      this.faviconButton.innerHTML = '';
      this.faviconButton.appendChild(faviconImg);
    }
    
    faviconImg.src = faviconUrl;
    faviconImg.alt = document.title || 'Page icon';
    
    // Fallback to default icon if image fails to load
    faviconImg.onerror = () => {
      // Try Google favicon service
      const domain = window.location.hostname;
      const googleFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
      
      if (faviconImg.src !== googleFavicon) {
        faviconImg.src = googleFavicon;
        faviconImg.onerror = () => {
          // Final fallback to SVG icon
          this.faviconButton.innerHTML = `
            <svg class="default-icon" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="width: 28px; height: 28px;">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          `;
        };
      } else {
        // Already tried Google, show default icon
        this.faviconButton.innerHTML = `
          <svg class="default-icon" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2" style="width: 28px; height: 28px;">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
        `;
      }
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
    
    // Backdrop (added first, lower z-index)
    this.backdrop = document.createElement('div');
    this.backdrop.className = 'overlay-backdrop';
    this.backdrop.style.zIndex = '2147483646';
    this.backdrop.addEventListener('click', () => this.closeMainWindow());
    this.shadowRoot.appendChild(this.backdrop);
    
    // Main window (added after backdrop, higher z-index - appears on top)
    this.mainWindow.style.zIndex = '2147483648';
    this.shadowRoot.appendChild(this.mainWindow);
    
    // Add resize handle
    this.resizeHandle = document.createElement('div');
    this.resizeHandle.className = 'resize-handle';
    this.mainWindow.appendChild(this.resizeHandle);
    
    // Load saved size (after window is created)
    this.loadWindowSize();
    
    // Setup resize functionality (after handle is created)
    this.setupResize();
  }

  setupResize() {
    let startX, startY, startWidth, startHeight;
    
    const startResize = (e) => {
      e.preventDefault();
      this.isResizing = true;
      this.mainWindow.classList.add('resizing');
      
      startX = e.clientX;
      startY = e.clientY;
      const rect = this.mainWindow.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      
      document.addEventListener('mousemove', doResize);
      document.addEventListener('mouseup', stopResize);
    };
    
      const doResize = (e) => {
      if (!this.isResizing) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newWidth = startWidth + deltaX;
      let newHeight = startHeight + deltaY;
      
      // Keep it square by using the larger dimension
      const size = Math.max(newWidth, newHeight);
      newWidth = size;
      newHeight = size;
      
      // Apply min/max constraints
      newWidth = Math.max(400, Math.min(newWidth, window.innerWidth * 0.9));
      newHeight = Math.max(400, Math.min(newHeight, window.innerHeight * 0.9));
      
      this.mainWindow.style.width = newWidth + 'px';
      this.mainWindow.style.height = newHeight + 'px';
      
      // Save size
      this.saveWindowSize(newWidth, newHeight);
      
      // Update position if needed to keep in viewport
      const rect = this.mainWindow.getBoundingClientRect();
      if (rect.right > window.innerWidth) {
        this.mainWindow.style.left = (window.innerWidth - newWidth) + 'px';
      }
      if (rect.bottom > window.innerHeight) {
        this.mainWindow.style.top = (window.innerHeight - newHeight) + 'px';
      }
    };
    
    const stopResize = () => {
      this.isResizing = false;
      this.mainWindow.classList.remove('resizing');
      document.removeEventListener('mousemove', doResize);
      document.removeEventListener('mouseup', stopResize);
    };
    
    // Make the entire window draggable from header
    let isDragging = false;
    let dragStartX, dragStartY, startLeft, startTop;
    
    const header = this.mainWindow.querySelector('.window-header');
    if (header) {
      header.style.cursor = 'move';
      
      header.addEventListener('mousedown', (e) => {
        if (e.target.closest('.window-btn, .window-actions')) return;
        isDragging = true;
        const rect = this.mainWindow.getBoundingClientRect();
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        startLeft = rect.left;
        startTop = rect.top;
        
        document.addEventListener('mousemove', doDrag);
        document.addEventListener('mouseup', stopDrag);
      });
    }
    
    const doDrag = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      
      const newLeft = startLeft + deltaX;
      const newTop = startTop + deltaY;
      
      // Keep within viewport
      const maxLeft = window.innerWidth - this.mainWindow.offsetWidth;
      const maxTop = window.innerHeight - this.mainWindow.offsetHeight;
      
      this.mainWindow.style.left = Math.max(0, Math.min(newLeft, maxLeft)) + 'px';
      this.mainWindow.style.top = Math.max(0, Math.min(newTop, maxTop)) + 'px';
      this.mainWindow.style.transform = 'none';
      
      // Save position
      this.saveWindowPosition();
    };
    
    const stopDrag = () => {
      isDragging = false;
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    
    // Resize handle
    this.resizeHandle?.addEventListener('mousedown', startResize);
  }

  loadWindowSize() {
    try {
      const saved = localStorage.getItem('aura-window-size');
      if (saved) {
        const { width, height } = JSON.parse(saved);
        this.mainWindow.style.width = width + 'px';
        this.mainWindow.style.height = height + 'px';
      }
    } catch (e) {
      // Use default size
    }
  }

  saveWindowSize(width, height) {
    try {
      localStorage.setItem('aura-window-size', JSON.stringify({ width, height }));
    } catch (e) {
      // Ignore storage errors
    }
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
    
    // Load saved position if exists
    this.loadWindowPosition();
    
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

  loadWindowPosition() {
    try {
      const saved = localStorage.getItem('aura-window-position');
      if (saved) {
        const { left, top } = JSON.parse(saved);
        this.mainWindow.style.left = left + 'px';
        this.mainWindow.style.top = top + 'px';
        this.mainWindow.style.transform = 'none';
      }
    } catch (e) {
      // Use default centered position
    }
  }

  saveWindowPosition() {
    try {
      const rect = this.mainWindow.getBoundingClientRect();
      localStorage.setItem('aura-window-position', JSON.stringify({
        left: rect.left,
        top: rect.top
      }));
    } catch (e) {
      // Ignore storage errors
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
    
    // Add streaming message container
    const assistantMsg = document.createElement('div');
    assistantMsg.className = 'message assistant';
    assistantMsg.id = 'streaming-message';
    assistantMsg.innerHTML = '<span class="streaming-text"></span>';
    messagesContainer.appendChild(assistantMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    const streamingText = assistantMsg.querySelector('.streaming-text');
    let fullText = '';
    
    // Listen for streaming chunks
    const streamListener = (message) => {
      if (message.type === 'STREAM_CHUNK' && message.fullText) {
        fullText = message.fullText;
        streamingText.innerHTML = this.formatMessage(fullText);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else if (message.type === 'STREAM_COMPLETE') {
        fullText = message.response;
        streamingText.innerHTML = this.formatMessage(fullText);
        assistantMsg.id = ''; // Remove streaming ID
        chrome.runtime.onMessage.removeListener(streamListener);
        
        // Detect and display tasks
        this.detectAndDisplayTasks(fullText);
      }
    };
    
    chrome.runtime.onMessage.addListener(streamListener);
    
    try {
      // Use streaming API
      const response = await chrome.runtime.sendMessage({
        type: 'STREAM_MESSAGE',
        data: {
          prompt: text,
          context: this.currentContext
        }
      });
      
      if (response && response.error) {
        throw new Error(response.error);
      }
      
      // If streaming fails, fall back to regular message
      if (!response || !response.streaming) {
        chrome.runtime.onMessage.removeListener(streamListener);
        assistantMsg.remove();
        
        // Fallback to non-streaming
        const fallbackResponse = await chrome.runtime.sendMessage({
          type: 'SEND_MESSAGE',
          data: {
            prompt: text,
            context: this.currentContext
          }
        });
        
        if (fallbackResponse && fallbackResponse.response) {
          const fallbackMsg = document.createElement('div');
          fallbackMsg.className = 'message assistant';
          fallbackMsg.innerHTML = this.formatMessage(fallbackResponse.response);
          messagesContainer.appendChild(fallbackMsg);
          this.detectAndDisplayTasks(fallbackResponse.response);
        }
      }
    } catch (error) {
      chrome.runtime.onMessage.removeListener(streamListener);
      assistantMsg.remove();
      
      const errorMsg = document.createElement('div');
      errorMsg.className = 'message assistant';
      errorMsg.style.color = '#ef4444';
      
      if (error.message && error.message.includes('Extension context invalidated')) {
        errorMsg.textContent = 'Extension was reloaded. Please refresh this page to continue using Aura.';
      } else {
        errorMsg.textContent = `Error: ${error.message || 'Unknown error'}`;
      }
      
      messagesContainer.appendChild(errorMsg);
    }
  }
  
  async detectAndDisplayTasks(text) {
    try {
      // Request task detection from background script
      const response = await chrome.runtime.sendMessage({
        type: 'DETECT_TASKS',
        text: text
      });
      
      if (response && response.tasks && response.tasks.length > 0) {
        this.displayTasks(response.tasks);
      }
    } catch (e) {
      // Task detection failed, continue without it
      console.log('Task detection failed', e);
    }
  }
  
  displayTasks(tasks) {
    // Add tasks section if it doesn't exist
    let tasksSection = this.mainWindow.querySelector('.tasks-section');
    if (!tasksSection) {
      tasksSection = document.createElement('div');
      tasksSection.className = 'tasks-section';
      tasksSection.innerHTML = '<div class="section-title">Tasks</div><div class="tasks-list"></div>';
      const content = this.mainWindow.querySelector('.window-content');
      content.insertBefore(tasksSection, content.firstChild);
    }
    
    const tasksList = tasksSection.querySelector('.tasks-list');
    tasks.forEach(task => {
      const taskItem = document.createElement('div');
      taskItem.className = 'task-item';
      taskItem.innerHTML = `
        <input type="checkbox" class="task-checkbox">
        <span class="task-text">${task.text}</span>
      `;
      
      taskItem.querySelector('.task-checkbox').addEventListener('change', (e) => {
        if (e.target.checked) {
          taskItem.classList.add('completed');
        } else {
          taskItem.classList.remove('completed');
        }
      });
      
      tasksList.appendChild(taskItem);
    });
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