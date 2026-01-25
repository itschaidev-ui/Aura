// src/utils/config.js
export async function getFirebaseConfig() {
  // Try to get from chrome.storage.local first
  const stored = await chrome.storage.local.get('firebaseConfig');
  if (stored.firebaseConfig && stored.firebaseConfig.apiKey) {
    return stored.firebaseConfig;
  }
  
  // Return null if no config found - Firebase is optional
  return null;
}

export async function getOpenAIConfig() {
  const stored = await chrome.storage.local.get(['openaiApiKey']);
  
  return {
    apiKey: stored.openaiApiKey || null
  };
}

export async function getGoogleCloudConfig() {
  const stored = await chrome.storage.local.get(['googleCloudApiKey', 'googleCloudProjectId']);
  
  return {
    apiKey: stored.googleCloudApiKey || null,
    projectId: stored.googleCloudProjectId || null
  };
}