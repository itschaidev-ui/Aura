# Aura - Project Goals

## Core Mission

**Aura** is a Chrome extension designed to be your intelligent browser companion. It reads everything on your browser and acts as an AI assistant, powered by ChatGPT, to answer your questions about any webpage you visit.

## Primary Objectives

### 1. Universal Browser Reading
- **Read everything** - The extension must be able to access and understand all content on any webpage
- **DOM extraction** - Capture all text, structure, and context from web pages
- **Visual understanding** - Use screenshots to understand visual elements (charts, images, layouts)
- **Cross-tab awareness** - Maintain context across different tabs and websites

### 2. AI-Powered Question Answering
- **ChatGPT integration** - Use OpenAI's API to power all AI responses
- **Contextual understanding** - Answer questions based on what the user is currently viewing
- **Intelligent responses** - Provide accurate, helpful answers about page content
- **Real-time interaction** - Stream responses for immediate feedback

### 3. Seamless User Experience
- **Non-intrusive interface** - Side panel and overlay that don't interfere with browsing
- **Always available** - Accessible from any webpage
- **Persistent memory** - Maintain conversation context across page navigations
- **Fast and responsive** - Quick content extraction and AI responses

## Key Features

### Phase 1: Foundation
- ✅ Manifest V3 configuration with necessary permissions
- ✅ Background service worker for ChatGPT API communication
- ✅ Cross-tab state management

### Phase 2: Content Reading
- ✅ Read all DOM content from any webpage
- ✅ Capture screenshots for visual analysis
- ✅ Process and format content for ChatGPT

### Phase 3: User Interface
- ✅ Side panel for conversations
- ✅ Overlay trigger (Magic Dot/Command Bar)
- ✅ Chat interface for Q&A

### Phase 4: Enhanced Capabilities
- ✅ Streaming responses (SSE)
- ✅ Third-party integrations (optional)
- ✅ Workflow actions (optional)

## Success Criteria

Aura is successful when:
1. ✅ Can read and understand content from any website
2. ✅ Accurately answers questions about page content using ChatGPT
3. ✅ Provides fast, helpful responses
4. ✅ Works seamlessly without disrupting browsing experience
5. ✅ Maintains context across different tabs and pages

## Technical Requirements

- **AI Engine:** OpenAI API (ChatGPT)
- **Browser:** Chrome 114+ (for Side Panel API)
- **Architecture:** Manifest V3
- **Permissions:** `sidePanel`, `activeTab`, `scripting`, `storage`, `tabs`

## User Experience Goal

When a user visits any webpage, they should be able to:
- Ask questions like "What is this page about?"
- Get summaries of long articles
- Understand complex charts or data
- Ask follow-up questions based on the content
- Have a natural conversation about what they're viewing

All powered by ChatGPT's understanding, with Aura providing the "eyes" to see what the user sees.

