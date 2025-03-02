// weeklyRecap.js

// Function to get pages from the past week from Notion database
async function getNotionPagesFromPastWeek(notionApiKey, notionDatabaseId) {
    try {
        const base_url = "https://api.notion.com/v1";

        const headers = {
            "Authorization": `Bearer ${notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        };

        // Query pages from the database with a past week filter
        const query_payload = {
            "filter": {
                "property": "Date",
                "date": {
                    "past_week": {}
                }
            }
        };

        const response = await fetch(`${base_url}/databases/${notionDatabaseId}/query`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(query_payload)
        });

        if (!response.ok) {
            throw new Error(`Error retrieving pages: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Error in getNotionPagesFromPastWeek:", error);
        throw error;
    }
}

// Function to get content for a specific page
async function getPageContent(pageId, notionApiKey) {
    try {
        const base_url = "https://api.notion.com/v1";

        const headers = {
            "Authorization": `Bearer ${notionApiKey}`,
            "Content-Type": "application/json",
            "Notion-Version": "2022-06-28"
        };

        const response = await fetch(`${base_url}/blocks/${pageId}/children`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Error retrieving page content: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return data.results || [];
    } catch (error) {
        console.error("Error in getPageContent:", error);
        throw error;
    }
}

// Function to extract text from Notion blocks
function extractTextFromBlocks(blocks) {
    let text = "";

    for (const block of blocks) {
        const blockType = block.type;

        if (blockType === "paragraph") {
            for (const textItem of block.paragraph.rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        }
        else if (blockType.startsWith("heading_")) {
            for (const textItem of block[blockType].rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        }
        else if (blockType === "bulleted_list_item" || blockType === "numbered_list_item") {
            for (const textItem of block[blockType].rich_text) {
                text += textItem.plain_text;
            }
            text += "\n";
        }
        else if (blockType === "code") {
            for (const textItem of block.code.rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        }
        else if (blockType === "quote") {
            for (const textItem of block.quote.rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        }
        else if (blockType === "callout") {
            for (const textItem of block.callout.rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        }
    }

    return text;
}

// Main function to get all pages from past week with their content
async function getAllPagesWithContent(notionApiKey, notionDatabaseId) {
    try {
        // Get all pages from the past week
        const pages = await getNotionPagesFromPastWeek(notionApiKey, notionDatabaseId);

        const pagesWithContent = [];

        // For each page, get its content
        for (const page of pages) {
            const pageId = page.id;
            const pageContent = await getPageContent(pageId, notionApiKey);

            // Extract title from page properties
            let title = "Untitled";
            if (page.properties.Title && page.properties.Title.title && page.properties.Title.title.length > 0) {
                title = page.properties.Title.title[0].plain_text;
            }

            // Extract URL if available
            let url = "";
            if (page.properties.URL && page.properties.URL.url) {
                url = page.properties.URL.url;
            }

            // Extract text content from blocks
            const contentText = extractTextFromBlocks(pageContent);

            pagesWithContent.push({
                id: pageId,
                title: title,
                url: url,
                content: contentText
            });
        }

        return pagesWithContent;
    } catch (error) {
        console.error("Error in getAllPagesWithContent:", error);
        throw error;
    }
}

// Function to generate a weekly recap using Google's Gemini API
async function generateWeeklyRecap(pagesWithContent, apiKey) {
    try {
        // Combine all content into one string
        let combinedContent = pagesWithContent.map(page => {
            return `Title: ${page.title}\nURL: ${page.url}\n\nContent:\n${page.content}\n---\n`;
        }).join("\n");

        // Truncate if too long (Gemini has input limits)
        const maxLength = 100000;
        if (combinedContent.length > maxLength) {
            combinedContent = combinedContent.substring(0, maxLength) + "... [content truncated due to length]";
        }

        // Create prompt for Gemini
        const prompt = `
  Analyze my saved tweets and web articles from this past week. Organize the content into meaningful categories such as career, health, relationships, skills, or any emergent themes. Keep it less than 500 words
  
  For each category:
  
  Extract 1-3 key actionable insights from the content, focusing on takeaways that could inform decisions or actions.
  Identify connections between different pieces of content, even if they seem unrelated, to uncover deeper themes or evolving interests.
  Suggest 1-2 small, concrete action steps I could take in the coming week based on the insights.
  Compare this week's insights with previous weeks to track recurring themes, progress, or shifts in focus.
  Provide at least one contrarian or alternative perspective on a key idea to challenge my assumptions.
  Finally, synthesize everything into a cohesive 'weekly learning narrative' that highlights my overarching themes and key takeaways. In addition, propose innovative and creative ideas that combine concepts/approaches/insights from them.
  
  Here are the saved content items from the past week:
  
  ${combinedContent}`;

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
            throw new Error(`API Error: ${errorData.error?.message || 'Unknown API error'}`);
        }

        const data = await response.json();

        // Extract the recap text
        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
            throw new Error("No recap generated");
        }

        return data.candidates[0].content.parts[0].text;
    } catch (error) {
        console.error("Error generating weekly recap:", error);
        throw error;
    }
}

export { getAllPagesWithContent, generateWeeklyRecap };