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
  Summarize content, within 2000 charaters the following, from ${title}.
  Content: ${contentString.substring(0, 300000)}...
  
  Provide a markdown summary with the following format:
  # Summary of "${title}"
  
  * URL: ${url}
  * Date: ${new Date().toISOString().split('T')[0]}
  * Source: ${sourceInfo}
  * Suggested Tags: [Include 3-5 relevant topic tags]
  
  ## Summary
  [Provide a comprehensive summary of the content in 1-2 paragraphs]
  
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

// Function to convert markdown content to Notion blocks
function convertMarkdownToNotionBlocks(markdownContent) {
    // Split the markdown content by lines
    const lines = markdownContent.split('\n');
    const blocks = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines
        if (line === '') {
            continue;
        }

        // Check for headings
        if (line.startsWith('# ')) {
            blocks.push({
                object: "block",
                type: "heading_1",
                heading_1: {
                    rich_text: [{
                        type: "text",
                        text: {
                            content: line.substring(2)
                        }
                    }]
                }
            });
        } else if (line.startsWith('## ')) {
            blocks.push({
                object: "block",
                type: "heading_2",
                heading_2: {
                    rich_text: [{
                        type: "text",
                        text: {
                            content: line.substring(3)
                        }
                    }]
                }
            });
        } else if (line.startsWith('### ')) {
            blocks.push({
                object: "block",
                type: "heading_3",
                heading_3: {
                    rich_text: [{
                        type: "text",
                        text: {
                            content: line.substring(4)
                        }
                    }]
                }
            });
        }
        // Check for bullet list
        else if (line.startsWith('* ') || line.startsWith('- ')) {
            blocks.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: {
                    rich_text: [{
                        type: "text",
                        text: {
                            content: line.substring(2)
                        }
                    }]
                }
            });
        }
        // Check for numbered list
        else if (/^\d+\.\s/.test(line)) {
            // Find where the text starts after the number and dot
            const textStart = line.indexOf('. ') + 2;
            blocks.push({
                object: "block",
                type: "numbered_list_item",
                numbered_list_item: {
                    rich_text: [{
                        type: "text",
                        text: {
                            content: line.substring(textStart)
                        }
                    }]
                }
            });
        }
        // Regular paragraph
        else {
            blocks.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: [{
                        type: "text",
                        text: {
                            content: line
                        }
                    }]
                }
            });
        }
    }

    return blocks;
}

// Function to convert markdown content to Notion blocks
function convertMarkdownToNotionBlocks(markdownContent) {
    // Split the markdown content by lines
    const lines = markdownContent.split('\n');
    const blocks = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle multi-line code blocks (```code```)
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                // Start of a code block
                inCodeBlock = true;
                // Extract language if specified
                codeBlockLanguage = line.trim().substring(3).trim();
                codeBlockContent = '';
            } else {
                // End of a code block
                inCodeBlock = false;
                blocks.push({
                    object: "block",
                    type: "code",
                    code: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: codeBlockContent
                            }
                        }],
                        language: codeBlockLanguage || "plain text"
                    }
                });
            }
            continue;
        }

        // If we're inside a code block, add the line to the code content
        if (inCodeBlock) {
            codeBlockContent += (codeBlockContent ? '\n' : '') + line;
            continue;
        }

        // Skip empty lines outside of code blocks
        if (line.trim() === '') {
            continue;
        }

        // Process inline code (surrounded by backticks)
        const processInlineCode = (text) => {
            let result = [];
            let currentIndex = 0;
            let inInlineCode = false;
            let codeStart = -1;

            for (let i = 0; i < text.length; i++) {
                if (text[i] === '`') {
                    if (!inInlineCode) {
                        // Start of inline code
                        if (i > currentIndex) {
                            // Add text before code
                            result.push({
                                type: "text",
                                text: {
                                    content: text.substring(currentIndex, i)
                                }
                            });
                        }
                        inInlineCode = true;
                        codeStart = i + 1;
                    } else {
                        // End of inline code
                        result.push({
                            type: "text",
                            text: {
                                content: text.substring(codeStart, i)
                            },
                            annotations: {
                                code: true
                            }
                        });
                        inInlineCode = false;
                        currentIndex = i + 1;
                    }
                }
            }

            // Add any remaining text
            if (currentIndex < text.length) {
                result.push({
                    type: "text",
                    text: {
                        content: text.substring(currentIndex)
                    }
                });
            }

            return result.length > 0 ? result : [{
                type: "text",
                text: {
                    content: text
                }
            }];
        };

        // Check for headings
        if (line.startsWith('# ')) {
            blocks.push({
                object: "block",
                type: "heading_1",
                heading_1: {
                    rich_text: processInlineCode(line.substring(2))
                }
            });
        } else if (line.startsWith('## ')) {
            blocks.push({
                object: "block",
                type: "heading_2",
                heading_2: {
                    rich_text: processInlineCode(line.substring(3))
                }
            });
        } else if (line.startsWith('### ')) {
            blocks.push({
                object: "block",
                type: "heading_3",
                heading_3: {
                    rich_text: processInlineCode(line.substring(4))
                }
            });
        }
        // Check for bullet list
        else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            const content = line.trim().substring(2);
            blocks.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: {
                    rich_text: processInlineCode(content)
                }
            });
        }
        // Check for numbered list
        else if (/^\d+\.\s/.test(line.trim())) {
            // Find where the text starts after the number and dot
            const match = line.trim().match(/^\d+\.\s(.*)/);
            if (match && match[1]) {
                blocks.push({
                    object: "block",
                    type: "numbered_list_item",
                    numbered_list_item: {
                        rich_text: processInlineCode(match[1])
                    }
                });
            }
        }
        // Regular paragraph
        else {
            blocks.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: processInlineCode(line)
                }
            });
        }
    }

    // If we ended with an unclosed code block, add it
    if (inCodeBlock && codeBlockContent) {
        blocks.push({
            object: "block",
            type: "code",
            code: {
                rich_text: [{
                    type: "text",
                    text: {
                        content: codeBlockContent
                    }
                }],
                language: codeBlockLanguage || "plain text"
            }
        });
    }

    return blocks;
}


async function saveToNotion(request, sendResponse) {
    try {
        const { title, content, tags, url, notionApiKey, notionDatabaseId } = request;

        // Truncate content to be less than 2000 characters
        const truncatedContent = content.length > 2000
            ? content.substring(0, 1997) + "..."
            : content;

        // Convert markdown content to Notion blocks
        const blocks = convertMarkdownToNotionBlocks(truncatedContent);

        // Call Notion API to create a new page
        const response = await fetch('https://api.notion.com/v1/pages', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${notionApiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({
                parent: {
                    database_id: notionDatabaseId
                },
                properties: {
                    // Title property (required)
                    "Title": {
                        title: [
                            {
                                text: {
                                    content: title
                                }
                            }
                        ]
                    },
                    // Add URL property if your database has it
                    "URL": {
                        url: url
                    },
                    // Add Tags if your database has a multi_select field named "Tags"
                    "Tags": {
                        multi_select: tags.map(tag => ({ name: tag }))
                    }
                },
                // Add the content to the page
                children: blocks
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            sendResponse({
                success: false,
                error: `Notion API Error: ${errorData.message || 'Unknown Notion API error'}`
            });
            return;
        }

        const data = await response.json();

        // Send success response back to popup
        sendResponse({
            success: true,
            pageId: data.id
        });

    } catch (error) {
        sendResponse({ success: false, error: error.message });
    }
}