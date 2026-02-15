// src/background/api-client.js
export class ApiClient {
  constructor() {
    // Set default API key immediately
    this.openaiApiKey = 'sk-pygqmCP3fElXfjSCy0Bl1oLe01LRBC1EwmNp1eNM6WHDsLwR';
    this.geminiApiKey = null;
    this.preferredProvider = 'chatgpt'; // Only using ChatGPT
    this.loadConfig();
  }

  async loadConfig() {
    const config = await chrome.storage.local.get(['openaiApiKey', 'geminiApiKey', 'preferredAIProvider']);
    // Only override if user has saved a custom key
    if (config.openaiApiKey) {
      this.openaiApiKey = config.openaiApiKey;
    }
    this.geminiApiKey = config.geminiApiKey;
    this.preferredProvider = config.preferredAIProvider || 'chatgpt';
  }

  async callOpenAIAPI(prompt, imageData = null, preferredModel = null) {
    // Reload config to ensure we have the latest keys
    await this.loadConfig();

    // Only use ChatGPT - user requested to remove other models
    if (this.openaiApiKey) {
      try {
        return await this.callChatGPTAPI(prompt, imageData);
      } catch (error) {
        console.log('ChatGPT failed, using fallback:', error);
        // Fallback to free API if ChatGPT fails
        return this.callFreeAPI(prompt, imageData);
      }
    }

    // No API key - use fallback
    return this.callFreeAPI(prompt, imageData);
  }
  
  async callChatGPTAPI(prompt, imageData = null) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const url = 'https://api.openai.com/v1/chat/completions';
    
    const messages = [
      {
        role: 'system',
        content: 'You are Aura, a helpful AI assistant. Answer questions directly and conversationally. Focus on being helpful and concise - do not list or enumerate page content unless specifically asked. Provide natural, friendly responses.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const payload = {
      model: imageData ? 'gpt-4-vision-preview' : 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7
    };

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

    try {
      console.log('Calling ChatGPT API with key:', this.openaiApiKey ? 'Key present (length: ' + this.openaiApiKey.length + ')' : 'NO KEY');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify(payload)
      });

