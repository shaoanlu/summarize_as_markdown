import { GeminiService, NotionService } from './services/apiService.js';

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'summarize') {
        handleSummarize(request, sendResponse);
        return true; // Required for async sendResponse
    } else if (request.action === 'saveToNotion') {
        handleSaveToNotion(request, sendResponse);
        return true; // Required for async sendResponse
    }
});

async function handleSummarize(request, sendResponse) {
    try {
        const { url, title, content, apiKey } = request;
        const summaryText = await GeminiService.summarizeContent({ url, title, content, apiKey });
        sendResponse({ success: true, summaryText });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}


async function handleSaveToNotion(request, sendResponse) {
    try {
        const pageId = await NotionService.saveToNotion(request);
        sendResponse({ success: true, pageId });
    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}