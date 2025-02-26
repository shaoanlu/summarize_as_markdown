// This script runs in the context of web pages
// It can be used for more advanced content extraction if needed

// For now, we're handling most of the extraction in the popup.js script
// This file can be extended for more complex use cases like PDF extraction

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'extractPdfContent') {
        // PDF extraction could be implemented here
        // Note: This would require a PDF.js integration for proper extraction
        // For now, we're using a simplified approach in popup.js
        sendResponse({ content: "PDF extraction placeholder" });
    }
    return true;
});