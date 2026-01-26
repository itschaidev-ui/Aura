// src/content/screenshot-handler.js
export class ScreenshotHandler {
  static async capture(tabId) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CAPTURE_SCREENSHOT',
        tabId: tabId
      });

      if (response.error) {
        throw new Error(response.error);
      }

      return response.screenshot;
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // Return null instead of throwing to allow text-only fallback
      return null;
    }
  }

  static dataUrlToBase64(dataUrl) {
    // Convert data URL to base64 for API (remove "data:image/png;base64," prefix)
    if (!dataUrl || !dataUrl.includes(',')) {
      return null;
    }
    return dataUrl.split(',')[1];
  }
}