// src/integrations/github-client.js
export class GitHubClient {
  constructor() {
    this.token = null;
    this.loadToken();
  }
  
  async loadToken() {
    const config = await chrome.storage.local.get('githubToken');
    this.token = config.githubToken;
  }
  
  async isConnected() {
    await this.loadToken();
    return !!this.token;
  }
  
  async createIssue(params) {
    await this.loadToken();
    
    if (!this.token) {
      throw new Error('GitHub token not configured. Please connect GitHub in settings.');
    }
    
    const { repo, title, body, labels } = params;
    const [owner, repoName] = repo.split('/');
    
    const url = `https://api.github.com/repos/${owner}/${repoName}/issues`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        labels: labels || []
      })
    });
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`GitHub API error: ${response.status} - ${error.message || response.statusText}`);
    }
    
    return await response.json();
  }
  
  async getRepos() {
    await this.loadToken();
    
    if (!this.token) {
      return [];
    }
    
    const response = await fetch('https://api.github.com/user/repos?per_page=100', {
      headers: {
        'Authorization': `token ${this.token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    
    if (!response.ok) {
      return [];
    }
    
    const repos = await response.json();
    return repos.map(repo => ({
      full_name: repo.full_name,
      name: repo.name,
      private: repo.private
    }));
  }
}