import { CONFIG } from '../config.js';

export class GeminiService {
  static async summarizeContent({ url, title, content, apiKey }) {
    const contentString = typeof content === 'string' ? content :
      (content && content.content ? content.content : JSON.stringify(content));

    if (!contentString || contentString.trim().length === 0) {
      throw new Error(CONFIG.MESSAGES.ERRORS.NO_CONTENT);
    }

    const sourceInfo = content && content.sourceInfo ? content.sourceInfo : 'Unknown source';
    const prompt = this._createSummaryPrompt(title, url, sourceInfo, contentString);

    const response = await fetch(
      `${CONFIG.API.GEMINI.BASE_URL}/${CONFIG.API.GEMINI.MODELS.FLASH}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || 'Unknown API error'}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      throw new Error(CONFIG.MESSAGES.ERRORS.NO_SUMMARY);
    }

    return data.candidates[0].content.parts[0].text;
  }

  static async generateWeeklyRecap(pagesWithContent, apiKey) {
    let combinedContent = pagesWithContent.map(page => 
      `Title: ${page.title}\nURL: ${page.url}\n\nContent:\n${page.content}\n---\n`
    ).join("\n");

    if (combinedContent.length > CONFIG.LIMITS.WEEKLY_RECAP_MAX_CONTENT) {
      combinedContent = combinedContent.substring(0, CONFIG.LIMITS.WEEKLY_RECAP_MAX_CONTENT) + 
        "... [content truncated due to length]";
    }

    const prompt = this._createWeeklyRecapPrompt(combinedContent);

    const response = await fetch(
      `${CONFIG.API.GEMINI.BASE_URL}/${CONFIG.API.GEMINI.MODELS.PRO}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error?.message || 'Unknown API error'}`);
    }

    const data = await response.json();

    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
      throw new Error(CONFIG.MESSAGES.ERRORS.NO_RECAP);
    }

    return data.candidates[0].content.parts[0].text;
  }

  static _createSummaryPrompt(title, url, sourceInfo, contentString) {
    return `
Summarize content, within ${CONFIG.LIMITS.SUMMARY_CHARACTER_LIMIT} characters, the following from ${title}.
Content: ${contentString.substring(0, CONFIG.LIMITS.GEMINI_CONTENT_LIMIT)}...

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
  }

  static _createWeeklyRecapPrompt(combinedContent) {
    return `
Analyze the saved summaries of web articles from this past week. Organize the content into meaningful categories such as career, health, relationships, skills, or any emergent themes.
Keep it less than ${CONFIG.LIMITS.WEEKLY_RECAP_WORD_LIMIT} words and go straight to the point without beginning with sth. like 'Okay, here's an analysis of your web article summaries, ...'.

First, extract the main themes and key insights from the content.

Then, for each category:
Extract 1-3 key actionable insights from the content, focusing on takeaways that could inform decisions or actions.
Identify connections between different pieces of content, even if they seem unrelated, to uncover deeper themes or evolving interests.
Suggest 1-2 small, concrete action steps I could take in the coming week based on the insights.
Compare this week's insights with previous weeks to track recurring themes, progress, or shifts in focus.
Provide at least one contrarian or alternative perspective on a key idea to challenge the assumptions.

Finally, synthesize everything into a cohesive 'weekly learning narrative' that highlights the overarching themes and key takeaways
In addition, propose innovative and creative ideas that combine concepts/approaches/insights from them.

Content from the past week:

${combinedContent}`;
  }
}

export class NotionService {
  static async saveToNotion({ title, content, tags, url, notionApiKey, notionDatabaseId }) {
    const currentDate = new Date().toISOString().split('T')[0];
    const { convertMarkdownToNotionBlocks } = await import('../notionUtils.js');
    const blocks = convertMarkdownToNotionBlocks(content);

    const blockChunks = this._chunkBlocks(blocks);
    const pageData = await this._createNotionPage({
      title, url, tags, currentDate, notionApiKey, notionDatabaseId, blocks: blockChunks[0]
    });

    if (blockChunks.length > 1) {
      await this._appendRemainingBlocks(pageData.id, blockChunks.slice(1), notionApiKey);
    }

    return pageData.id;
  }

  static async getNotionPagesFromPastWeek(notionApiKey, notionDatabaseId) {
    const response = await fetch(`${CONFIG.API.NOTION.BASE_URL}/databases/${notionDatabaseId}/query`, {
      method: 'POST',
      headers: this._getNotionHeaders(notionApiKey),
      body: JSON.stringify({
        filter: {
          property: "Date",
          date: { past_week: {} }
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error retrieving pages: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  static async getPageContent(pageId, notionApiKey) {
    const response = await fetch(`${CONFIG.API.NOTION.BASE_URL}/blocks/${pageId}/children`, {
      method: 'GET',
      headers: this._getNotionHeaders(notionApiKey)
    });

    if (!response.ok) {
      throw new Error(`Error retrieving page content: ${response.status} ${await response.text()}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  static _chunkBlocks(blocks) {
    const chunks = [];
    for (let i = 0; i < blocks.length; i += CONFIG.LIMITS.NOTION_BLOCKS_PER_CHUNK) {
      chunks.push(blocks.slice(i, i + CONFIG.LIMITS.NOTION_BLOCKS_PER_CHUNK));
    }
    return chunks;
  }

  static async _createNotionPage({ title, url, tags, currentDate, notionApiKey, notionDatabaseId, blocks }) {
    const response = await fetch(`${CONFIG.API.NOTION.BASE_URL}/pages`, {
      method: 'POST',
      headers: this._getNotionHeaders(notionApiKey),
      body: JSON.stringify({
        parent: { database_id: notionDatabaseId },
        properties: {
          "Title": { title: [{ text: { content: title } }] },
          "URL": { url: url },
          "Tags": { multi_select: tags.map(tag => ({ name: tag })) },
          "Date": { date: { start: currentDate } }
        },
        children: blocks
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Notion API Error: ${errorData.message || 'Unknown Notion API error'}`);
    }

    return response.json();
  }

  static async _appendRemainingBlocks(pageId, blockChunks, notionApiKey) {
    for (const chunk of blockChunks) {
      const response = await fetch(`${CONFIG.API.NOTION.BASE_URL}/blocks/${pageId}/children`, {
        method: 'PATCH',
        headers: this._getNotionHeaders(notionApiKey),
        body: JSON.stringify({ children: chunk })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Some content couldn't be added: ${errorData.message || 'Unknown Notion API error'}`);
      }
    }
  }

  static _getNotionHeaders(apiKey) {
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': CONFIG.API.NOTION.VERSION
    };
  }
}