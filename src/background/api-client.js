// src/background/api-client.js
export class ApiClient {
  constructor() {
    this.openaiApiKey = null;
    this.geminiApiKey = null;
    this.preferredProvider = 'openai'; // 'openai' or 'gemini'
    this.loadConfig();
  }

  async loadConfig() {
    const config = await chrome.storage.local.get(['openaiApiKey', 'geminiApiKey', 'preferredAIProvider']);
    this.openaiApiKey = config.openaiApiKey;
    this.geminiApiKey = config.geminiApiKey;
    this.preferredProvider = config.preferredAIProvider || 'openai';
  }
  
  getApiKey() {
    if (this.preferredProvider === 'gemini' && this.geminiApiKey) {
      return { provider: 'gemini', key: this.geminiApiKey };
    }
    return { provider: 'openai', key: this.openaiApiKey };
  }

  async callOpenAIAPI(prompt, imageData = null) {
    // Reload config to ensure we have the latest key
    await this.loadConfig();
    
    const { provider, key } = this.getApiKey();
    
    if (provider === 'gemini') {
      return this.callGeminiAPI(prompt, imageData, key);
    }
    
    return this.callOpenAIAPIInternal(prompt, imageData, key);
  }
  
  async callOpenAIAPIInternal(prompt, imageData = null, apiKey = null) {
    const key = apiKey || this.openaiApiKey;
    
    if (!key) {
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
  
  async callGeminiAPI(prompt, imageData = null, apiKey = null) {
    const key = apiKey || this.geminiApiKey;
    
    if (!key) {
      throw new Error('Gemini API key not configured. Please set it in the extension settings.');
    }
    
    // Use Gemini 1.5 Flash (faster and more reliable)
    // Try v1beta first (more stable), fallback to v1 if needed
    const model = 'gemini-1.5-flash';
    let url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
    
    const parts = [{ text: prompt }];
    
    // Add image if provided (Gemini supports base64 images)
    if (imageData) {
      // Convert data URL to base64
      const base64Data = imageData.split(',')[1] || imageData;
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: base64Data
        }
      });
    }
    
    const payload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000
      }
    };
    
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
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
      }
      
      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response candidates returned from Gemini API');
      }
      
      const candidate = data.candidates[0];
      if (candidate.finishReason && candidate.finishReason !== 'STOP') {
        console.warn(`Response finished with reason: ${candidate.finishReason}`);
      }
      
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Empty content in Gemini API response');
      }
      
      return candidate.content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }

  async streamResponse(prompt, imageData, onChunk, onComplete) {
    // Reload config to ensure we have the latest key
    await this.loadConfig();
    
    const { provider, key } = this.getApiKey();
    
    if (provider === 'gemini') {
      return this.streamGeminiResponse(prompt, imageData, onChunk, onComplete, key);
    }
    
    return this.streamOpenAIResponse(prompt, imageData, onChunk, onComplete, key);
  }
  
  async streamOpenAIResponse(prompt, imageData, onChunk, onComplete, apiKey = null) {
    const key = apiKey || this.openaiApiKey;
    
    if (!key) {
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
  
  async streamGeminiResponse(prompt, imageData, onChunk, onComplete, apiKey = null) {
    const key = apiKey || this.geminiApiKey;
    
    if (!key) {
      throw new Error('Gemini API key not configured. Please set it in the extension settings.');
    }
    
    // Gemini streaming endpoint
    // Use v1beta for streaming (more stable)
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${key}`;
    
    const parts = [{ text: prompt }];
    
    if (imageData) {
      const base64Data = imageData.split(',')[1] || imageData;
      parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: base64Data
        }
      });
    }
    
    const payload = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2000,
        topP: 0.95,
        topK: 40
      }
    };
    
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
        const errorMessage = errorData.error?.message || response.statusText;
        console.error('Gemini API error details:', errorData);
        throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      let buffer = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer
        
        for (const line of lines) {
          if (line.trim()) {
            // Gemini streaming returns JSON objects, not SSE format
            try {
              const data = JSON.parse(line);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullResponse += text;
                onChunk(text);
              }
            } catch (e) {
              // Try SSE format if JSON fails
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    fullResponse += text;
                    onChunk(text);
                  }
                } catch (e2) {
                  // Ignore parse errors
                }
              }
            }
          }
        }
      }
      
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            fullResponse += text;
            onChunk(text);
          }
        } catch (e) {
          // Ignore
        }
      }
      
      if (onComplete) onComplete(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error('Gemini streaming failed:', error);
      throw error;
    }
  }
}