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

    // Disable send button
    const sendBtn = document.getElementById('send-btn');
    sendBtn.disabled = true;

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

      if (aiResponse.error) {
        throw new Error(aiResponse.error);
      }

      // Update loading message with response
      this.updateMessage(loadingId, 'assistant', aiResponse.response);
    } catch (error) {
      this.updateMessage(loadingId, 'assistant', `Error: ${error.message}`);
    } finally {
      sendBtn.disabled = false;
    }
  }

  addMessage(role, content, isLoading = false) {
    const messagesContainer = document.getElementById('messages');
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
      welcomeMessage.remove();
    }

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

    if (this.messages.length === 0) {
      const welcome = document.createElement('div');
      welcome.className = 'welcome-message';
      welcome.innerHTML = '<h2>How can I help you?</h2><p>Ask me anything about this page, or use the magic dot to get started.</p>';
      messagesContainer.appendChild(welcome);
      return;
    }

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