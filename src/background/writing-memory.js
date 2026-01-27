// src/background/writing-memory.js
export class WritingMemory {
  static async getPreferences() {
    const stored = await chrome.storage.local.get('writingPreferences');
    return stored.writingPreferences || {
      tone: 'professional',
      length: 'medium',
      format: 'paragraph',
      style: null
    };
  }
  
  static async savePreferences(preferences) {
    await chrome.storage.local.set({ writingPreferences: preferences });
  }
  
  static async getDrafts() {
    const stored = await chrome.storage.local.get('writingDrafts');
    return stored.writingDrafts || [];
  }
  
  static async saveDraft(draft) {
    const drafts = await this.getDrafts();
    drafts.push({
      ...draft,
      id: Date.now().toString(),
      createdAt: Date.now()
    });
    await chrome.storage.local.set({ writingDrafts: drafts.slice(-50) }); // Keep last 50
  }
  
  static async deleteDraft(draftId) {
    const drafts = await this.getDrafts();
    const filtered = drafts.filter(d => d.id !== draftId);
    await chrome.storage.local.set({ writingDrafts: filtered });
  }
}