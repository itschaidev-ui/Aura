// src/ui/settings/settings.js
class Settings {
  constructor() {
    this.init();
  }

  async init() {
    await this.loadSettings();
    this.setupEventListeners();
    await this.checkIntegrationStatus();
  }

  async loadSettings() {
    const config = await chrome.storage.local.get([
      'openaiApiKey',
      'geminiApiKey',
      'preferredAIProvider',
      'slackToken',
      'githubToken',
      'notionApiKey',
      'geminiKeyLocked'
    ]);

    // Set AI provider dropdown
    const providerSelect = document.getElementById('ai-provider');
    if (providerSelect) {
      providerSelect.value = config.preferredAIProvider || 'gemini';
    }

    // Load OpenAI key (if set, show masked version)
    const openaiInput = document.getElementById('openai-key');
    if (openaiInput && config.openaiApiKey) {
      openaiInput.value = '••••••••' + config.openaiApiKey.slice(-4);
      openaiInput.dataset.hasValue = 'true';
    }

    // Load integration tokens (masked)
    if (config.slackToken) {
      const slackInput = document.getElementById('slack-token');
      if (slackInput) {
        slackInput.value = '••••••••' + config.slackToken.slice(-4);
        slackInput.dataset.hasValue = 'true';
      }
    }

    if (config.githubToken) {
      const githubInput = document.getElementById('github-token');
      if (githubInput) {
        githubInput.value = '••••••••' + config.githubToken.slice(-4);
        githubInput.dataset.hasValue = 'true';
      }
    }

    if (config.notionApiKey) {
      const notionInput = document.getElementById('notion-key');
      if (notionInput) {
        notionInput.value = '••••••••' + config.notionApiKey.slice(-4);
        notionInput.dataset.hasValue = 'true';
      }
    }

    // Show that Gemini is locked
    if (config.geminiKeyLocked) {
      const hint = document.querySelector('.setting-hint');
      if (hint) {
        hint.textContent = 'Gemini API key is pre-configured and locked for security.';
        hint.style.color = '#10b981';
      }
    }
  }

  setupEventListeners() {
    // AI Provider
    const providerSelect = document.getElementById('ai-provider');
    if (providerSelect) {
      providerSelect.addEventListener('change', (e) => {
        this.saveAIProvider(e.target.value);
      });
    }

    // OpenAI Key
    const saveOpenAI = document.getElementById('save-openai');
    if (saveOpenAI) {
      saveOpenAI.addEventListener('click', () => this.saveOpenAIKey());
    }

    // Slack
    const connectSlack = document.getElementById('connect-slack');
    const disconnectSlack = document.getElementById('disconnect-slack');
    const saveSlackToken = document.getElementById('save-slack-token');

    if (connectSlack) {
      connectSlack.addEventListener('click', () => this.showSlackConfig());
    }
    if (disconnectSlack) {
      disconnectSlack.addEventListener('click', () => this.disconnectSlack());
    }
    if (saveSlackToken) {
      saveSlackToken.addEventListener('click', () => this.saveSlackToken());
    }

    // GitHub
    const saveGitHub = document.getElementById('save-github');
    if (saveGitHub) {
      saveGitHub.addEventListener('click', () => this.saveGitHubToken());
    }

    // Notion
    const saveNotion = document.getElementById('save-notion');
    if (saveNotion) {
      saveNotion.addEventListener('click', () => this.saveNotionKey());
    }
  }

  async saveAIProvider(provider) {
    await chrome.storage.local.set({ preferredAIProvider: provider });
    this.showStatus('AI provider updated to ' + (provider === 'gemini' ? 'Gemini' : 'OpenAI'), 'success');
  }

  async saveOpenAIKey() {
    const input = document.getElementById('openai-key');
    let key = input.value.trim();

    // If it's a masked value, don't update
    if (input.dataset.hasValue === 'true' && key.startsWith('••••')) {
      this.showStatus('Key already saved. Enter a new key to update.', 'error');
      return;
    }

    if (!key || !key.startsWith('sk-')) {
      this.showStatus('Invalid OpenAI API key. Keys should start with "sk-"', 'error');
      return;
    }

    await chrome.storage.local.set({ openaiApiKey: key });
    input.value = '••••••••' + key.slice(-4);
    input.dataset.hasValue = 'true';
    this.showStatus('OpenAI API key saved successfully!', 'success');
  }

  showSlackConfig() {
    const config = document.getElementById('slack-config');
    const connectBtn = document.getElementById('connect-slack');
    if (config) {
      config.style.display = 'block';
      if (connectBtn) connectBtn.style.display = 'none';
    }
  }

