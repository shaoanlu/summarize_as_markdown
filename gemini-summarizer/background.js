// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action === 'summarize') {
        summarizeWithGemini(request, sendResponse);
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
  Summarize the following content from ${title}.
  Content: ${contentString.substring(0, 300000)}...
  
  Provide a markdown summary with the following format:
  # Summary of "${title}"
  
  * URL: ${url}
  * Date: ${new Date().toISOString().split('T')[0]}
  * Source: ${sourceInfo}
  * Suggested Tags: [Include 3-5 relevant topic tags]
  
  ## Summary
  [Provide a comprehensive summary of the content in 2-3 paragraphs]
  
  ## Key Points
  [List 3-5 key points from the content]
  `;

        // Call Gemini API
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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