import { convertMarkdownToNotionBlocks } from './notionUtils.js';

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'summarize') {
        summarizeWithGemini(request, sendResponse);
        return true; // Required for async sendResponse
    } else if (request.action === 'saveToNotion') {
        saveToNotion(request, sendResponse);
        return true; // Required for async sendResponse
    }
});

async function summarizeWithGemini(request, sendResponse) {
    try {
        const { url, title, content, apiKey } = request;

        // Ensure content is a string and not empty
        const contentString = typeof content === 'string' ? content :
            (content && content.content ? content.content :
                JSON.stringify(content));

        if (!contentString || contentString.trim().length === 0) {
            sendResponse({ success: false, error: "No content found to summarize" });
            return;
        }

        // Get source info if available
        const sourceInfo = content && content.sourceInfo ? content.sourceInfo : 'Unknown source';

        // Create prompt for Gemini
        const prompt = `
  Summarize content, within 4000 charaters, the following from ${title}.
  Content: ${contentString.substring(0, 300000)}...
  
  Provide a markdown summary with the following format:
  # Summary of "${title}"
  
  * URL: ${url}
  * Date: ${new Date().toISOString().split('T')[0]}
  * Source: ${sourceInfo}
  * Suggested Tags: [Include 3-5 relevant topic tags]
  
  ## Summary
  [Provide a comprehensive summary of the content in 2-4 paragraphs]
  
  ## Key Points
  [List 3-5 key points from the content]
  `;

        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                // Gemini API also benefits from explicit charset
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: prompt
                    }]
                }]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            sendResponse({
                success: false,
                error: `API Error: ${errorData.error?.message || 'Unknown API error'}`
            });
            return;
        }

        const data = await response.json();

        // Extract the summary text
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            sendResponse({ success: false, error: "No summary generated" });
            return;
        }

        const summaryText = data.candidates[0].content.parts[0].text;

        // Send the summary text back to the popup
        sendResponse({
            success: true,
            summaryText: summaryText
        });

    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}


async function saveToNotion(request, sendResponse) {
    try {
        const { title, content, tags, url, notionApiKey, notionDatabaseId } = request;
        const currentDate = new Date().toISOString().split('T')[0];
        const blocks = convertMarkdownToNotionBlocks(content);
        const blockChunks = [];
        const CHUNK_SIZE = 100; // Notion's block limit per request

        for (let i = 0; i < blocks.length; i += CHUNK_SIZE) {
            blockChunks.push(blocks.slice(i, i + CHUNK_SIZE));
        }

        // Call Notion API to create a new page
        const createResponse = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${notionApiKey}`,
                // *** FIX: Explicitly set charset to UTF-8 ***
                'Content-Type': 'application/json; charset=utf-8',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                parent: {
                    database_id: notionDatabaseId
                },
                properties: {
                    "Title": {
                        title: [{ text: { content: title } }]
                    },
                    "URL": {
                        url: url
                    },
                    "Tags": {
                        multi_select: tags.map(tag => ({ name: tag }))
                    },
                    "Date": {
                        date: { start: currentDate }
                    }
                },
                // Add the first chunk of content blocks to the page
                children: blockChunks.length > 0 ? blockChunks[0] : []
            })
        });

        if (!createResponse.ok) {
            const errorData = await createResponse.json();
            sendResponse({
                success: false,
                error: `Notion API Error: ${errorData.message || 'Unknown Notion API error'}`
            });
            return;
        }

        const pageData = await createResponse.json();
        const pageId = pageData.id;

        // If there are more chunks, append them to the page
        if (blockChunks.length > 1) {
            for (let i = 1; i < blockChunks.length; i++) {
                await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `Bearer ${notionApiKey}`,
                        // *** FIX: Also apply to the PATCH request for consistency ***
                        'Content-Type': 'application/json; charset=utf-8',
                        'Notion-Version': '2022-06-28'
                    },
                    body: JSON.stringify({
                        children: blockChunks[i]
                    })
                });
                // Note: Not checking for appendResponse failure for simplicity,
                // but in a production app you would add error handling here.
            }
        }

        sendResponse({
            success: true,
            pageId: pageId
        });

    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}