# Slack Integration Setup Guide

## Overview

This guide explains how to set up Slack OAuth for the Aura Chrome Extension. Once configured, users can send messages, create channels, and interact with Slack directly from Aura.

## How Slack OAuth Works

### The OAuth Flow (Step-by-Step)

1. **User clicks "Connect Slack"** in Aura settings
2. **Aura opens a popup window** with Slack's OAuth authorization page
3. **User authorizes** the app on Slack's website
4. **Slack redirects back** to our redirect URL with an authorization code
5. **Aura exchanges the code** for an access token (server-side or client-side)
6. **Token is stored** securely in `chrome.storage.local`
7. **Aura can now make API calls** to Slack using the token

### Important Concepts

**OAuth 2.0 Flow:**
```
User → Aura → Slack Authorization Page → User Authorizes → 
Slack Redirects with Code → Aura Exchanges Code for Token → 
Token Stored → Aura Can Use Slack API
```

**Token Types:**
- **Bot Token (xoxb-...)**: For bot actions (recommended for extensions)
- **User Token (xoxp-...)**: For user actions (requires more permissions)
- **App Token (xapp-...)**: For socket mode (not needed for web API)

## Step 1: Configure Your Slack App

### 1.1 Basic Information

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Name your app: `Aura Chrome Extension`
4. Select your workspace
5. Click **"Create App"**

### 1.2 OAuth & Permissions

1. In your app settings, go to **"OAuth & Permissions"** (left sidebar)
2. Scroll to **"Redirect URLs"**
3. Add redirect URL: `https://your-domain.com/slack-oauth` (or use a localhost for testing)
   - **For Chrome Extensions**, we'll use a special redirect handler
   - Add: `chrome-extension://YOUR_EXTENSION_ID/slack-oauth.html`
   - You'll get your extension ID after loading the extension

### 1.3 Bot Token Scopes (Required Permissions)

In **"OAuth & Permissions"** → **"Scopes"** → **"Bot Token Scopes"**, add:

**Essential Scopes:**
- `chat:write` - Send messages
- `channels:read` - List public channels
- `groups:read` - List private channels
- `im:read` - List direct messages
- `im:write` - Send direct messages
- `users:read` - Get user info

**Optional (for advanced features):**
- `channels:history` - Read channel history
- `files:write` - Upload files
- `reactions:write` - Add reactions

### 1.4 Install App to Workspace

1. Go to **"OAuth & Permissions"**
2. Click **"Install to Workspace"** (top of page)
3. Review permissions and click **"Allow"**
4. **Copy the "Bot User OAuth Token"** (starts with `xoxb-`)
   - This is your **temporary token** for testing
   - For production, users will get their own tokens via OAuth

### 1.5 Get Your Credentials

From your app's **"Basic Information"** page, note:
- **Client ID** (under "App Credentials")
- **Client Secret** (under "App Credentials")
- **Bot User OAuth Token** (from OAuth & Permissions, for testing)

## Step 2: Implementation in Aura

### 2.1 How It Works in the Extension

**For Chrome Extensions, we have two options:**

#### Option A: Direct Token (Simpler, for testing)
- User manually pastes the Bot Token from Slack
- No OAuth flow needed
- Works immediately
- Less secure (user must trust extension)

#### Option B: OAuth Flow (Production-ready)
- Extension opens popup to Slack authorization
- User authorizes
- Extension receives token via redirect
- More secure, proper OAuth flow

### 2.2 The OAuth Flow Implementation

