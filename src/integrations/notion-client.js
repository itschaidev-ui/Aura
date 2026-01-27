// src/integrations/notion-client.js
export class NotionClient {
  constructor() {
    this.apiKey = null;
    this.loadApiKey();
  }
  
  async loadApiKey() {
    const config = await chrome.storage.local.get('notionApiKey');
    this.apiKey = config.notionApiKey;
  }
  
  async isConnected() {
    await this.loadApiKey();
    return !!this.apiKey;
  }
  
  async createPage(params) {
    await this.loadApiKey();
    
    if (!this.apiKey) {
      throw new Error('Notion API key not configured. Please connect Notion in settings.');
    }
    
    const { databaseId, title, content } = params;
    
    const url = 'https://api.notion.com/v1/pages';
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28'
      },
      body: JSON.stringify({
        parent: {
          database_id: databaseId
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title
                }
              }
            ]
          }
        },
        children: content ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content
                  }
                }
              ]
            }
          }
        ] : []
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Notion API error: ${response.status} - ${error.message || response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getDatabases() {
    await this.loadApiKey();
    
    if (!this.apiKey) {
      return [];
    }
    
    // Notion API doesn't have a simple "list all databases" endpoint
    // Users need to share database IDs with the integration
    return [];
  }
}