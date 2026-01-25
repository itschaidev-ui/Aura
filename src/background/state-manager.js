// src/background/state-manager.js
export class StateManager {
  constructor(db) {
    this.db = db;
    this.tabStates = new Map();
    this.conversations = new Map();
  }

  async updateTabState(tabId, url) {
    this.tabStates.set(tabId, {
      url,
      timestamp: Date.now()
    });
    
    // Persist to Firestore if db is available
    if (this.db) {
      // Save to Firestore (async, non-blocking)
      // We'll implement this later to avoid errors if Firestore isn't fully configured
      // console.log('Syncing tab state to Firestore:', tabId, url);
    }
  }

  getTabState(tabId) {
    return this.tabStates.get(tabId) || null;
  }

  async saveConversation(tabId, messages) {
    this.conversations.set(tabId, messages);
    
    // Persist to chrome.storage
    // We use a prefix to avoid collisions with other settings
    const key = `conversation_${tabId}`;
    await chrome.storage.local.set({
      [key]: messages
    });
  }

  async getConversation(tabId) {
    // First check memory cache
    if (this.conversations.has(tabId)) {
      return this.conversations.get(tabId);
    }

    // Then check storage
    const key = `conversation_${tabId}`;
    const stored = await chrome.storage.local.get(key);
    const messages = stored[key] || [];
    
    // Update cache
    this.conversations.set(tabId, messages);
    
    return messages;
  }

  async clearConversation(tabId) {
    this.conversations.delete(tabId);
    const key = `conversation_${tabId}`;
    await chrome.storage.local.remove(key);
  }
  
  async getAllConversations() {
    // Helper to get all stored conversations (useful for debugging or history view)
    const allData = await chrome.storage.local.get(null);
    const conversations = {};
    
    for (const [key, value] of Object.entries(allData)) {
      if (key.startsWith('conversation_')) {
        const id = key.replace('conversation_', '');
        conversations[id] = value;
      }
    }
    
    return conversations;
  }
}