```
┌─────────────┐
│   User      │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Click "Connect Slack"
       ▼
┌─────────────────┐
│  Aura Extension  │
│  (Service Worker)│
└──────┬───────────┘
       │
       │ 2. Open popup window
       │    window.open('https://slack.com/oauth/authorize?...')
       ▼
┌─────────────────┐
│  Slack OAuth     │
│  Authorization  │
│      Page       │
└──────┬───────────┘
       │
       │ 3. User authorizes
       ▼
┌─────────────────┐
│  Redirect to     │
│  slack-oauth.html│
│  (in extension)  │
└──────┬───────────┘
       │
       │ 4. Extract code from URL
       │    ?code=xxx&state=yyy
       ▼
┌─────────────────┐
│  Exchange Code   │
│  for Token       │
│  (via API)       │
└──────┬───────────┘
       │
       │ 5. Store token
       │    chrome.storage.local
       ▼
┌─────────────────┐
│  Token Ready!    │
│  Can use Slack   │
│      API         │
└─────────────────┘
```

### 2.3 Security Considerations

**Why OAuth is Better:**
- User never sees the token
- Token is workspace-specific
- Can be revoked by user
- Follows OAuth 2.0 standards

**Chrome Extension Challenges:**
- No server to exchange code → must do it client-side
- Redirect URL must be extension page
- Need to handle popup communication

## Step 3: Using Slack in Aura

### 3.1 After Connection

Once connected, users can:

1. **Send messages to channels:**
   ```
   "Send this summary to #general"
   ```

2. **Create tasks in Slack:**
   ```
   "Create a task in Slack: Review the PR"
   ```

3. **Get channel list:**
   - Aura can list available channels
   - User can select channel from dropdown

### 3.2 Example Usage

**User asks Aura:**
> "Send a message to #engineering saying 'The deployment is complete'"

**Aura:**
1. Detects Slack action intent
2. Calls `SlackClient.sendMessage()`
3. Sends message to #engineering channel
4. Confirms success to user

## Step 4: Testing

### 4.1 Quick Test (Direct Token)

1. Get Bot Token from Slack app settings
2. In Aura settings, paste token
3. Test by sending a message:
   ```javascript
   // In browser console or Aura
   chrome.runtime.sendMessage({
     type: 'EXECUTE_ACTION',
     data: {
       action: { type: 'send_message', integration: 'slack' },
       params: {
         channel: '#general',
         text: 'Hello from Aura!'
       }
     }
   });
   ```

### 4.2 Full OAuth Test

1. Set up redirect URL in Slack app
2. Click "Connect Slack" in Aura
3. Authorize in popup
4. Token should be saved automatically
5. Test sending messages

## Troubleshooting

### "invalid_auth" Error
- Token expired or invalid
- Re-authenticate via OAuth
- Check token format (should start with `xoxb-`)

### "channel_not_found" Error
- Channel doesn't exist or bot isn't in channel
- Add bot to channel: `/invite @YourBotName`
- Or use channel ID instead of name

### "missing_scope" Error
- App doesn't have required permission
- Add missing scope in Slack app settings
- Reinstall app to workspace

### Redirect URL Issues
- Extension ID changes when reloading
- Update redirect URL in Slack app settings
- Use `chrome.runtime.id` to get current ID

## Next Steps

1. **Implement OAuth flow** (see code files)
2. **Add UI for Slack connection** (settings page)
3. **Test with your workspace**
4. **Add more Slack features** (reactions, files, etc.)

## Code Files to Create/Update

- `src/integrations/slack-oauth.js` - OAuth flow handler
- `src/ui/settings/settings.html` - Settings page UI
- `src/ui/settings/settings.js` - Settings logic
- `slack-oauth.html` - OAuth redirect page
- Update `manifest.json` - Add OAuth redirect page

## Security Best Practices

1. **Never commit tokens** to Git
2. **Use OAuth flow** in production (not direct tokens)
3. **Store tokens securely** in `chrome.storage.local` (encrypted by Chrome)
4. **Validate tokens** before API calls
5. **Handle token expiration** gracefully
6. **Request minimal scopes** (only what you need)

---

**Need Help?**
- Slack API Docs: https://api.slack.com/docs
- OAuth Guide: https://api.slack.com/authentication/oauth-v2
- Chrome Extension OAuth: https://developer.chrome.com/docs/extensions/mv3/identity/