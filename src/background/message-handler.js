// src/background/message-handler.js
import { ContextProcessor } from '../content/context-processor.js';

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
    
    // First check if we have stored context (basic)
    const tabState = this.stateManager.getTabState(tabId);
    
    // Try to get fresh full context from content script
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_CONTEXT' });
      if (response && response.context) {
        // Update stored state with basic info
        this.stateManager.updateTabState(tabId, response.context.url);
        sendResponse({ context: response.context });
        return;
      }
    } catch (error) {
      // Content script might not be ready or page doesn't support it
      // Fall back to stored basic state
      console.log('Failed to get context from content script, using stored state', error);
    }
    
    sendResponse({ context: tabState || { url: '', title: '' } });
  }

  async handleSendMessage(data, tabId, sendResponse) {
    if (!tabId) {
      sendResponse({ error: 'No tab ID provided' });
      return;
    }

    const { prompt, context } = data;
    
    try {
      // Save user message immediately
      const conversation = await this.stateManager.getConversation(tabId);
      conversation.push({ role: 'user', content: prompt });
      await this.stateManager.saveConversation(tabId, conversation);
      
      // Format prompt with context if available
      let finalPrompt = prompt;
      let imageData = null;

      if (context) {
        // Capture screenshot if this is a visual question (simple heuristic)
        const isVisualQuestion = prompt.toLowerCase().match(/look|see|image|screenshot|visual|picture|screen/);
        
        if (isVisualQuestion) {
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
            imageData = dataUrl; // API client expects data URL for OpenAI
          } catch (e) {
            console.warn('Screenshot capture failed during message handling', e);
          }
        }

        // Format the text prompt with context
        const formatted = ContextProcessor.createQuestionPrompt(prompt, context);
        finalPrompt = formatted;
      }
      
      // Call API
      const response = await this.apiClient.callOpenAIAPI(finalPrompt, imageData);
      
      // Save assistant response
      conversation.push({ role: 'assistant', content: response });
      await this.stateManager.saveConversation(tabId, conversation);
      
      sendResponse({ response });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleCaptureScreenshot(tabId, sendResponse) {
    try {
      // Capture visible tab of the current window
      // Note: captureVisibleTab defaults to current window if windowId not specified
      const dataUrl = await chrome.tabs.captureVisibleTab(null, {
        format: 'png',
        quality: 80
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
      await this.stateManager.updateTabState(tabId, context.url);
    }
    sendResponse({ received: true });
  }
}