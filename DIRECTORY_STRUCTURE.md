# Aura Extension - Directory Structure

## Current State
```
Aura/
└── .git/                          # Git repository (empty, no commits)
```

## Target Structure (Complete Implementation)

```
Aura/
├── manifest.json                  # Manifest V3 configuration
├── service-worker.js              # Background service worker entry point
│
├── src/
│   ├── background/                # Phase 1: Service Worker Logic
│   │   ├── service-worker.js      # Main service worker
│   │   ├── api-client.js          # AI API communication (Gemini/OpenAI)
│   │   ├── state-manager.js       # Cross-tab state management
│   │   └── message-handler.js     # Message routing between components
│   │
│   ├── content/                   # Phase 2: Context Extraction
│   │   ├── content-script.js      # DOM text extraction
│   │   ├── screenshot-handler.js  # chrome.tabs.captureVisibleTab wrapper
│   │   ├── context-processor.js    # Preprocess data for LLM
│   │   └── inject.js              # Script injection utilities
│   │
│   ├── ui/                        # Phase 3: User Interface
│   │   ├── overlay/
│   │   │   ├── overlay.js         # Shadow DOM overlay system
│   │   │   ├── magic-dot.js       # Floating trigger button
│   │   │   └── command-bar.js     # Command interface overlay
│   │   │
│   │   ├── sidepanel/
│   │   │   ├── sidepanel.html     # Side panel HTML structure
│   │   │   ├── sidepanel.js       # Side panel logic & state
│   │   │   └── sidepanel.css      # Side panel styles
│   │   │
│   │   └── components/
│   │       ├── chat.js            # Chat interface component
│   │       ├── draft-viewer.js    # Draft display component
│   │       └── message-bubble.js  # Individual message component
│   │
│   ├── integrations/              # Phase 4: Third-party Integrations
│   │   ├── notion-client.js       # Notion API client
│   │   ├── slack-client.js        # Slack Web API client
│   │   ├── github-client.js       # GitHub API client
│   │   └── action-layer.js        # Unified action dispatcher
│   │
│   ├── streaming/                 # Phase 4: Real-time Features
│   │   └── sse-handler.js         # Server-Sent Events handler
│   │
│   ├── actions/                   # Phase 4: Workflow Actions
│   │   ├── send-to-slack.js       # "Send to Slack" action
│   │   ├── create-jira.js         # "Create Jira ticket" action
│   │   └── save-to-notion.js      # "Save to Notion" action
│   │
│   └── utils/                     # Shared Utilities
│       ├── storage.js             # Chrome storage wrapper
│       ├── logger.js              # Logging utilities
│       └── constants.js           # App-wide constants
│
├── icons/                         # Extension Icons
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
│
├── styles/                        # Global Styles
│   └── global.css
│
├── .gitignore                     # Git ignore rules
├── README.md                      # Project documentation
├── package.json                   # Dependencies (if using build tools)
├── tsconfig.json                  # TypeScript config (if using TS)
└── PROJECT_ANALYSIS.md           # This analysis document
```

## File Count Summary

| Phase | Component | Files |
|-------|-----------|-------|
| Phase 1 | Background/Service Worker | 4 files |
| Phase 2 | Content Scripts | 4 files |
| Phase 3 | UI Components | 8 files |
| Phase 4 | Integrations & Actions | 7 files |
| **Total** | | **23+ core files** |

## Key Entry Points

1. **manifest.json** - Extension configuration
2. **service-worker.js** - Background process entry
3. **src/content/content-script.js** - Injected into web pages
4. **src/ui/sidepanel/sidepanel.html** - Side panel UI entry

## Data Flow

```
User Action
    ↓
Content Script (Phase 2)
    ↓
Service Worker (Phase 1)
    ↓
AI API / Integration (Phase 4)
    ↓
Side Panel UI (Phase 3)
    ↓
User Feedback
```

