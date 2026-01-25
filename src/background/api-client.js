// src/background/api-client.js
export class ApiClient {
  constructor() {
    this.apiKey = null;
    this.projectId = null;
    this.loadConfig();
  }

  async loadConfig() {
    const config = await chrome.storage.local.get([
      'googleCloudApiKey',
      'googleCloudProjectId'
    ]);
    this.apiKey = config.googleCloudApiKey;
    this.projectId = config.googleCloudProjectId;
  }

  async callGeminiAPI(prompt, imageData = null) {
    // Reload config to ensure we have the latest key
    await this.loadConfig();

    if (!this.apiKey) {
      throw new Error('Google Cloud API key not configured. Please set it in the extension settings.');
    }

    // Use Gemini Pro Vision if image is present, otherwise Gemini Pro
    const model = imageData ? 'gemini-pro-vision' : 'gemini-pro';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
    
    const payload = {
      contents: [{
        parts: [
          { text: prompt }
        ]
      }]
    };

    if (imageData) {
      payload.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: imageData
        }
      });
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response candidates returned from API');
      }

      const candidate = data.candidates[0];
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn(`Response finished with reason: ${candidate.finishReason}`);
      }

      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Empty content in API response');
      }

      return candidate.content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  async streamResponse(prompt, imageData, onChunk) {
    // Implementation for streaming responses (SSE)
    // Will be expanded in Phase 4
    // For now, fall back to non-streaming
    const response = await this.callGeminiAPI(prompt, imageData);
    onChunk(response);
    return response;
  }
}