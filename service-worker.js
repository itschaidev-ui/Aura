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
  
  // Set Gemini API key securely (hardcoded, not exposed in UI)
  // This key is set on install and cannot be changed via UI
  const GEMINI_API_KEY = 'AIzaSyBmsWHC6CJNyj3r6nFINJnlNpnhWNnTuzI';
  
  // Check if key already exists (don't overwrite on updates)
  chrome.storage.local.get(['geminiApiKey'], (result) => {
    if (!result.geminiApiKey) {
      // Only set on first install
      chrome.storage.local.set({
        geminiApiKey: GEMINI_API_KEY,
        preferredAIProvider: 'gemini',
        geminiKeyLocked: true // Flag to prevent UI from showing/changing it
      });
    } else {
      // On update, ensure provider is set
      chrome.storage.local.set({
        preferredAIProvider: 'gemini'
      });
    }
  });
  
  // Set default OpenAI key (null)
  chrome.storage.local.set({
    openaiApiKey: null
  });
});

// Action button click - open floating UI or side panel
chrome.action.onClicked.addListener((tab) => {
  // Open side panel directly (this is a user gesture, so it's allowed)
  // This provides a fallback if content script isn't ready
  if (chrome.sidePanel && chrome.sidePanel.open) {
    try {
      chrome.sidePanel.open({ windowId: tab.windowId });
    } catch (error) {
      console.warn('Failed to open side panel:', error);
    }
  }
  
  // Also try to open floating UI (doesn't require user gesture)
  chrome.tabs.sendMessage(tab.id, { type: 'OPEN_AURA' }).catch(() => {
    // Content script might not be ready - that's OK, side panel is already open
    console.log('Floating UI not available, using side panel');
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