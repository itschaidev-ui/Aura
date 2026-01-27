// src/integrations/slack-oauth-handler.js
// Handles the OAuth redirect page

(async () => {
  try {
    // Get code and state from URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const error = urlParams.get('error');
    
    if (error) {
      throw new Error(`Slack authorization error: ${error}`);
    }
    
    if (!code) {
      throw new Error('No authorization code received from Slack');
    }
    
    // Verify state matches (security check)
    const storedState = (await chrome.storage.local.get('slackOAuthState')).slackOAuthState;
    if (state !== storedState) {
      throw new Error('State mismatch - possible CSRF attack');
    }
    
    // Get extension ID for redirect URI
    const extensionId = chrome.runtime.id;
    const redirectUri = `chrome-extension://${extensionId}/slack-oauth.html`;
    
    // Get client credentials
    const config = await chrome.storage.local.get(['slackClientId', 'slackClientSecret']);
    
    if (!config.slackClientId || !config.slackClientSecret) {
      throw new Error('Slack OAuth credentials not configured');
    }
    
    // Exchange code for token
    // NOTE: In production, this should be done on a backend server
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: config.slackClientId,
        client_secret: config.slackClientSecret,
        code: code,
        redirect_uri: redirectUri
      })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Failed to exchange code for token');
    }
    
    // Get the bot token (preferred) or user token
    const token = data.access_token || data.bot?.bot_access_token;
    const tokenType = data.bot ? 'bot' : 'user';
    
    if (!token) {
      throw new Error('No token received from Slack');
    }
    
    // Send token back to extension
    // Find the opener window (the settings page that opened this popup)
    if (window.opener) {
      window.opener.postMessage({
        type: 'SLACK_OAUTH_SUCCESS',
        token: token,
        tokenType: tokenType,
        team: data.team,
        authed_user: data.authed_user
      }, '*');
    } else {
      // Fallback: send to extension background
      await chrome.runtime.sendMessage({
        type: 'SLACK_OAUTH_SUCCESS',
        token: token,
        tokenType: tokenType
      });
    }
    
    // Show success message
    document.querySelector('.container').innerHTML = `
      <div style="color: #10b981;">
        <h2>✓ Connected to Slack!</h2>
        <p>You can close this window.</p>
      </div>
    `;
    
    // Close window after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
    
  } catch (error) {
    console.error('Slack OAuth error:', error);
    
    // Show error
    const errorEl = document.getElementById('error');
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
    
    // Send error to opener
    if (window.opener) {
      window.opener.postMessage({
        type: 'SLACK_OAUTH_ERROR',
        error: error.message
      }, '*');
    }
    
    // Close after 5 seconds
    setTimeout(() => {
      window.close();
    }, 5000);
  }
})();