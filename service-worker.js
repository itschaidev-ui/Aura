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
  // No API keys needed - using free Hugging Face API
});

// Action button click - popup will open automatically due to default_popup in manifest
// No need to handle this manually anymore
// chrome.action.onClicked.addListener((tab) => {
//   // Popup opens automatically
// });

// Helper functions removed - popup opens automatically from manifest.json

// Message handling
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Route all messages to message handler
  messageHandler.handle(message, sender, sendResponse);
  return true; // Keep channel open for async response
});

// Tab update - maintain state
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    stateManager.updateTabState(tabId, tab.url);
  }
});