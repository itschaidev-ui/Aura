// src/ui/overlay/overlay.js
class Overlay {
  constructor() {
    this.shadowRoot = null;
    this.magicDot = null;
    this.isVisible = true;
    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.body) {
      this.createOverlay();
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        this.createOverlay();
      });
    }
  }

  createOverlay() {
    // Create shadow host
    const host = document.createElement('div');
    host.id = 'aura-overlay-host';
    host.style.cssText = 'position: fixed; z-index: 999999; pointer-events: none;';
    document.body.appendChild(host);

    // Create shadow root
    this.shadowRoot = host.attachShadow({ mode: 'closed' });

    // Inject styles
    this.injectStyles();

    // Create magic dot
    this.createMagicDot();

    // Prevent conflicts with page styles
    this.preventStyleLeakage();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .magic-dot {
        position: fixed;
        bottom: 24px;
        right: 24px;
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        pointer-events: auto;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border: 2px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        animation: pulse 2s ease-in-out infinite;
      }
      
      .magic-dot:hover {
        transform: scale(1.1);
        box-shadow: 0 8px 24px rgba(99, 102, 241, 0.5), 0 0 0 4px rgba(99, 102, 241, 0.2);
      }
      
      .magic-dot:active {
        transform: scale(0.95);
      }
      
      .magic-dot.hidden {
        opacity: 0;
        transform: scale(0);
        pointer-events: none;
      }
      
      @keyframes pulse {
        0%, 100% {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 0 rgba(99, 102, 241, 0.5);
        }
        50% {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4), 0 0 0 8px rgba(99, 102, 241, 0);
        }
      }
      
      .magic-dot-icon {
        width: 28px;
        height: 28px;
        fill: white;
      }
    `;
    this.shadowRoot.appendChild(style);
  }

  createMagicDot() {
    this.magicDot = document.createElement('div');
    this.magicDot.className = 'magic-dot';
    this.magicDot.title = 'Open Aura Assistant';
    this.magicDot.setAttribute('aria-label', 'Open Aura Assistant');
    
    // Create SVG icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.setAttribute('class', 'magic-dot-icon');
    icon.setAttribute('viewBox', '0 0 24 24');
    icon.setAttribute('fill', 'none');
    icon.setAttribute('stroke', 'currentColor');
    icon.setAttribute('stroke-width', '2');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
    icon.appendChild(path);
    
    this.magicDot.appendChild(icon);
    
    // Add click handler
    this.magicDot.addEventListener('click', (e) => {
      e.stopPropagation();
      this.openSidePanel();
    });

    // Add hover effect
    this.magicDot.addEventListener('mouseenter', () => {
      this.magicDot.style.transform = 'scale(1.1)';
    });

    this.magicDot.addEventListener('mouseleave', () => {
      this.magicDot.style.transform = 'scale(1)';
    });

    this.shadowRoot.appendChild(this.magicDot);
  }

  preventStyleLeakage() {
    // Ensure our overlay doesn't interfere with page styles
    const host = this.shadowRoot.host;
    host.style.all = 'initial';
    host.style.position = 'fixed';
    host.style.zIndex = '999999';
    host.style.pointerEvents = 'none';
  }

  async openSidePanel() {
    try {
      // Send message to open floating UI instead (doesn't require user gesture)
      chrome.runtime.sendMessage({
        type: 'OPEN_AURA'
      });

      // Visual feedback
      this.magicDot.style.transform = 'scale(0.9)';
      setTimeout(() => {
        this.magicDot.style.transform = 'scale(1)';
      }, 150);
    } catch (error) {
      console.error('Failed to open Aura:', error);
    }
  }

  hide() {
    if (this.magicDot) {
      this.magicDot.classList.add('hidden');
      this.isVisible = false;
    }
  }

  show() {
    if (this.magicDot) {
      this.magicDot.classList.remove('hidden');
      this.isVisible = true;
    }
  }

  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }
}

// Initialize overlay
let overlayInstance = null;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    overlayInstance = new Overlay();
  });
} else {
  overlayInstance = new Overlay();
}