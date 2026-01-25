# Aura - AI-Powered Browser Assistant

A Chrome extension that provides an intelligent AI assistant directly in your browser, capable of understanding page context, answering questions, and integrating with third-party services.

## 🎯 Features

### Phase 1: Core Manifest & Service Worker
- Manifest V3 compliant
- Background service worker for AI API communication
- Cross-tab state management

### Phase 2: Contextual Extraction
- DOM text extraction
- Screenshot capture for visual analysis
- Multimodal LLM integration

### Phase 3: Overlay & Side Panel UI
- Non-intrusive Shadow DOM overlay
- Chrome Side Panel workspace
- Real-time chat interface

### Phase 4: Integration & Workflow Actions
- Third-party API integrations (Notion, Slack, GitHub)
- Server-Sent Events (SSE) for streaming responses
- Workflow automation actions

## 📋 Project Status

**Current Phase:** Pre-Phase 1 (Project initialization)

**📖 See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete step-by-step implementation guide.**

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
**📖 See [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) for detailed instructions on obtaining and configuring API keys.**

**Required Setup:**
- **Google Cloud Project** - Central project for all services
- **Firebase Configuration** - Backend services (Firestore, Auth, etc.)
- **Google Cloud API Key** - For Chrome extension API calls

**Quick Setup:**
Create a `.env` file (not committed to git) for local development:
```env
# Google Cloud Project
GOOGLE_CLOUD_PROJECT_ID=your-project-id

# Firebase Configuration
FIREBASE_API_KEY=AIza...
FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abc123

# Google Cloud API Key
GOOGLE_CLOUD_API_KEY=your-api-key-here
```

**Note:** For production, use a settings page to store keys in `chrome.storage.local` instead of `.env` files.

## 📚 Documentation

- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - **🚀 Complete step-by-step implementation guide for all 4 phases**
- [API_KEYS_SETUP.md](./API_KEYS_SETUP.md) - **Complete guide to obtaining and configuring API keys**
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

