// src/integrations/slack-client.js
export class SlackClient {
  constructor() {
    this.token = null;
    this.loadToken();
  }
  
  async loadToken() {
    const config = await chrome.storage.local.get('slackToken');
    this.token = config.slackToken;
  }
  
  async isConnected() {
    await this.loadToken();
    return !!this.token;
  }
  
  async sendMessage(params) {
    await this.loadToken();
    
    if (!this.token) {
      throw new Error('Slack token not configured. Please connect Slack in settings.');
    }
    
    const { channel, text, blocks } = params;
    
    const url = 'https://slack.com/api/chat.postMessage';
    
    const payload = {
      channel,
      text,
      ...(blocks && { blocks })
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
    }
    
    return data;
  }
  
  async getChannels() {
    await this.loadToken();
    
    if (!this.token) {
      return [];
    }
    
    const response = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel', {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.ok) {
      return [];
    }
    
    return data.channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      is_private: channel.is_private
    }));
  }
}