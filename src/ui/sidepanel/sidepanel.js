// src/ui/sidepanel/sidepanel.js
class SidePanel {
  constructor() {
    this.messages = [];
    this.currentTabId = null;
    this.isLoading = false;
    this.currentContext = null;
    this.init();
  }

  async init() {
    // Get current tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    this.currentTabId = tab.id;

    // Load conversation history
    await this.loadConversation();

    // Set up event listeners
    this.setupEventListeners();

    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((message) => {
      this.handleMessage(message);
    });
    
    // Initial context update
    this.updateContext(tab.url, tab.title);
    
    // Request fresh context
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_PAGE_CONTEXT',
        tabId: this.currentTabId
      });
      if (response && response.context) {
        this.currentContext = response.context;
        this.updateContext(response.context.url, response.context.title);
      }
    } catch (e) {
      console.log('Failed to get context', e);
    }
  }

  setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('message-input');
    const quickActions = document.querySelectorAll('.quick-action-btn');

    // Send button
    sendBtn.addEventListener('click', () => this.sendMessage());

    // Input handling
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Quick action buttons
    quickActions.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const action = e.target.dataset.action;
        this.handleQuickAction(action);
      });
    });
  }

  updateContext(url, title) {
    const indicator = document.getElementById('context-indicator');
    const text = indicator.querySelector('.context-text');
    const dot = indicator.querySelector('.context-dot');
    
    try {
      if (title) {
        text.textContent = `Reading: ${title.substring(0, 30)}${title.length > 30 ? '...' : ''}`;
      } else {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.replace('www.', '');
        text.textContent = `Reading ${domain}...`;
      }
      
      dot.style.background = 'var(--success)';
    } catch (e) {
      text.textContent = 'Ready';
    }
  }

  async loadConversation() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CONVERSATION',
        tabId: this.currentTabId
      });

      if (response && response.conversation) {
        this.messages = response.conversation;
        this.renderMessages();
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  }

  async handleQuickAction(action) {
    const input = document.getElementById('message-input');
    
    switch (action) {
      case 'summarize':
        input.value = 'Summarize this page for me';
        break;
      case 'explain':
        input.value = 'Explain the key points on this page';
        break;
    }
    
    input.focus();
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    
    // Auto-send after a brief delay
    setTimeout(() => this.sendMessage(), 100);
  }

  async sendMessage() {
    if (this.isLoading) return;
    
    const input = document.getElementById('message-input');
    const text = input.value.trim();
    
    if (!text) return;

    this.isLoading = true;
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;

    // Add user message to UI
    this.addMessage('user', text);
    input.value = '';
    input.style.height = 'auto';

    // Show typing indicator
    const typingId = this.showTypingIndicator();

    try {
      // Get fresh context if we don't have it
      if (!this.currentContext) {
        // We'll rely on the background script to fetch it via message handler
      }

      // Send to AI
      const aiResponse = await chrome.runtime.sendMessage({
        type: 'SEND_MESSAGE',
        data: {
          prompt: text,
          context: this.currentContext
        },
        tabId: this.currentTabId
      });

      // Remove typing indicator
      this.removeTypingIndicator(typingId);

      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      // Add assistant response
      this.addMessage('assistant', aiResponse.response);
    } catch (error) {
      this.removeTypingIndicator(typingId);
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}. Please check your API key in settings.`, true);
    } finally {
      this.isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('messages');
    const typingDiv = document.createElement('div');
    const id = `typing-${Date.now()}`;
    typingDiv.id = id;
    typingDiv.className = 'message assistant typing';
    
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-dot';
      typingDiv.appendChild(dot);
    }
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return id;
  }

  removeTypingIndicator(id) {
    const typingDiv = document.getElementById(id);
    if (typingDiv) {
      typingDiv.remove();
    }
  }

  addMessage(role, content, isError = false) {
    const messagesContainer = document.getElementById('messages');
    const welcomeMessage = document.getElementById('welcome-message');
    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }

    const messageDiv = document.createElement('div');
    const id = `msg-${Date.now()}-${Math.random()}`;
    messageDiv.id = id;
    messageDiv.className = `message ${role}`;
    
    if (isError) {
      messageDiv.style.borderLeft = '3px solid var(--error)';
    }
    
    // Format message content (basic markdown-like formatting)
    messageDiv.innerHTML = this.formatMessage(content);
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    this.messages.push({ role, content });
    
    return id;
  }

  formatMessage(text) {
    // Basic formatting: code blocks, inline code, bold, links
    let formatted = text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
    
    // Code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
    
    // Line breaks
    formatted = formatted.replace(/\n/g, '<br>');
    
    return formatted;
  }

  renderMessages() {
    const messagesContainer = document.getElementById('messages');
    const welcomeMessage = document.getElementById('welcome-message');
    
    messagesContainer.innerHTML = '';

    if (this.messages.length === 0) {
      if (welcomeMessage) {
        welcomeMessage.style.display = 'block';
      }
      return;
    }

    if (welcomeMessage) {
      welcomeMessage.style.display = 'none';
    }

    this.messages.forEach(msg => {
      this.addMessage(msg.role, msg.content);
    });
  }

  handleMessage(message) {
    if (message.type === 'NEW_RESPONSE') {
      this.addMessage('assistant', message.data);
    } else if (message.type === 'CONTEXT_UPDATED') {
      // Background script notified us of context update
      // We could fetch new context here, but we'll wait for next interaction
    }
  }
}

// Initialize
new SidePanel();