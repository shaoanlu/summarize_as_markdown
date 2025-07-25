export const CONFIG = {
  API: {
    GEMINI: {
      BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models',
      MODELS: {
        FLASH: 'gemini-2.0-flash',
        PRO: 'gemini-2.0-pro-exp-02-05'
      }
    },
    NOTION: {
      BASE_URL: 'https://api.notion.com/v1',
      VERSION: '2022-06-28'
    }
  },
  
  STORAGE_KEYS: {
    GEMINI_API_KEY: 'geminiApiKey',
    NOTION_API_KEY: 'notionApiKey',
    NOTION_DATABASE_ID: 'notionDatabaseId'
  },
  
  UI: {
    POPUP_SIZES: {
      DEFAULT: 420,
      SMALL: 450,
      MEDIUM: 700,
      LARGE: 980
    },
    CONTENT_THRESHOLDS: {
      SMALL: 1200,
      MEDIUM: 2500
    }
  },
  
  LIMITS: {
    GEMINI_CONTENT_LIMIT: 300000,
    SUMMARY_CHARACTER_LIMIT: 4000,
    WEEKLY_RECAP_MAX_CONTENT: 100000,
    WEEKLY_RECAP_WORD_LIMIT: 500,
    NOTION_BLOCKS_PER_CHUNK: 1000
  },
  
  TIMEOUTS: {
    COPY_STATUS_DISPLAY: 2000,
    AUTO_COPY_STATUS_DISPLAY: 3000
  },
  
  SELECTORS: {
    CONTENT_EXTRACTION: {
      ARTICLE: 'article',
      MAIN: 'main',
      TEXT_ELEMENTS: 'p, h1, h2, h3, h4, h5, h6',
      AUTHOR: '[rel="author"], .author, .byline, [itemprop="author"]',
      SITE_NAME: '[property="og:site_name"]'
    }
  },
  
  MESSAGES: {
    ERRORS: {
      NO_CONTENT: 'No content found to summarize',
      NO_SUMMARY: 'No summary generated',
      NO_RECAP: 'No recap generated',
      INVALID_API_KEY: 'Please enter a valid API key',
      NOTION_CREDENTIALS_MISSING: 'Notion credentials not found',
      NOTION_SETUP_REQUIRED: 'Please ensure Notion API Key, Notion Database ID, and Gemini API Key are set.',
      PAGE_ACCESS_ERROR: 'Error accessing page content: '
    },
    SUCCESS: {
      API_KEY_SAVED: 'API key saved successfully!',
      NOTION_API_KEY_SAVED: 'Notion API Key saved!',
      NOTION_DATABASE_ID_SAVED: 'Notion Database ID saved!',
      NOTION_SAVE_SUCCESS: 'Saved to Notion successfully!',
      COPIED: 'Copied!',
      AUTO_COPIED: 'Auto-copied to clipboard!'
    },
    STATUS: {
      GENERATING_SUMMARY: 'Generating summary...',
      FETCHING_SUMMARIES: 'Fetching past week\'s summaries...',
      GENERATING_RECAP: 'Generating weekly recap...',
      SAVING_TO_NOTION: 'Saving...'
    }
  }
};