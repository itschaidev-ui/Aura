// src/background/message-handler.js
export class MessageHandler {
  constructor(stateManager, apiClient) {
    this.stateManager = stateManager;
    this.apiClient = apiClient;
  }

  async handle(message, sender, sendResponse) {
    // Determine tab ID (from sender or from message if sent from popup/sidepanel)
    const tabId = sender.tab ? sender.tab.id : (message.tabId || null);

    try {
      switch (message.type) {
        case 'GET_PAGE_CONTEXT':
          this.handleGetPageContext(tabId, sendResponse);
          break;
        
        case 'SEND_MESSAGE':
          this.handleSendMessage(message.data, tabId, sendResponse);
          break;
        
        case 'CAPTURE_SCREENSHOT':
          this.handleCaptureScreenshot(tabId, sendResponse);
          break;
          
        case 'GET_CONVERSATION':
          this.handleGetConversation(tabId, sendResponse);
          break;
          
        case 'CLEAR_CONVERSATION':
          this.handleClearConversation(tabId, sendResponse);
          break;
          
        case 'PAGE_CONTEXT_UPDATED':
          this.handlePageContextUpdated(message.data, tabId, sendResponse);
          break;
        
        default:
          console.warn(`Unknown message type: ${message.type}`);
          sendResponse({ error: `Unknown message type: ${message.type}` });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ error: error.message });
    }
  }

  async handleGetPageContext(tabId, sendResponse) {
    if (!tabId) {
      sendResponse({ error: 'No tab ID provided' });
      return;
    }
    
    const tabState = this.stateManager.getTabState(tabId);
    sendResponse({ context: tabState });
  }

  async handleSendMessage(data, tabId, sendResponse) {
    if (!tabId) {
      sendResponse({ error: 'No tab ID provided' });
      return;
    }

    const { prompt, imageData } = data;
    
    try {
      // Save user message immediately
      const conversation = await this.stateManager.getConversation(tabId);
      conversation.push({ role: 'user', content: prompt });
      await this.stateManager.saveConversation(tabId, conversation);
      
      // Call API
      const response = await this.apiClient.callGeminiAPI(prompt, imageData);
      
      // Save assistant response
      conversation.push({ role: 'assistant', content: response });
      await this.stateManager.saveConversation(tabId, conversation);
      
      sendResponse({ response });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleCaptureScreenshot(tabId, sendResponse) {
    // If tabId is not provided or we are not in a context where we can capture
    // (e.g. from side panel without active tab permission on that specific tab)
    // we might need to be careful.
    
    try {
      // Capture visible tab of the current window
      // Note: captureVisibleTab defaults to current window if windowId not specified
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 100
      });
      sendResponse({ screenshot: dataUrl });
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      sendResponse({ error: error.message });
    }
  }
  
  async handleGetConversation(tabId, sendResponse) {
    if (!tabId) {
      sendResponse({ conversation: [] });
      return;
    }
    
    const conversation = await this.stateManager.getConversation(tabId);
    sendResponse({ conversation });
  }
  
  async handleClearConversation(tabId, sendResponse) {
    if (!tabId) {
      sendResponse({ success: false });
      return;
    }
    
    await this.stateManager.clearConversation(tabId);
    sendResponse({ success: true });
  }
  
  async handlePageContextUpdated(context, tabId, sendResponse) {
    if (tabId) {
      // Update state with rich context from content script
      // We might want to store more than just URL
      await this.stateManager.updateTabState(tabId, context.url);
      // Could also store full context if needed
    }
    sendResponse({ received: true });
  }
}