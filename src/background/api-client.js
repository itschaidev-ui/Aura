// src/background/api-client.js
export class ApiClient {
  constructor() {
    this.apiKey = null;
    this.loadConfig();
  }

  async loadConfig() {
    const config = await chrome.storage.local.get(['openaiApiKey']);
    this.apiKey = config.openaiApiKey;
  }

  async callOpenAIAPI(prompt, imageData = null) {
    // Reload config to ensure we have the latest key
    await this.loadConfig();

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please set it in the extension settings.');
    }

    // OpenAI API endpoint
    const url = 'https://api.openai.com/v1/chat/completions';
    
    // Build messages array
    const messages = [
      {
        role: 'system',
        content: 'You are Aura, an AI assistant that helps users understand and interact with web content. You can see and analyze web pages to answer questions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const payload = {
      model: imageData ? 'gpt-4-vision-preview' : 'gpt-4',
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7
    };

    // Add image if provided (for vision models)
    if (imageData && messages[1].content) {
      messages[1].content = [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: imageData // OpenAI expects data URL format
          }
        }
      ];
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from API');
      }

      const choice = data.choices[0];
      if (choice.finish_reason && choice.finish_reason !== 'stop') {
        console.warn(`Response finished with reason: ${choice.finish_reason}`);
      }

      if (!choice.message || !choice.message.content) {
        throw new Error('Empty content in API response');
      }

      return choice.message.content;
    } catch (error) {
      console.error('OpenAI API call failed:', error);
      throw error;
    }
  }

  async streamResponse(prompt, imageData, onChunk, onComplete) {
    // Reload config to ensure we have the latest key
    await this.loadConfig();

    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured. Please set it in the extension settings.');
    }

    const url = 'https://api.openai.com/v1/chat/completions';
    
    const messages = [
      {
        role: 'system',
        content: 'You are Aura, an AI assistant that helps users understand and interact with web content. You can see and analyze web pages to answer questions.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    // Add image if provided
    if (imageData && messages[1].content) {
      messages[1].content = [
        { type: 'text', text: prompt },
        {
          type: 'image_url',
          image_url: {
            url: imageData
          }
        }
      ];
    }

    const payload = {
      model: imageData ? 'gpt-4-vision-preview' : 'gpt-4',
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
      stream: true // Enable streaming
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`OpenAI API error: ${response.status} - ${errorMessage}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              if (onComplete) onComplete(fullResponse);
              return fullResponse;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      if (onComplete) onComplete(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error('OpenAI streaming failed:', error);
      throw error;
    }
  }
}