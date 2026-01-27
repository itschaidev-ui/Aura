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
    const settingsBtn = document.getElementById('settings-btn');

    // Settings button
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.openSettings());
    }

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
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      } else if (message.type === 'STREAM_COMPLETE') {
        fullText = message.response;
        streamingText.innerHTML = this.formatMessage(fullText);
        streamingCursor.remove(); // Remove cursor when complete
        assistantMsg.id = '';
        chrome.runtime.onMessage.removeListener(streamListener);
        
        // Detect tasks
        this.detectAndDisplayTasks(fullText);
      }
    };
    
    chrome.runtime.onMessage.addListener(streamListener);

    try {
      // Try streaming first
      const streamResponse = await chrome.runtime.sendMessage({
        type: 'STREAM_MESSAGE',
        data: {
          prompt: text,
          context: this.currentContext
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
            context: this.currentContext
          },
          tabId: this.currentTabId
        });

        if (aiResponse.error) {
          throw new Error(aiResponse.error);
        }

        this.addMessage('assistant', aiResponse.response);
        this.detectAndDisplayTasks(aiResponse.response);
      }
    } catch (error) {
      chrome.runtime.onMessage.removeListener(streamListener);
      if (assistantMsg.parentNode) {
        assistantMsg.remove();
      }
      this.addMessage('assistant', `Sorry, I encountered an error: ${error.message}. Please check your API key in settings.`, true);
    } finally {
      this.isLoading = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }
  
  async detectAndDisplayTasks(text) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'DETECT_TASKS',
        text: text
      });
      
      if (response && response.tasks && response.tasks.length > 0) {
        // Display tasks in side panel
        this.displayTasks(response.tasks);
      }
    } catch (e) {
      console.log('Task detection failed', e);
    }
  }
  
  displayTasks(tasks) {
    // Add tasks section to side panel
    let tasksSection = document.getElementById('tasks-section');
    if (!tasksSection) {
      tasksSection = document.createElement('div');
      tasksSection.id = 'tasks-section';
      tasksSection.className = 'tasks-section';
      tasksSection.innerHTML = '<h3>Tasks</h3><div class="tasks-list"></div>';
      const chatContainer = document.getElementById('chat-container');
      chatContainer.insertBefore(tasksSection, chatContainer.firstChild);
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
  
  openSettings() {
    // Open settings in a new tab or side panel
    chrome.tabs.create({
      url: chrome.runtime.getURL('src/ui/settings/settings.html')
    });
  }
}

// Initialize
new SidePanel();