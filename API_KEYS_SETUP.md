# API Keys Setup Guide

This document explains what API keys and credentials you need for the Aura Chrome Extension, which uses Google Cloud services (Firebase backend and Google Cloud APIs).

## Required Google Cloud Setup

### 1. **Google Cloud Project** (Required)
- **Purpose:** Central project that manages all Google Cloud services (Firebase, APIs, etc.)
- **Where to create it:**
  1. Go to https://console.cloud.google.com/
  2. Sign in with your Google account
  3. Click the project dropdown at the top
  4. Click "New Project"
  5. Enter project name (e.g., "Aura Extension")
  6. Select organization (if applicable)
  7. Click "Create"
  8. Note your **Project ID** (you'll need this)

**Cost:** Free tier available. Check https://cloud.google.com/pricing

---

### 2. **Firebase Configuration** (Required for Backend)
- **Purpose:** Backend services (Firestore, Authentication, Functions, etc.)
- **Where to set it up:**
  1. Go to https://console.firebase.google.com/
  2. Click "Add project" or select your existing Google Cloud project
  3. Follow the setup wizard:
     - Enable Google Analytics (optional)
     - Select Analytics account (if enabled)
  4. Once created, click the gear icon ⚙️ → "Project settings"
  5. Scroll down to "Your apps" section
  6. Click the web icon `</>` to add a web app
  7. Register your app (give it a nickname like "Aura Extension")
  8. Copy the **Firebase configuration object**:
     ```javascript
     {
       apiKey: "AIza...",
       authDomain: "your-project.firebaseapp.com",
       projectId: "your-project-id",
       storageBucket: "your-project.appspot.com",
       messagingSenderId: "123456789",
       appId: "1:123456789:web:abc123"
     }
     ```

**Important Firebase Services to Enable:**
- **Firestore Database** (for data storage)
- **Authentication** (for user auth)
- **Cloud Functions** (for serverless backend, if needed)
- **Storage** (for file uploads, if needed)

**Cost:** Free tier (Spark plan) available. Check https://firebase.google.com/pricing

---

### 3. **Google Cloud API Key** (Required for Chrome Extension)
- **Purpose:** Authenticate API calls from the Chrome extension to Google Cloud services
- **Where to get it:**
  1. Go to https://console.cloud.google.com/apis/credentials
  2. Make sure you've selected your project (top dropdown)
  3. Click "Create Credentials" → "API Key"
  4. Copy the generated API key
  5. **IMPORTANT:** Click "Restrict key" to secure it:
     - **Application restrictions:** Select "HTTP referrers (web sites)"
     - Add referrers:
       - `chrome-extension://*/*` (for Chrome extensions)
       - Your specific extension ID (if you have it)
     - **API restrictions:** Select "Restrict key"
     - Enable only the APIs you need:
       - Cloud AI Platform API (if using AI services)
       - Cloud Functions API (if using Cloud Functions)
       - Any other Google APIs your extension uses
  6. Click "Save"

**Security Note:** Always restrict your API keys to prevent unauthorized usage!

---

### 4. **Service Account (Optional - for Server-side Operations)**
- **Purpose:** For backend/server operations that need elevated permissions
- **Where to create it:**
  1. Go to https://console.cloud.google.com/iam-admin/serviceaccounts
  2. Select your project
  3. Click "Create Service Account"
  4. Enter name and description
  5. Click "Create and Continue"
  6. Grant roles (e.g., "Cloud Functions Invoker", "Firestore User")
  7. Click "Continue" → "Done"
  8. Click on the service account you created
  9. Go to "Keys" tab → "Add Key" → "Create new key"
  10. Select JSON format
  11. Download the JSON key file (⚠️ **Keep this secure!**)

**Cost:** Free

---

## Configuration Files Needed

### For Chrome Extension

#### Option 1: Environment Variables (Development)
Create a `.env` file in your project root:

```env
# Google Cloud Project
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Firebase Configuration
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

# Google Cloud API Key (for extension)
GOOGLE_CLOUD_API_KEY=your-api-key-here
```

#### Option 2: Config File (Recommended)
Create a `src/config/firebase-config.js`:

```javascript
// Firebase Configuration
export const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIza...",
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: process.env.FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.FIREBASE_APP_ID || "1:123456789:web:abc123"
};

// Google Cloud API Key
export const GOOGLE_CLOUD_API_KEY = process.env.GOOGLE_CLOUD_API_KEY || "your-api-key-here";
export const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || "your-project-id";
```

**⚠️ Important:** Never commit actual keys to git! Use environment variables or `chrome.storage.local` for production.

---

### For Backend (Firebase Functions/Server)

If you have a backend server or Firebase Cloud Functions:

1. Create a `.env` file in your backend directory:
```env
GOOGLE_CLOUD_PROJECT_ID=your-project-id
FIREBASE_PROJECT_ID=your-project-id
```

2. For service account authentication, use the downloaded JSON key file:
   - Store it securely (not in git)
   - Reference it in your code:
   ```javascript
   const serviceAccount = require('./path/to/service-account-key.json');
   ```

---

## Setting Up Firebase Services

### Enable Firestore Database
1. Go to https://console.firebase.google.com/
2. Select your project
3. Click "Firestore Database" in the left menu
4. Click "Create database"
5. Start in **test mode** (for development) or **production mode** (with security rules)
6. Select a location for your database
7. Click "Enable"

### Enable Authentication
1. In Firebase Console, click "Authentication"
2. Click "Get started"
3. Enable sign-in methods you need:
   - Email/Password
   - Google (for OAuth)
   - Other providers as needed

### Enable Required Google Cloud APIs
1. Go to https://console.cloud.google.com/apis/library
2. Enable these APIs for your project:
   - **Cloud AI Platform API** (if using AI/ML services)
   - **Cloud Functions API** (if using Cloud Functions)
   - **Cloud Storage API** (if using Firebase Storage)
   - **Cloud Firestore API** (automatically enabled with Firestore)

---

## How to Configure in Chrome Extension

Since Chrome extensions can't directly read `.env` files, you have options:

### Option 1: Build-time Injection (Development)
1. Create `.env` file with your keys
2. Use a build tool (webpack, vite, etc.) with dotenv plugin
3. Keys are injected at build time
4. ⚠️ **Never commit the built files with keys to git!**

### Option 2: Runtime Configuration (Production - Recommended)
1. Create a settings/options page in your extension
2. Users enter their Firebase config and API keys through the UI
3. Store in `chrome.storage.local`:
   ```javascript
   chrome.storage.local.set({
     firebaseConfig: { /* config object */ },
     googleCloudApiKey: "your-key"
   });
   ```
4. Extension reads from storage when making API calls

### Option 3: Firebase Admin SDK (For Backend Only)
If you have a backend server, use the service account JSON key:
```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
```

---

## Security Best Practices

⚠️ **CRITICAL SECURITY MEASURES:**

### API Key Restrictions
- ✅ **DO:** Restrict API keys to specific HTTP referrers (Chrome extensions)
- ✅ **DO:** Limit API keys to only the APIs you need
- ✅ **DO:** Use different API keys for development and production
- ❌ **DON'T:** Use unrestricted API keys in production

### Firebase Security Rules
- ✅ **DO:** Set up Firestore security rules:
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```
- ✅ **DO:** Restrict access based on user authentication
- ❌ **DON'T:** Leave Firestore in test mode for production

### General Security
- ✅ **DO:** Store sensitive keys in `chrome.storage.local` (encrypted)
- ✅ **DO:** Never commit API keys or service account JSON files to git
- ✅ **DO:** Add `.env` and `*-key.json` to `.gitignore` (already done)
- ✅ **DO:** Use environment variables for different environments
- ❌ **DON'T:** Hardcode keys in source files
- ❌ **DON'T:** Log or expose keys in console
- ❌ **DON'T:** Share API keys publicly

---

## Quick Start Checklist

1. ✅ **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create new project
   - Note your Project ID

2. ✅ **Set up Firebase**
   - Go to https://console.firebase.google.com/
   - Add project (or link existing Google Cloud project)
   - Register web app
   - Copy Firebase config object
   - Enable Firestore Database
   - Enable Authentication

3. ✅ **Create API Key**
   - Go to https://console.cloud.google.com/apis/credentials
   - Create API key
   - **Restrict it** (HTTP referrers + API restrictions)

4. ✅ **Enable Required APIs**
   - Go to https://console.cloud.google.com/apis/library
   - Enable Cloud AI Platform API, Cloud Functions API, etc.

5. ✅ **Configure Extension**
   - Create `.env` file (for development)
   - Or create settings page (for production)
   - Store Firebase config and API key

6. ✅ **Test Configuration**
   - Test Firebase connection
   - Test API key with a simple request
   - Verify security rules are working

---

## Testing Your Setup

### Test Firebase Connection
```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
console.log('Firebase connected!');
```

### Test Google Cloud API Key
```javascript
const response = await fetch(
  `https://aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/models`,
  {
    headers: {
      'Authorization': `Bearer ${apiKey}`
    }
  }
);
```

---

## Need Help?

- **Google Cloud Console:** https://console.cloud.google.com/
- **Firebase Console:** https://console.firebase.google.com/
- **Firebase Docs:** https://firebase.google.com/docs
- **Google Cloud API Docs:** https://cloud.google.com/apis/docs
- **Chrome Extension Storage:** https://developer.chrome.com/docs/extensions/reference/storage/

---

## Troubleshooting

### "API key not valid" error
- Check that API key restrictions allow Chrome extensions
- Verify the API is enabled in Google Cloud Console
- Ensure you're using the correct project

### "Firebase: Error (auth/configuration-not-found)"
- Verify Firebase config object is correct
- Check that Firebase is enabled in your project
- Ensure you've registered a web app in Firebase Console

### "Permission denied" in Firestore
- Check Firestore security rules
- Verify user is authenticated (if rules require auth)
- Test rules in Firebase Console

---

## Next Steps

1. ✅ Complete the setup checklist above
2. ✅ Create configuration files for your extension
3. ✅ Implement Firebase initialization in your code
4. ✅ Set up API key usage in service worker
5. ✅ Test all connections
6. ✅ Set up proper security rules
7. ✅ Never commit keys to version control
