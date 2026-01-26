// src/content/context-processor.js
import { ScreenshotHandler } from './screenshot-handler.js';

export class ContextProcessor {
  static formatContextForLLM(context, screenshot = null) {
    let prompt = `You are analyzing a web page. Here's the context:\n\n`;
    
    prompt += `URL: ${context.url}\n`;
    prompt += `Title: ${context.title}\n\n`;
    
    if (context.text.headings && context.text.headings.length > 0) {
      prompt += `Structure (Headings):\n`;
      context.text.headings.slice(0, 20).forEach(h => {
        prompt += `  ${h.level}: ${h.text}\n`;
      });
      prompt += `\n`;
    }
    
    if (context.text.paragraphs && context.text.paragraphs.length > 0) {
      prompt += `Main Content Snippets:\n`;
      context.text.paragraphs.slice(0, 15).forEach(p => {
        prompt += `${p}\n\n`;
      });
    }
    
    if (context.links && context.links.length > 0) {
      prompt += `\nRelevant Links:\n`;
      context.links.slice(0, 10).forEach(link => {
        prompt += `  - ${link.text}: ${link.href}\n`;
      });
    }

    return {
      textPrompt: prompt,
      imageData: screenshot ? ScreenshotHandler.dataUrlToBase64(screenshot) : null
    };
  }

  static createQuestionPrompt(question, context) {
    const formattedContext = this.formatContextForLLM(context);
    
    return `${formattedContext.textPrompt}\n\nUser Question: ${question}\n\nPlease answer the user's question based on the page context provided above. If the context doesn't contain the answer, say so clearly.`;
  }

  static createSummaryPrompt(context) {
    const formattedContext = this.formatContextForLLM(context);
    
    return `${formattedContext.textPrompt}\n\nPlease provide a concise summary of this page, highlighting the main points and key takeaways.`;
  }
}