      console.log('ChatGPT API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        console.error('ChatGPT API error details:', errorData);
        throw new Error(`ChatGPT API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from API');
      }

      const choice = data.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new Error('Empty content in API response');
      }

      return choice.message.content;
    } catch (error) {
      console.error('ChatGPT API call failed:', error);
      throw error;
    }
  }
  
  async callGeminiAPI(prompt, imageData = null) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    
    const parts = [{ text: prompt }];
    
    // Add image if provided
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
          'Content-Type': 'application/json',
          'x-goog-api-key': this.geminiApiKey
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText || response.statusText } };
        }
        
        const errorMessage = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(`Gemini API error: ${response.status} - ${errorMessage}`);
      }
      
      const data = await response.json();
      
      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('No response candidates returned from Gemini API');
      }
      
      const candidate = data.candidates[0];
      if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        throw new Error('Empty content in Gemini API response');
      }
      
      return candidate.content.parts[0].text;
    } catch (error) {
      console.error('Gemini API call failed:', error);
      throw error;
    }
  }
  
  async callGroqAPI(prompt, imageData = null) {
    // Try Groq API first, fallback to free alternative if key is invalid
    const url = `${this.baseUrl}/chat/completions`;
    
    const messages = [
      {
        role: 'system',
        content: 'You are Aura, a helpful AI assistant. Answer questions directly and conversationally. Focus on being helpful and concise - do not list or enumerate page content unless specifically asked. Provide natural, friendly responses.'
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const payload = {
      model: this.model,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
      top_p: 0.95
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.groqApiKey.trim()}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        // If 401 (unauthorized), try free alternative
        if (response.status === 401) {
          console.log('Groq API key invalid, falling back to free API');
          return this.callFreeAPI(prompt, imageData);
        }
        
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText || response.statusText } };
        }
        
        const errorMessage = errorData.error?.message || errorData.message || response.statusText;
        throw new Error(`Groq API error: ${response.status} - ${errorMessage}`);
      }

      const data = await response.json();
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from API');
      }

      const choice = data.choices[0];
      if (!choice.message || !choice.message.content) {
        throw new Error('Empty content in API response');
      }

      return choice.message.content;
    } catch (error) {
      // If it's an auth error, try free API
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        console.log('Groq API authentication failed, using free API');
        return this.callFreeAPI(prompt, imageData);
      }
      console.error('Groq API call failed:', error);
      throw error;
    }
  }

  async callFreeAPI(prompt, imageData = null) {
    // Use Hugging Face Inference API - free tier, no API key required
    const url = 'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2';
    
    const formattedPrompt = `You are Aura, a helpful AI assistant. Answer the user's question directly and helpfully. Be concise and accurate.

User: ${prompt}
Assistant:`;

    const payload = {
      inputs: formattedPrompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        top_p: 0.95,
        return_full_text: false
      },
      options: {
        wait_for_model: true
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
        if (response.status === 503) {
          // Model loading, wait and retry
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.callFreeAPI(prompt, imageData);
        }
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      
      let text = '';
      if (Array.isArray(data) && data.length > 0) {
        text = data[0].generated_text || '';
      } else if (data.generated_text) {
        text = data.generated_text;
      }

      if (!text) {
        // Try a different model if this one fails
        return this.callAlternativeAPI(prompt);
      }

      // Clean up response
      text = text.replace(formattedPrompt, '').trim();
      text = text.split('User:')[0].split('Assistant:')[0].trim();
      
      if (!text || text.length < 10) {
        // Response too short, try alternative
        return this.callAlternativeAPI(prompt);
      }
      
      return text;
    } catch (error) {
      console.error('Free API call failed:', error);
      // Try alternative API instead of generic fallback
      return this.callAlternativeAPI(prompt);
    }
  }

  async callAlternativeAPI(prompt) {
    // Try a different free model as backup
    const url = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-large';
    
    const formattedPrompt = `User: ${prompt}\nAssistant:`;

    const payload = {
      inputs: formattedPrompt,
      parameters: {
        max_new_tokens: 500,
        temperature: 0.7,
        return_full_text: false
      },
      options: {
        wait_for_model: true
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

      if (response.ok) {
        const data = await response.json();
        let text = '';
        if (Array.isArray(data) && data.length > 0) {
          text = data[0].generated_text || '';
        } else if (data.generated_text) {
          text = data.generated_text;
        }
        
        if (text) {
          text = text.replace(formattedPrompt, '').trim();
          text = text.split('User:')[0].split('Assistant:')[0].trim();
          if (text && text.length > 10) {
            return text;
          }
        }
      }
    } catch (e) {
      console.error('Alternative API failed:', e);
    }
    
    // Last resort: provide a direct answer attempt based on the prompt
    return this.generateDirectResponse(prompt);
  }

  generateDirectResponse(prompt) {
    // Instead of generic help message, try to provide a direct answer
    const lowerPrompt = prompt.toLowerCase().trim();

    // Handle greetings
    if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening)[\s!.]*$/i.test(lowerPrompt)) {
      return `Hello! I'm Aura, your AI assistant. How can I help you today?`;
    }

    // Handle "how are you" type questions
    if (lowerPrompt.includes('how are you') || lowerPrompt.includes('how do you do')) {
      return `I'm doing great, thank you for asking! I'm here to help you with any questions you have. What can I assist you with?`;
    }

    // Answer common questions directly
    if (lowerPrompt.includes('what is') || lowerPrompt.includes('what are')) {
      const topic = prompt.replace(/what\s+(is|are)\s+/i, '').replace(/\?/g, '').trim();
      return `I'd be happy to help you learn about "${topic}". However, I'm currently using a limited fallback mode. For the best experience, please configure your ChatGPT or Gemini API key in the extension settings.`;
    } else if (lowerPrompt.includes('how to') || lowerPrompt.includes('how do')) {
      const action = prompt.replace(/how\s+(to|do\s+you)\s+/i, '').replace(/\?/g, '').trim();
      return `To ${action}, here's a general approach:\n\n1. Research and understand the requirements\n2. Break it down into steps\n3. Execute each step carefully\n4. Verify the results\n\nFor more detailed guidance, please configure your API key in settings for full AI capabilities.`;
    } else if (lowerPrompt.includes('why')) {
      return `That's an interesting question. The answer depends on several factors. For detailed answers, please configure your ChatGPT or Gemini API key in the extension settings.`;
    } else {
      // Try to acknowledge the question
      return `I understand you're asking about: "${prompt}". I'm currently in fallback mode with limited capabilities. Please configure your ChatGPT or Gemini API key in the extension settings for full AI-powered responses.`;
    }
  }