  async saveSlackToken() {
    const input = document.getElementById('slack-token');
    let token = input.value.trim();

    // If it's a masked value, don't update
    if (input.dataset.hasValue === 'true' && token.startsWith('••••')) {
      this.showStatus('Token already saved. Enter a new token to update.', 'error');
      return;
    }

    if (!token || !token.startsWith('xoxb-')) {
      this.showStatus('Invalid Slack bot token. Tokens should start with "xoxb-"', 'error');
      return;
    }

    await chrome.storage.local.set({ slackToken: token });
    input.value = '••••••••' + token.slice(-4);
    input.dataset.hasValue = 'true';
    this.showStatus('Slack token saved successfully!', 'success');
    await this.checkIntegrationStatus();
  }

  async disconnectSlack() {
    await chrome.storage.local.remove('slackToken');
    const input = document.getElementById('slack-token');
    if (input) {
      input.value = '';
      input.dataset.hasValue = 'false';
    }
    const config = document.getElementById('slack-config');
    const connectBtn = document.getElementById('connect-slack');
    const disconnectBtn = document.getElementById('disconnect-slack');
    if (config) config.style.display = 'none';
    if (connectBtn) connectBtn.style.display = 'block';
    if (disconnectBtn) disconnectBtn.style.display = 'none';
    this.showStatus('Slack disconnected', 'success');
    await this.checkIntegrationStatus();
  }

  async saveGitHubToken() {
    const input = document.getElementById('github-token');
    let token = input.value.trim();

    if (input.dataset.hasValue === 'true' && token.startsWith('••••')) {
      this.showStatus('Token already saved. Enter a new token to update.', 'error');
      return;
    }

    if (!token || (!token.startsWith('ghp_') && !token.startsWith('github_pat_'))) {
      this.showStatus('Invalid GitHub token. Tokens should start with "ghp_" or "github_pat_"', 'error');
      return;
    }

    await chrome.storage.local.set({ githubToken: token });
    input.value = '••••••••' + token.slice(-4);
    input.dataset.hasValue = 'true';
    this.showStatus('GitHub token saved successfully!', 'success');
    await this.checkIntegrationStatus();
  }

  async saveNotionKey() {
    const input = document.getElementById('notion-key');
    let key = input.value.trim();

    if (input.dataset.hasValue === 'true' && key.startsWith('••••')) {
      this.showStatus('Key already saved. Enter a new key to update.', 'error');
      return;
    }

    if (!key || !key.startsWith('secret_')) {
      this.showStatus('Invalid Notion API key. Keys should start with "secret_"', 'error');
      return;
    }

    await chrome.storage.local.set({ notionApiKey: key });
    input.value = '••••••••' + key.slice(-4);
    input.dataset.hasValue = 'true';
    this.showStatus('Notion API key saved successfully!', 'success');
    await this.checkIntegrationStatus();
  }

  async checkIntegrationStatus() {
    const config = await chrome.storage.local.get(['slackToken', 'githubToken', 'notionApiKey']);

    // Update Slack status
    const slackStatus = document.getElementById('slack-status');
    const slackDisconnect = document.getElementById('disconnect-slack');
    const slackConnect = document.getElementById('connect-slack');
    if (slackStatus) {
      if (config.slackToken) {
        slackStatus.innerHTML = '<span class="status-badge connected">Connected</span>';
        if (slackDisconnect) slackDisconnect.style.display = 'block';
        if (slackConnect) slackConnect.style.display = 'none';
      } else {
        slackStatus.innerHTML = '<span class="status-badge disconnected">Not Connected</span>';
        if (slackDisconnect) slackDisconnect.style.display = 'none';
        if (slackConnect) slackConnect.style.display = 'block';
      }
    }

    // Update GitHub status
    const githubStatus = document.getElementById('github-status');
    if (githubStatus) {
      if (config.githubToken) {
        githubStatus.innerHTML = '<span class="status-badge connected">Connected</span>';
      } else {
        githubStatus.innerHTML = '<span class="status-badge disconnected">Not Connected</span>';
      }
    }

    // Update Notion status
    const notionStatus = document.getElementById('notion-status');
    if (notionStatus) {
      if (config.notionApiKey) {
        notionStatus.innerHTML = '<span class="status-badge connected">Connected</span>';
      } else {
        notionStatus.innerHTML = '<span class="status-badge disconnected">Not Connected</span>';
      }
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('status-message');
    if (statusEl) {
      statusEl.textContent = message;
      statusEl.className = `status-message ${type}`;
      statusEl.style.display = 'block';
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    }
  }
}

// Initialize
new Settings();