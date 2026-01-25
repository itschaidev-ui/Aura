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

### Environment Variables
Create a `.env` file (not committed to git):
```
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
NOTION_API_KEY=your_key_here
SLACK_API_TOKEN=your_token_here
```

## 📚 Documentation

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

