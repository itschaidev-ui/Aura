// src/content/context-processor.js
import { ScreenshotHandler } from './screenshot-handler.js';

export class ContextProcessor {
  static formatContextForLLM(context, screenshot = null) {
    if (!context) {
      return {
        textPrompt: 'No page context available.',
        imageData: null
      };
    }

    // Create a concise context summary instead of dumping everything
    let prompt = `Current page context:\n`;
    prompt += `URL: ${context.url || 'Unknown'}\n`;
    prompt += `Title: ${context.title || 'Untitled'}\n`;

    // Only add a brief summary of the page structure
    if (context.text && context.text.headings && context.text.headings.length > 0) {
      const topHeadings = context.text.headings.slice(0, 5);
      if (topHeadings.length > 0) {
        prompt += `Main topics: ${topHeadings.map(h => h.text).join(', ')}\n`;
      }
    }

    return {
      textPrompt: prompt.trim(),
      imageData: screenshot ? ScreenshotHandler.dataUrlToBase64(screenshot) : null
    };
  }

  static createQuestionPrompt(question, context) {
    const formattedContext = this.formatContextForLLM(context);

    // Only include context if it's meaningful
    if (context && context.url && context.url !== 'Unknown' && !context.url.includes('chrome://')) {
      return `Context: I'm currently on the page "${context.title}" at ${context.url}.\n\nQuestion: ${question}`;
    }

    // No meaningful context, just return the question
    return question;
  }

  static createSummaryPrompt(context) {
    const formattedContext = this.formatContextForLLM(context);

    return `${formattedContext.textPrompt}\n\nProvide a brief, conversational summary of what this page is about.`;
  }
}