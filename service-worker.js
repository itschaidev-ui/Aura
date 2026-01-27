// service-worker.js
import { StateManager } from './src/background/state-manager.js';
import { MessageHandler } from './src/background/message-handler.js';
import { ApiClient } from './src/background/api-client.js';

// Initialize managers
// Firebase is optional - pass null for db if not configured
const stateManager = new StateManager(null);
const apiClient = new ApiClient();
const messageHandler = new MessageHandler(stateManager, apiClient);

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('Aura extension installed');
  // Set default settings
  chrome.storage.local.set({
    openaiApiKey: null
  });
});

// Action button click - try floating UI first, fallback to side panel
chrome.action.onClicked.addListener((tab) => {
  // Try to open floating UI (preferred method)
  chrome.tabs.sendMessage(tab.id, { type: 'OPEN_AURA' }).catch(() => {
    // If content script isn't ready, open side panel as fallback
    // This is OK because action.onClicked IS a user gesture
    // Call it synchronously to preserve user gesture context
    if (chrome.sidePanel && chrome.sidePanel.open) {
      try {
        chrome.sidePanel.open({ windowId: tab.windowId });
      } catch (error) {
        console.warn('Failed to open side panel:', error);
      }
    }
  });
});

// Helper function to open side panel
// NOTE: This can ONLY be called in response to a user gesture (like action.onClicked)
function openSidePanel(windowId) {
  if (chrome.sidePanel && chrome.sidePanel.open) {
    try {
      chrome.sidePanel.open({ windowId });
    } catch (error) {
      console.warn('Failed to open side panel:', error);
    }
  } else {
    console.warn('Side Panel API not available');
  }
}

// Helper function to open floating UI
// This sends a message to content script, which doesn't require user gesture
function openFloatingUI(tabId) {
  chrome.tabs.sendMessage(tabId, { type: 'OPEN_AURA' }).catch((error) => {
    // Content script might not be ready or page doesn't support it
    // Don't try to open side panel here as it requires user gesture
    console.log('Could not open floating UI - content script may not be ready:', error);
  });
}

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle side panel opening - REMOVED because it requires user gesture
  // Side panel should only be opened from action.onClicked or other user gestures
  // if (message.type === 'OPEN_SIDE_PANEL') {
  //   const windowId = sender.tab ? sender.tab.windowId : undefined;
  //   openSidePanel(windowId); // This would fail - not a user gesture
  //   sendResponse({ success: true });
  //   return true;
  // }
  
  // Handle floating UI opening - this is OK, doesn't require user gesture
  if (message.type === 'OPEN_AURA' && sender.tab) {
    // Just acknowledge - the content script will handle opening the UI
    sendResponse({ success: true });
    return true;
  }
  
  // Route other messages to message handler
  messageHandler.handle(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

// Tab update - maintain state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    stateManager.updateTabState(tabId, tab.url);
  }
});