  async streamResponse(prompt, imageData, onChunk, onComplete, preferredModel = null) {
    // Reload config to ensure we have the latest keys
    await this.loadConfig();

    // Only use ChatGPT - user requested to remove other models
    if (this.openaiApiKey) {
      try {
        return await this.streamChatGPTResponse(prompt, imageData, onChunk, onComplete);
      } catch (error) {
        console.log('ChatGPT streaming failed, using fallback:', error);
        // Fallback to free API if ChatGPT fails
        return this.streamFreeAPI(prompt, imageData, onChunk, onComplete);
      }
    }

    // No API key - use fallback
    return this.streamFreeAPI(prompt, imageData, onChunk, onComplete);
  }

  async streamChatGPTResponse(prompt, imageData, onChunk, onComplete) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const url = 'https://api.openai.com/v1/chat/completions';
    
    const messages = [
      {
        role: 'system',
        content: 'You are Aura, a helpful AI assistant. Answer questions directly and conversationally. Focus on being helpful and concise - do not list or enumerate page content unless specifically asked. Provide natural, friendly responses.'
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
      model: imageData ? 'gpt-4-vision-preview' : 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
      stream: true
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error?.message || response.statusText;
        throw new Error(`ChatGPT API error: ${response.status} - ${errorMessage}`);
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
      console.error('ChatGPT streaming failed:', error);
      throw error;
    }
  }

  async streamGeminiResponse(prompt, imageData, onChunk, onComplete) {
    if (!this.geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }
    
    const model = 'gemini-1.5-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent`;
    
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
          'Content-Type': 'application/json',
          'x-goog-api-key': this.geminiApiKey
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch (e) {
          errorData = { error: { message: errorText || response.statusText } };
        }
        
        const errorMessage = errorData.error?.message || errorData.message || response.statusText;
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
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) {
                fullResponse += text;
                onChunk(text);
              }
            } catch (e) {
              // Ignore parse errors
            }
          }
        }
      }
      
      if (onComplete) onComplete(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error('Gemini streaming failed:', error);
      throw error;
    }
  }

  async streamFreeAPI(prompt, imageData, onChunk, onComplete) {
    // Simulate streaming with free API response
    try {
      const response = await this.callFreeAPI(prompt, imageData);
      
      // Simulate streaming by chunking the response
      const words = response.split(' ');
      let fullResponse = '';
      
      for (let i = 0; i < words.length; i++) {
        const chunk = words[i] + (i < words.length - 1 ? ' ' : '');
        fullResponse += chunk;
        onChunk(chunk);
        // Small delay to simulate streaming
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      
      if (onComplete) onComplete(fullResponse);
      return fullResponse;
    } catch (error) {
      console.error('Free API streaming failed:', error);
      // Still provide fallback response
      const fallback = this.generateDirectResponse(prompt);
      const words = fallback.split(' ');
      for (const word of words) {
        onChunk(word + ' ');
        await new Promise(resolve => setTimeout(resolve, 30));
      }
      if (onComplete) onComplete(fallback);
      return fallback;
    }
  }
}