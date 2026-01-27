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
    try {
      // Clone body to avoid modifying the actual page
      const clone = document.body.cloneNode(true);
      
      // Remove script, style, noscript, and hidden elements
      const unwanted = clone.querySelectorAll('script, style, noscript, [hidden], [aria-hidden="true"], nav, header, footer, aside, .ad, .advertisement, [class*="ad-"], [id*="ad-"]');
      unwanted.forEach(el => el.remove());

      // Get main content - try to find main content area
      let mainContent = clone.querySelector('main, article, [role="main"], .main-content, .content, #content, #main');
      
      // If no main content found, try to find the largest content area
      if (!mainContent) {
        const candidates = clone.querySelectorAll('div, section');
        let maxTextLength = 0;
        candidates.forEach(candidate => {
          const textLength = candidate.innerText.trim().length;
          if (textLength > maxTextLength && textLength > 500) {
            maxTextLength = textLength;
            mainContent = candidate;
          }
        });
      }
      
      // Fallback to body if still no main content
      if (!mainContent) {
        mainContent = clone;
      }
      
      // Extract text with structure
      const bodyText = mainContent.innerText.trim();
      
      return {
        body: bodyText.substring(0, 50000), // Limit size
        headings: Array.from(clone.querySelectorAll('h1, h2, h3, h4'))
          .map(h => ({ 
            level: h.tagName, 
            text: h.innerText.trim() 
          }))
          .filter(h => h.text.length > 0)
          .slice(0, 30), // Limit headings
        paragraphs: Array.from(mainContent.querySelectorAll('p, li, div > p'))
          .map(p => p.innerText.trim())
          .filter(text => text.length > 20) // Filter out very short text
          .slice(0, 60) // Limit number of paragraphs
      };
    } catch (error) {
      console.error('Text extraction error:', error);
      // Fallback to simple extraction
      return {
        body: document.body.innerText.trim().substring(0, 10000),
        headings: [],
        paragraphs: []
      };
    }
  }

  extractLinks() {
    try {
      return Array.from(document.querySelectorAll('a[href]'))
        .filter(a => {
          const text = a.innerText.trim();
          const href = a.href;
          // Filter out empty links, javascript links, and anchors
          return text.length > 0 && 
                 !href.startsWith('javascript:') && 
                 !href.startsWith('#') &&
                 href.length < 500; // Avoid extremely long URLs
        })
        .slice(0, 25) // Limit to first 25 links
        .map(a => ({
          text: a.innerText.trim().substring(0, 100), // Limit text length
          href: a.href
        }));
    } catch (error) {
      console.error('Link extraction error:', error);
      return [];
    }
  }

  extractImages() {
    try {
      return Array.from(document.querySelectorAll('img[src]'))
        .filter(img => {
          // Filter out small icons, tracking pixels, and data URLs that are too large
          const isLargeEnough = (img.width > 50 && img.height > 50) || 
                               (img.naturalWidth > 50 && img.naturalHeight > 50);
          const isNotDataUrl = !img.src.startsWith('data:') || img.src.length < 10000;
          return isLargeEnough && isNotDataUrl;
        })
        .slice(0, 15) // Limit to first 15 images
        .map(img => ({
          src: img.src.substring(0, 500), // Limit URL length
          alt: (img.alt || img.title || '').substring(0, 200),
          width: img.width || img.naturalWidth || 0,
          height: img.height || img.naturalHeight || 0
        }));
    } catch (error) {
      console.error('Image extraction error:', error);
      return [];
    }
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