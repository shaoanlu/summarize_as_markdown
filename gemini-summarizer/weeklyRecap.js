import { NotionService, GeminiService } from './services/apiService.js';

// Legacy wrapper functions for backward compatibility
export async function getAllPagesWithContent(notionApiKey, notionDatabaseId) {
    const pages = await NotionService.getNotionPagesFromPastWeek(notionApiKey, notionDatabaseId);
    const pagesWithContent = [];

    for (const page of pages) {
        const pageContent = await NotionService.getPageContent(page.id, notionApiKey);
        
        const title = page.properties.Title?.title?.[0]?.plain_text || "Untitled";
        const url = page.properties.URL?.url || "";
        const contentText = extractTextFromBlocks(pageContent);

        pagesWithContent.push({
            id: page.id,
            title,
            url,
            content: contentText
        });
    }

    return pagesWithContent;
}

export async function generateWeeklyRecap(pagesWithContent, apiKey) {
    return await GeminiService.generateWeeklyRecap(pagesWithContent, apiKey);
}

// Helper function for text extraction (kept for compatibility)
function extractTextFromBlocks(blocks) {
    let text = "";

    for (const block of blocks) {
        const blockType = block.type;

        if (blockType === "paragraph") {
            for (const textItem of block.paragraph.rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        } else if (blockType.startsWith("heading_")) {
            for (const textItem of block[blockType].rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        } else if (blockType === "bulleted_list_item" || blockType === "numbered_list_item") {
            for (const textItem of block[blockType].rich_text) {
                text += textItem.plain_text;
            }
            text += "\n";
        } else if (["code", "quote", "callout"].includes(blockType)) {
            for (const textItem of block[blockType].rich_text) {
                text += textItem.plain_text;
            }
            text += "\n\n";
        }
    }

    return text;
}