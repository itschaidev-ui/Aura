// src/background/message-handler.js
import { ContextProcessor } from '../content/context-processor.js';
import { TaskDetector } from './task-detector.js';
import { IntegrationManager } from '../integrations/integration-manager.js';

export class MessageHandler {
  constructor(stateManager, apiClient) {
    this.stateManager = stateManager;
    this.apiClient = apiClient;
    this.integrationManager = new IntegrationManager();
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
        
        case 'STREAM_MESSAGE':
          this.handleStreamMessage(message.data, tabId, sendResponse);
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
        
        case 'DETECT_TASKS':
          this.handleDetectTasks(message.text, sendResponse);
          break;
        
        case 'EXECUTE_ACTION':
          this.handleExecuteAction(message.data, sendResponse);
          break;
        
        case 'GET_INTEGRATIONS':
          this.handleGetIntegrations(sendResponse);
          break;
        
        case 'OPEN_TAB':
          this.handleOpenTab(message.data, sendResponse);
          break;
        
        case 'GET_ALL_TABS':
          this.handleGetAllTabs(sendResponse);
          break;
        
        case 'GET_TAB_CONTENT':
          this.handleGetTabContent(message.data, sendResponse);
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
      // Return empty context for popup without tab
      sendResponse({ context: { url: '', title: 'General Chat' } });
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
    // Use 'popup' as conversation ID if no tabId (for popup without tab context)
    const conversationId = tabId || 'popup';

    const { prompt, context, model } = data;
    
    try {
      // Save user message immediately
      const conversation = await this.stateManager.getConversation(conversationId);
      conversation.push({ role: 'user', content: prompt });
      await this.stateManager.saveConversation(conversationId, conversation);
      
      // Check for tab management commands
      const openTabMatch = prompt.match(/open\s+(?:tab\s+for\s+)?(?:the\s+)?(?:url\s+)?(https?:\/\/[^\s]+)/i);
      if (openTabMatch) {
        const url = openTabMatch[1];
        const tab = await chrome.tabs.create({ url });
        const response = `I've opened a new tab with the URL: ${url}`;
        conversation.push({ role: 'assistant', content: response });
        await this.stateManager.saveConversation(conversationId, conversation);
        sendResponse({ response, action: 'tab_opened', tabId: tab.id });
        return;
      }

      const listTabsMatch = prompt.match(/list\s+(?:all\s+)?tabs|show\s+(?:all\s+)?tabs|what\s+tabs/i);
      if (listTabsMatch) {
        const tabs = await chrome.tabs.query({});
        const tabList = tabs.map((tab, index) => `${index + 1}. ${tab.title} - ${tab.url}`).join('\n');
        const response = `Here are your open tabs:\n\n${tabList}`;
        conversation.push({ role: 'assistant', content: response });
        await this.stateManager.saveConversation(conversationId, conversation);
        sendResponse({ response });
        return;
      }

      const checkTabMatch = prompt.match(/check\s+(?:tab|page)\s+(\d+)|what's\s+in\s+tab\s+(\d+)/i);
      if (checkTabMatch) {
        const tabNum = parseInt(checkTabMatch[1] || checkTabMatch[2]);
        const tabs = await chrome.tabs.query({});
        if (tabNum > 0 && tabNum <= tabs.length) {
          const targetTab = tabs[tabNum - 1];
          let content = `Tab ${tabNum}: ${targetTab.title}\nURL: ${targetTab.url}`;
          try {
            const tabContent = await chrome.tabs.sendMessage(targetTab.id, { type: 'GET_CONTEXT' });
            if (tabContent && tabContent.context) {
              content += `\n\nContent preview available.`;
            }
          } catch (e) {
            // Content script not available
          }
          const response = content;
          conversation.push({ role: 'assistant', content: response });
          await this.stateManager.saveConversation(conversationId, conversation);
          sendResponse({ response });
          return;
        }
      }
      
      // Format prompt with context if available
      let finalPrompt = prompt;
      let imageData = null;

      if (context && tabId) {
        // Capture screenshot if this is a visual question (enhanced heuristic)
        const visualKeywords = /look|see|image|screenshot|visual|picture|screen|chart|graph|diagram|what.*show|describe.*appearance|how.*look/i;
        const isVisualQuestion = visualKeywords.test(prompt);
        
        if (isVisualQuestion) {
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { 
              format: 'png',
              quality: 90 
            });
            imageData = dataUrl; // API client expects data URL
          } catch (e) {
            console.warn('Screenshot capture failed during message handling', e);
            // Continue without screenshot
          }
        }

        // Format the text prompt with context using ContextProcessor
        // Only add context if it's meaningful (not just "Unknown" or "Untitled")
        if (context.url && context.url !== 'Unknown' && context.title && context.title !== 'Untitled') {
          try {
            const formatted = ContextProcessor.createQuestionPrompt(prompt, context);
            finalPrompt = formatted;
          } catch (e) {
            console.warn('Context formatting failed, using prompt without context:', e);
            // Fallback to original prompt if formatting fails
          }
        }
        // If context is empty/unknown, just use the original prompt
      }
      
      // Call API with user's preferred model
      const response = await this.apiClient.callOpenAIAPI(finalPrompt, imageData, model);

      // Save assistant response
      conversation.push({ role: 'assistant', content: response });
      await this.stateManager.saveConversation(conversationId, conversation);

      sendResponse({ response });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleStreamMessage(data, tabId, sendResponse) {
    // Use 'popup' as conversation ID if no tabId (for popup without tab context)
    const conversationId = tabId || 'popup';

    const { prompt, context, model } = data;
    
    try {
      // Save user message immediately
      const conversation = await this.stateManager.getConversation(conversationId);
      conversation.push({ role: 'user', content: prompt });
      await this.stateManager.saveConversation(conversationId, conversation);
      
      // Check for tab management commands (same as handleSendMessage)
      const openTabMatch = prompt.match(/open\s+(?:tab\s+for\s+)?(?:the\s+)?(?:url\s+)?(https?:\/\/[^\s]+)/i);
      if (openTabMatch) {
        const url = openTabMatch[1];
        const tab = await chrome.tabs.create({ url });
        const response = `I've opened a new tab with the URL: ${url}`;
        conversation.push({ role: 'assistant', content: response });
        await this.stateManager.saveConversation(conversationId, conversation);
        chrome.runtime.sendMessage({
          type: 'STREAM_COMPLETE',
          tabId: tabId,
          response: response
        }).catch(() => {});
        sendResponse({ streaming: false, response });
        return;
      }

      const listTabsMatch = prompt.match(/list\s+(?:all\s+)?tabs|show\s+(?:all\s+)?tabs|what\s+tabs/i);
      if (listTabsMatch) {
        const tabs = await chrome.tabs.query({});
        const tabList = tabs.map((tab, index) => `${index + 1}. ${tab.title} - ${tab.url}`).join('\n');
        const response = `Here are your open tabs:\n\n${tabList}`;
        conversation.push({ role: 'assistant', content: response });
        await this.stateManager.saveConversation(conversationId, conversation);
        chrome.runtime.sendMessage({
          type: 'STREAM_COMPLETE',
          tabId: tabId,
          response: response
        }).catch(() => {});
        sendResponse({ streaming: false, response });
        return;
      }

      const checkTabMatch = prompt.match(/check\s+(?:tab|page)\s+(\d+)|what's\s+in\s+tab\s+(\d+)/i);
      if (checkTabMatch) {
        const tabNum = parseInt(checkTabMatch[1] || checkTabMatch[2]);
        const tabs = await chrome.tabs.query({});
        if (tabNum > 0 && tabNum <= tabs.length) {
          const targetTab = tabs[tabNum - 1];
          let content = `Tab ${tabNum}: ${targetTab.title}\nURL: ${targetTab.url}`;
          try {
            const tabContent = await chrome.tabs.sendMessage(targetTab.id, { type: 'GET_CONTEXT' });
            if (tabContent && tabContent.context) {
              content += `\n\nContent preview available.`;
            }
          } catch (e) {
            // Content script not available
          }
          const response = content;
          conversation.push({ role: 'assistant', content: response });
          await this.stateManager.saveConversation(conversationId, conversation);
          chrome.runtime.sendMessage({
            type: 'STREAM_COMPLETE',
            tabId: tabId,
            response: response
          }).catch(() => {});
          sendResponse({ streaming: false, response });
          return;
        }
      }
      
      // Format prompt with context if available
      let finalPrompt = prompt;
      let imageData = null;

      if (context && tabId) {
        // Enhanced visual question detection
        const visualKeywords = /look|see|image|screenshot|visual|picture|screen|chart|graph|diagram|what.*show|describe.*appearance|how.*look/i;
        const isVisualQuestion = visualKeywords.test(prompt);
        
        if (isVisualQuestion) {
          try {
            const dataUrl = await chrome.tabs.captureVisibleTab(null, { 
              format: 'png',
              quality: 90 
            });
            imageData = dataUrl;
          } catch (e) {
            console.warn('Screenshot capture failed during streaming', e);
            // Continue without screenshot
          }
        }

        // Format context using ContextProcessor
        // Only add context if it's meaningful (not just "Unknown" or "Untitled")
        if (context.url && context.url !== 'Unknown' && context.title && context.title !== 'Untitled') {
          try {
            const formatted = ContextProcessor.createQuestionPrompt(prompt, context);
            finalPrompt = formatted;
          } catch (e) {
            console.warn('Context formatting failed during streaming, using prompt without context:', e);
            // Fallback to original prompt if formatting fails
          }
        }
        // If context is empty/unknown, just use the original prompt
      }
      
      // Stream response with user's preferred model
      let fullResponse = '';
      await this.apiClient.streamResponse(
        finalPrompt,
        imageData,
        (chunk) => {
          // Send each chunk to UI
          fullResponse += chunk;
          chrome.runtime.sendMessage({
            type: 'STREAM_CHUNK',
            tabId: tabId,
            chunk: chunk,
            fullText: fullResponse
          }).catch(() => {}); // Ignore errors if no listeners
        },
        (complete) => {
          // Save complete response
          conversation.push({ role: 'assistant', content: complete });
          this.stateManager.saveConversation(conversationId, conversation);

          // Send completion message
          chrome.runtime.sendMessage({
            type: 'STREAM_COMPLETE',
            tabId: tabId,
            response: complete
          }).catch(() => {});
        },
        model
      );
      
      sendResponse({ streaming: true });
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
    // Use 'popup' as conversation ID if no tabId (for popup without tab context)
    const conversationId = tabId || 'popup';
    
    const conversation = await this.stateManager.getConversation(conversationId);
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
  
  async handleDetectTasks(text, sendResponse) {
    try {
      const tasks = TaskDetector.extractTasks(text);
      sendResponse({ tasks });
    } catch (error) {
      sendResponse({ tasks: [], error: error.message });
    }
  }
  
  async handleExecuteAction(data, sendResponse) {
    try {
      const result = await this.integrationManager.executeAction(data.action, data.params);
      sendResponse({ success: true, result });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  
  async handleGetIntegrations(sendResponse) {
    try {
      const connected = await this.integrationManager.getConnectedIntegrations();
      sendResponse({ integrations: connected });
    } catch (error) {
      sendResponse({ integrations: [], error: error.message });
    }
  }

  async handleOpenTab(data, sendResponse) {
    try {
      const { url } = data;
      if (!url) {
        sendResponse({ error: 'URL is required' });
        return;
      }
      
      const tab = await chrome.tabs.create({ url });
      sendResponse({ success: true, tabId: tab.id });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }

  async handleGetAllTabs(sendResponse) {
    try {
      const tabs = await chrome.tabs.query({});
      const tabInfo = tabs.map(tab => ({
        id: tab.id,
        title: tab.title,
        url: tab.url,
        active: tab.active
      }));
      sendResponse({ tabs: tabInfo });
    } catch (error) {
      sendResponse({ tabs: [], error: error.message });
    }
  }

  async handleGetTabContent(data, sendResponse) {
    try {
      const { tabId } = data;
      if (!tabId) {
        sendResponse({ error: 'Tab ID is required' });
        return;
      }
      
      // Get tab info
      const tab = await chrome.tabs.get(tabId);
      
      // Try to get content from the tab
      let content = null;
      try {
        const response = await chrome.tabs.sendMessage(tabId, { type: 'GET_CONTEXT' });
        if (response && response.context) {
          content = response.context;
        }
      } catch (e) {
        // Content script might not be available
        console.log('Could not get tab content:', e);
      }
      
      sendResponse({
        tab: {
          id: tab.id,
          title: tab.title,
          url: tab.url
        },
        content: content
      });
    } catch (error) {
      sendResponse({ error: error.message });
    }
  }
}