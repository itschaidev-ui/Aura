// src/content/content-script.js
class ContentScript {
  constructor() {
    this.pageContext = null;
    this.init();
  }

  init() {
    // Extract context on page load
    this.extractContext();
    
    // Listen for messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sendResponse);
      return true; // Keep channel open for async response
    });

    // Re-extract on DOM changes (optional, for dynamic pages)
    // We use a debounce to avoid excessive updates
    let timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        this.extractContext();
      }, 1000);
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  extractContext() {
    const context = {
      url: window.location.href,
      title: document.title,
      text: this.extractText(),
      links: this.extractLinks(),
      images: this.extractImages(),
      timestamp: Date.now()
    };

    this.pageContext = context;
    
    // Send to service worker
    try {
      chrome.runtime.sendMessage({
        type: 'PAGE_CONTEXT_UPDATED',
        data: {
          url: context.url,
          title: context.title
        }
      }).catch(err => {
        // Extension context invalidated (extension was reloaded)
        // This is normal and can be safely ignored
        if (err.message && err.message.includes('Extension context invalidated')) {
          // Extension was reloaded - content script will be re-injected
          return;
        }
        // Ignore other errors silently
      });
    } catch (error) {
      // Extension context invalidated - extension was reloaded
      // This is expected when developer reloads the extension
      // The content script will be re-injected automatically
      if (error.message && !error.message.includes('Extension context invalidated')) {
        console.log('Content script error:', error);
      }
    }
  }

  extractText() {
    // Clone body to avoid modifying the actual page
    const clone = document.body.cloneNode(true);
    
    // Remove script, style, noscript, and hidden elements
    const unwanted = clone.querySelectorAll('script, style, noscript, [hidden], [aria-hidden="true"]');
    unwanted.forEach(el => el.remove());

    // Get main content - try to find main content area
    const mainContent = clone.querySelector('main, article, [role="main"]') || clone;
    
    // Extract text with structure
    return {
      body: mainContent.innerText.trim().substring(0, 50000), // Limit size
      headings: Array.from(clone.querySelectorAll('h1, h2, h3'))
        .map(h => ({ level: h.tagName, text: h.innerText.trim() }))
        .filter(h => h.text.length > 0),
      paragraphs: Array.from(mainContent.querySelectorAll('p'))
        .map(p => p.innerText.trim())
        .filter(text => text.length > 20) // Filter out very short text
        .slice(0, 50) // Limit number of paragraphs
    };
  }

  extractLinks() {
    return Array.from(document.querySelectorAll('a[href]'))
      .filter(a => a.innerText.trim().length > 0) // Only links with text
      .slice(0, 20) // Limit to first 20 links
      .map(a => ({
        text: a.innerText.trim(),
        href: a.href
      }));
  }

  extractImages() {
    return Array.from(document.querySelectorAll('img[src]'))
      .filter(img => img.width > 100 && img.height > 100) // Filter out small icons/pixels
      .slice(0, 10) // Limit to first 10 images
      .map(img => ({
        src: img.src,
        alt: img.alt || '',
        width: img.width,
        height: img.height
      }));
  }

  async handleMessage(message, sendResponse) {
    try {
      switch (message.type) {
        case 'GET_CONTEXT':
          if (!this.pageContext) {
            this.extractContext();
          }
          sendResponse({ context: this.pageContext });
          break;
        
        case 'EXTRACT_SELECTED_TEXT':
          const selected = window.getSelection().toString();
          sendResponse({ text: selected });
          break;
        
        default:
          // Don't send error for unknown messages, just ignore
          // This prevents interference with other listeners
          break;
      }
    } catch (error) {
      // Handle extension context invalidated errors gracefully
      if (error.message && error.message.includes('Extension context invalidated')) {
        // Extension was reloaded - this is expected during development
        return;
      }
      console.error('Content script message handler error:', error);
    }
  }
}

// Initialize
new ContentScript();