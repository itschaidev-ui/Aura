// src/integrations/integration-manager.js
import { GitHubClient } from './github-client.js';
import { NotionClient } from './notion-client.js';
import { SlackClient } from './slack-client.js';

export class IntegrationManager {
  constructor() {
    this.integrations = {
      github: new GitHubClient(),
      notion: new NotionClient(),
      slack: new SlackClient()
    };
  }
  
  async getConnectedIntegrations() {
    const connected = [];
    for (const [name, client] of Object.entries(this.integrations)) {
      const isConnected = await client.isConnected();
      if (isConnected) {
        connected.push({
          name,
          client,
          displayName: this.getDisplayName(name)
        });
      }
    }
    return connected;
  }
  
  getDisplayName(name) {
    const names = {
      github: 'GitHub',
      notion: 'Notion',
      slack: 'Slack'
    };
    return names[name] || name;
  }
  
  async executeAction(action, params) {
    const { type, integration } = action;
    
    if (!this.integrations[integration]) {
      throw new Error(`Unknown integration: ${integration}`);
    }
    
    const client = this.integrations[integration];
    
    switch (type) {
      case 'create_issue':
        return await client.createIssue(params);
      case 'create_page':
        return await client.createPage(params);
      case 'send_message':
        return await client.sendMessage(params);
      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  }
}