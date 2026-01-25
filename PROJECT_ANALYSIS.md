# Aura Chrome Extension - Project Analysis

## Current State

### File Structure
```
Aura/
└── .git/                    # Git repository initialized
```

**Status:** Empty project directory with Git initialized but no files committed.

### GitHub Repository
- **Remote URL:** `https://github.com/itschaidev-ui/Aura.git`
- **Status:** Empty repository (no commits, no branches)
- **Local Branch:** `main` (no commits yet)

---

## Recommended Project Structure (Based on 4-Phase Plan)

### Phase 1: Core Manifest & Service Worker
```
Aura/
├── manifest.json                    # Manifest V3 configuration
├── service-worker.js                # Background service worker
├── src/
│   ├── background/
│   │   ├── api-client.js           # ChatGPT API communication
│   │   ├── state-manager.js        # Cross-tab state management
│   │   └── message-handler.js      # Message routing
│   └── utils/
│       └── storage.js              # Chrome storage utilities
```

### Phase 2: Contextual Extraction
```
├── src/
│   ├── content/
│   │   ├── content-script.js       # DOM extraction
│   │   ├── screenshot-handler.js   # chrome.tabs.captureVisibleTab
│   │   └── context-processor.js    # Data preprocessing for LLM
│   └── content/
│       └── inject.js               # Script injection logic
```

### Phase 3: Overlay & Side Panel UI
```
├── src/
│   ├── ui/
│   │   ├── overlay/
│   │   │   ├── overlay.js          # Shadow DOM overlay injection
│   │   │   ├── magic-dot.js        # Floating trigger button
│   │   │   └── command-bar.js      # Command interface
│   │   └── sidepanel/
│   │       ├── sidepanel.html      # Side panel HTML
│   │       ├── sidepanel.js        # Side panel logic
│   │       └── sidepanel.css       # Side panel styles
│   └── ui/
│       └── components/
│           ├── chat.js             # Chat interface component
│           └── draft-viewer.js    # Draft display component
```

### Phase 4: Integration & Workflow Actions
```
├── src/
│   ├── integrations/
│   │   ├── notion-client.js        # Notion API integration
│   │   ├── slack-client.js         # Slack API integration
│   │   ├── github-client.js        # GitHub API integration
│   │   └── action-layer.js         # Unified action dispatcher
│   ├── streaming/
│   │   └── sse-handler.js          # Server-Sent Events for streaming
│   └── actions/
│       ├── send-to-slack.js        # Slack action handler
│       ├── create-jira.js          # Jira ticket creation
│       └── save-to-notion.js       # Notion save handler
```

### Supporting Files
```
├── icons/                          # Extension icons (16, 48, 128px)
├── styles/
│   └── global.css                  # Global styles
├── .gitignore
├── README.md
├── package.json                    # If using build tools
└── tsconfig.json                   # If using TypeScript
```

---

## Phase-by-Phase Implementation Checklist

### ✅ Phase 1: Core Manifest & Service Worker
**Status:** Not Started

**Required Components:**
- [ ] `manifest.json` with Manifest V3
  - [ ] `manifest_version: 3`
  - [ ] `sidePanel` permission
  - [ ] `activeTab` permission
  - [ ] `scripting` permission
  - [ ] Background service worker registration
- [ ] `service-worker.js` implementation
  - [ ] ChatGPT API communication layer
  - [ ] Cross-tab state management
  - [ ] Message passing infrastructure
  - [ ] Storage management

**Key Files to Create:**
1. `manifest.json`
2. `src/background/service-worker.js`
3. `src/background/api-client.js`
4. `src/background/state-manager.js`

---

### ✅ Phase 2: Contextual Extraction
**Status:** Not Started

**Required Components:**
- [ ] Content script registration in manifest
- [ ] DOM text extraction logic
- [ ] Screenshot capture using `chrome.tabs.captureVisibleTab`
- [ ] Context preprocessing for ChatGPT
- [ ] Data sanitization and prompt formatting
- [ ] Full browser content reading capability

**Key Files to Create:**
1. `src/content/content-script.js`
2. `src/content/screenshot-handler.js`
3. `src/content/context-processor.js`

---

### ✅ Phase 3: Overlay & Side Panel UI
**Status:** Not Started

**Required Components:**
- [ ] Side panel HTML/CSS/JS
- [ ] Shadow DOM overlay injection
- [ ] Magic Dot / Command Bar UI
- [ ] Chat interface in side panel
- [ ] Draft viewer component
- [ ] CSS isolation to prevent site conflicts

**Key Files to Create:**
1. `src/ui/sidepanel/sidepanel.html`
2. `src/ui/sidepanel/sidepanel.js`
3. `src/ui/sidepanel/sidepanel.css`
4. `src/ui/overlay/overlay.js`
5. `src/ui/overlay/magic-dot.js`

---

### ✅ Phase 4: Integration & Workflow Actions
**Status:** Not Started

**Required Components:**
- [ ] Third-party API clients (Notion, Slack, GitHub)
- [ ] Action layer for routing user commands
- [ ] SSE streaming implementation
- [ ] Real-time response rendering
- [ ] OAuth/authentication flows for integrations

**Key Files to Create:**
1. `src/integrations/notion-client.js`
2. `src/integrations/slack-client.js`
3. `src/integrations/github-client.js`
4. `src/integrations/action-layer.js`
5. `src/streaming/sse-handler.js`

---

## Technical Requirements

### Manifest V3 Key Permissions
```json
{
  "permissions": [
    "sidePanel",
    "activeTab",
    "scripting",
    "storage",
    "tabs"
  ],
  "host_permissions": [
    "https://*/*"  // For AI API calls
  ]
}
```

### API Integration Requirements
- **AI API:** OpenAI API (ChatGPT) - Primary AI engine
- **Third-party:** Notion API, Slack Web API, GitHub API
- **Authentication:** OAuth 2.0 flows for each service

### Browser APIs Used
- `chrome.sidePanel` - Side panel workspace
- `chrome.tabs.captureVisibleTab` - Screenshot capture
- `chrome.scripting` - Dynamic script injection
- `chrome.storage` - State persistence
- `chrome.runtime` - Message passing

---

## Next Steps

1. **Initialize Project Structure**
   - Create directory structure
   - Set up `manifest.json` with Phase 1 requirements
   - Create basic service worker

2. **Set Up Development Environment**
   - Configure build tools (if needed)
   - Set up environment variables for API keys
   - Create `.gitignore`

3. **Implement Phase 1**
   - Complete manifest configuration
   - Build service worker with API client
   - Implement state management

4. **Progressive Implementation**
   - Move through phases sequentially
   - Test each phase before moving to next
   - Maintain clean separation of concerns

---

## Project Goal

**Aura** is a Chrome extension that:
- **Reads everything** on your browser - can access and understand any webpage content
- **Acts as an AI assistant** - answers your questions about what you're viewing
- **Powered by ChatGPT** - uses OpenAI's API to provide intelligent responses

## Notes

- **Security:** All API keys should be stored securely (not in code)
- **Privacy:** Screenshot and DOM data should be processed securely
- **Performance:** Service worker should be lightweight and efficient
- **Compatibility:** Target Chrome 114+ for side panel support
- **Core Function:** The extension must be able to read and understand all browser content to answer user questions effectively

