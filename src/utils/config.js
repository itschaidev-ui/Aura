// src/utils/config.js
export function getFirebaseConfig() {
  // Try to get from environment variables (during build)
  // Note: These will be undefined in the browser unless replaced by a bundler
  // For a raw extension without a bundler, we rely on the user providing these
  // or hardcoding them for development (not recommended for public repos)
  
  const envConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };

  // Check if we have valid environment config
  if (envConfig.apiKey && !envConfig.apiKey.startsWith('your-')) {
    return envConfig;
  }
  
  // Return null if no config found - the service worker will handle this
  // by waiting for the user to input config in settings
  return null;
}

export async function getGoogleCloudConfig() {
  const stored = await chrome.storage.local.get(['googleCloudApiKey', 'googleCloudProjectId']);
  
  return {
    apiKey: stored.googleCloudApiKey || process.env.GOOGLE_CLOUD_API_KEY,
    projectId: stored.googleCloudProjectId || process.env.GOOGLE_CLOUD_PROJECT_ID
  };
}