// src/integrations/slack-oauth.js
// Handles Slack OAuth 2.0 flow for Chrome Extensions

export class SlackOAuth {
  constructor() {
    // Get these from your Slack app settings
    // For now, we'll use a simple approach: direct token input
    // Full OAuth can be added later with a backend or Chrome Identity API
    this.clientId = null;
    this.clientSecret = null;
    this.redirectUri = null;
  }
  
  async init() {
    // Load client ID and secret from storage (set by user in settings)
    const config = await chrome.storage.local.get(['slackClientId', 'slackClientSecret']);
    this.clientId = config.slackClientId;
    this.clientSecret = config.slackClientSecret;
    
    // Get extension ID for redirect URI
    const extensionId = chrome.runtime.id;
    this.redirectUri = `chrome-extension://${extensionId}/slack-oauth.html`;
  }
  
  /**
   * Start OAuth flow - opens Slack authorization page
   * @param {string} state - Random state for security
   */
  async startOAuthFlow(state = null) {
    await this.init();
    
    if (!this.clientId) {
      throw new Error('Slack Client ID not configured. Please set it in settings.');
    }
    
    // Generate state if not provided
    if (!state) {
      state = this.generateState();
      await chrome.storage.local.set({ slackOAuthState: state });
    }
    
    // Build authorization URL
    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('scope', 'chat:write,channels:read,groups:read,im:read,im:write,users:read');
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('state', state);
    
    // Open popup window
    const popup = window.open(
      authUrl.toString(),
      'slack-oauth',
      'width=600,height=700,scrollbars=yes'
    );
    
    return new Promise((resolve, reject) => {
      // Listen for message from popup
      const messageListener = async (event) => {
        if (event.data.type === 'SLACK_OAUTH_SUCCESS') {
          window.removeEventListener('message', messageListener);
          popup.close();
          
          // Store token
          await chrome.storage.local.set({
            slackToken: event.data.token,
            slackTokenType: event.data.tokenType || 'bot'
          });
          
          resolve(event.data.token);
        } else if (event.data.type === 'SLACK_OAUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          popup.close();
          reject(new Error(event.data.error));
        }
      };
      
      window.addEventListener('message', messageListener);
      
      // Timeout after 5 minutes
      setTimeout(() => {
        window.removeEventListener('message', messageListener);
        if (popup && !popup.closed) {
          popup.close();
        }
        reject(new Error('OAuth flow timed out'));
      }, 300000);
    });
  }
  
  /**
   * Exchange authorization code for access token
   * NOTE: This requires a backend in production (client secret must be secret)
   * For now, we'll use a simpler direct token approach
   */
  async exchangeCodeForToken(code) {
    await this.init();
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Slack OAuth credentials not configured');
    }
    
    // WARNING: In production, this should be done on a backend server
    // Client secret should NEVER be exposed in extension code
    // This is for development/testing only
    
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri
      })
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(data.error || 'Failed to exchange code for token');
    }
    
    return {
      token: data.access_token || data.bot?.bot_access_token,
      tokenType: data.token_type || 'bot',
      team: data.team,
      authed_user: data.authed_user
    };
  }
  
  /**
   * Simple method: Direct token input (for testing/quick setup)
   * User pastes Bot Token directly
   */
  async setDirectToken(token) {
    if (!token || !token.startsWith('xoxb-')) {
      throw new Error('Invalid Slack bot token. Token should start with "xoxb-"');
    }
    
    await chrome.storage.local.set({
      slackToken: token,
      slackTokenType: 'bot',
      slackTokenMethod: 'direct' // Track that this was set directly
    });
    
    return true;
  }
  
  /**
   * Verify token is valid by making a test API call
   */
  async verifyToken(token = null) {
    const stored = await chrome.storage.local.get('slackToken');
    const testToken = token || stored.slackToken;
    
    if (!testToken) {
      return { valid: false, error: 'No token provided' };
    }
    
    try {
      const response = await fetch('https://slack.com/api/auth.test', {
        headers: {
          'Authorization': `Bearer ${testToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.ok) {
        return {
          valid: true,
          team: data.team,
          user: data.user,
          userId: data.user_id
        };
      } else {
        return {
          valid: false,
          error: data.error || 'Token validation failed'
        };
      }
    } catch (error) {
      return {
        valid: false,
        error: error.message
      };
    }
  }
  
  /**
   * Generate random state for OAuth security
   */
  generateState() {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
  
  /**
   * Revoke/disconnect Slack
   */
  async disconnect() {
    await chrome.storage.local.remove([
      'slackToken',
      'slackTokenType',
      'slackTokenMethod',
      'slackClientId',
      'slackClientSecret',
      'slackOAuthState'
    ]);
  }
}