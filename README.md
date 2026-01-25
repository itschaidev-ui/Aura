# Aura - AI-Powered Browser Assistant

A Chrome extension that reads everything on your browser and acts as an AI assistant, powered by ChatGPT. Aura can see and understand any webpage you visit, answer your questions about the content, and help you interact with the web more intelligently.

## 🎯 Features

### Phase 1: Core Manifest & Service Worker
- Manifest V3 compliant
- Background service worker for AI API communication
- Cross-tab state management

### Phase 2: Contextual Extraction
- Reads all content from any webpage (DOM text extraction)
- Screenshot capture for visual analysis
- Processes page content for ChatGPT understanding

### Phase 3: Overlay & Side Panel UI
- Non-intrusive Shadow DOM overlay
- Chrome Side Panel workspace
- Real-time chat interface

### Phase 4: Integration & Workflow Actions
- Third-party API integrations (Notion, Slack, GitHub)
- Server-Sent Events (SSE) for streaming ChatGPT responses
- Workflow automation actions

## 📋 Project Status

**Current Phase:** Pre-Phase 1 (Project initialization)

See [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) for detailed implementation plan.

## 🚀 Getting Started

### Prerequisites
- Chrome 114+ (for Side Panel API support)
- Node.js (if using build tools)

### Installation
1. Clone the repository
2. Load the extension in Chrome (Developer mode)
3. Configure API keys (see Environment Variables)

### Development
```bash
# Clone repository
git clone https://github.com/itschaidev-ui/Aura.git
cd Aura

# Install dependencies (if applicable)
npm install

# Load extension in Chrome
# 1. Open chrome://extensions/
# 2. Enable "Developer mode"
# 3. Click "Load unpacked"
# 4. Select the Aura directory
```

## 📁 Project Structure

See [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) for complete file structure.

## 🔧 Configuration

### API Keys Setup
**📖 See [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) for detailed instructions on obtaining and configuring API keys (if available).**

**Required Setup:**
- **OpenAI API Key (ChatGPT)** - Primary AI engine for answering questions
- **Google Cloud Project** - Central project for all services (if using backend)
- **Firebase Configuration** - Backend services (Firestore, Auth, etc.) - Optional
- **Google Cloud API Key** - For Chrome extension API calls - Optional

**Quick Setup:**
Create a `.env` file (not committed to git) for local development:
```env
# ChatGPT API (Required - Primary AI Engine)
OPENAI_API_KEY=your_chatgpt_api_key_here

# Optional: Third-party Integrations
NOTION_API_KEY=your_key_here
SLACK_API_TOKEN=your_token_here

# Optional: Google Cloud / Firebase (if using backend services)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_API_KEY=your-api-key-here
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123
```

**Note:** 
- Aura uses the **OpenAI API (ChatGPT)** as its primary AI engine for answering questions about browser content.
- For production, use a settings page to store keys in `chrome.storage.local` instead of `.env` files.

## 📚 Documentation

- [GOALS.md](./GOALS.md) - Project goals and mission statement
- [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) - Complete guide to obtaining and configuring API keys (if available)
- [PROJECT_ANALYSIS.md](./PROJECT_ANALYSIS.md) - Detailed phase-by-phase breakdown
- [DIRECTORY_STRUCTURE.md](./DIRECTORY_STRUCTURE.md) - File structure and organization
- [GITHUB_ANALYSIS.md](./GITHUB_ANALYSIS.md) - Repository setup and workflow
- [ANALYSIS_SUMMARY.md](./ANALYSIS_SUMMARY.md) - Executive summary

## 🔒 Security

- Never commit API keys or secrets
- Use environment variables for sensitive data
- Store user-specific data in `chrome.storage.local`

## 📝 License

[Add your license here]

## 🤝 Contributing

[Add contribution guidelines here]

