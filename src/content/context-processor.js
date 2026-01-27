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
    
    let prompt = `You are analyzing a web page. Here's the context:\n\n`;
    
    prompt += `URL: ${context.url || 'Unknown'}\n`;
    prompt += `Title: ${context.title || 'Untitled'}\n\n`;
    
    // Add headings structure
    if (context.text && context.text.headings && context.text.headings.length > 0) {
      prompt += `Page Structure (Headings):\n`;
      context.text.headings.slice(0, 20).forEach(h => {
        prompt += `  ${h.level}: ${h.text}\n`;
      });
      prompt += `\n`;
    }
    
    // Add main content
    if (context.text && context.text.paragraphs && context.text.paragraphs.length > 0) {
      prompt += `Main Content:\n`;
      context.text.paragraphs.slice(0, 20).forEach((p, idx) => {
        prompt += `${idx + 1}. ${p}\n\n`;
      });
    } else if (context.text && context.text.body) {
      // Fallback to body text if paragraphs not available
      const bodyText = context.text.body.substring(0, 5000);
      prompt += `Page Content:\n${bodyText}\n\n`;
    }
    
    // Add relevant links
    if (context.links && context.links.length > 0) {
      prompt += `Relevant Links on Page:\n`;
      context.links.slice(0, 10).forEach(link => {
        prompt += `  • ${link.text || 'Link'}: ${link.href}\n`;
      });
      prompt += `\n`;
    }
    
    // Add image metadata if available
    if (context.images && context.images.length > 0) {
      prompt += `Images on Page:\n`;
      context.images.slice(0, 5).forEach(img => {
        prompt += `  - ${img.alt || 'Image'}: ${img.src.substring(0, 100)}...\n`;
      });
    }

    return {
      textPrompt: prompt.trim(),
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