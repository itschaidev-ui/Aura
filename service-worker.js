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

// Action button click - open side panel
chrome.action.onClicked.addListener((tab) => {
  // Check if sidePanel API is available (Chrome 114+)
  if (chrome.sidePanel && chrome.sidePanel.open) {
    chrome.sidePanel.open({ windowId: tab.windowId });
  } else {
    console.warn('Side Panel API not available');
  }
});

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  messageHandler.handle(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

// Tab update - maintain state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    stateManager.updateTabState(tabId, tab.url);
  }
});