// src/ui/popup/popup.js
class PopupChatbot {
  constructor() {
    this.messages = [];
    this.currentTabId = null;
    this.isLoading = false;
    this.currentContext = null;
    this.selectedModel = 'chatgpt'; // Default model - ChatGPT
    this.init();
  }

  async init() {
    // Get current tab
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTabId = tab.id;
    } catch (e) {
      console.log('Could not get current tab:', e);
    }

    // Load saved model preference
    await this.loadModelPreference();

    // Load conversation history
    await this.loadConversation();

    // Set up event listeners
    this.setupEventListeners();

    // Listen for messages from service worker
    chrome.runtime.onMessage.addListener((message) => {
      this.handleMessage(message);
    });
    
    // Request fresh context if we have a tab
    if (this.currentTabId) {
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'GET_PAGE_CONTEXT',
          tabId: this.currentTabId
        });
        if (response && response.context) {
          this.currentContext = response.context;
        }
      } catch (e) {
        console.log('Failed to get context', e);
      }
    }
  }

  setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const input = document.getElementById('message-input');
    const modelSelect = document.getElementById('model-select');

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
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });

    // Model selection
    modelSelect.addEventListener('change', (e) => {
      this.selectedModel = e.target.value;
      this.saveModelPreference();
    });

    // Focus input on load
    input.focus();
  }

  async loadModelPreference() {
    try {
      const result = await chrome.storage.local.get(['selectedModel']);
      if (result.selectedModel) {
        this.selectedModel = result.selectedModel;
        const modelSelect = document.getElementById('model-select');
        if (modelSelect) {
          modelSelect.value = this.selectedModel;
        }
      }
    } catch (error) {
      console.error('Failed to load model preference:', error);
    }
  }

  async saveModelPreference() {
    try {
      await chrome.storage.local.set({ selectedModel: this.selectedModel });
    } catch (error) {
      console.error('Failed to save model preference:', error);
    }
  }

  async loadConversation() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'GET_CONVERSATION',
        tabId: this.currentTabId || null
      });

      if (response && response.conversation) {
        this.messages = response.conversation;
        this.renderMessages();
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
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
    
    // Add streaming message container
    const assistantMsgId = `msg-${Date.now()}`;
    const assistantMsg = document.createElement('div');
    assistantMsg.className = 'message assistant';
    assistantMsg.id = assistantMsgId;
    assistantMsg.innerHTML = '<span class="streaming-text"></span><span class="streaming-cursor"></span>';
    const messagesContainer = document.getElementById('messages');
    messagesContainer.appendChild(assistantMsg);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    const streamingText = assistantMsg.querySelector('.streaming-text');
    const streamingCursor = assistantMsg.querySelector('.streaming-cursor');
    let fullText = '';
    
    // Listen for streaming chunks
    const streamListener = (message) => {
      if (message.type === 'STREAM_CHUNK' && message.fullText) {
        fullText = message.fullText;
        streamingText.innerHTML = this.formatMessage(fullText);
        // Aggressive auto-scroll during streaming
        requestAnimationFrame(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
      } else if (message.type === 'STREAM_COMPLETE') {
        fullText = message.response;
        streamingText.innerHTML = this.formatMessage(fullText);
        streamingCursor.remove();
        assistantMsg.id = '';
        chrome.runtime.onMessage.removeListener(streamListener);
        // Final aggressive auto-scroll after completion
        requestAnimationFrame(() => {
          messagesContainer.scrollTop = messagesContainer.scrollHeight;
          setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }, 50);
          setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }, 200);
        });
      }
    };
    
    chrome.runtime.onMessage.addListener(streamListener);

    try {
      // Try streaming first
      const streamResponse = await chrome.runtime.sendMessage({
        type: 'STREAM_MESSAGE',
        data: {
          prompt: text,
          context: this.currentContext,
          model: this.selectedModel
        },
        tabId: this.currentTabId
      });

      // If streaming not supported, fall back to regular
      if (streamResponse && streamResponse.error) {
        throw new Error(streamResponse.error);
      }
      
      if (!streamResponse || !streamResponse.streaming) {
        chrome.runtime.onMessage.removeListener(streamListener);
        assistantMsg.remove();
        
        // Fallback to non-streaming
        const aiResponse = await chrome.runtime.sendMessage({
          type: 'SEND_MESSAGE',
          data: {
            prompt: text,
            context: this.currentContext,
            model: this.selectedModel
          },
          tabId: this.currentTabId
        });

        if (aiResponse.error) {
          throw new Error(aiResponse.error);
        }

        this.addMessage('assistant', aiResponse.response);
        // Ensure scroll after non-streaming response
        requestAnimationFrame(() => {
          const container = document.getElementById('messages');
          if (container) {
            container.scrollTop = container.scrollHeight;
          }
        });
      }
    } catch (error) {
      chrome.runtime.onMessage.removeListener(streamListener);
      if (assistantMsg.parentNode) {
        assistantMsg.remove();
      }
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}`, true);
    } finally {
      this.isLoading = false;
      sendBtn.disabled = false;
      input.focus();
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
    
    // Format message content
    messageDiv.innerHTML = this.formatMessage(content);
    
    messagesContainer.appendChild(messageDiv);
    // Aggressive auto-scroll to bottom
    requestAnimationFrame(() => {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 50);
      setTimeout(() => {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }, 200);
    });

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
    }
  }
}

// Initialize
new PopupChatbot();

