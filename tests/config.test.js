import { describe, test, expect } from '@jest/globals';
import { CONFIG } from '../gemini-summarizer/config.js';

describe('CONFIG', () => {
  test('should have all required API configurations', () => {
    expect(CONFIG.API).toBeDefined();
    expect(CONFIG.API.GEMINI).toBeDefined();
    expect(CONFIG.API.GEMINI.BASE_URL).toBe('https://generativelanguage.googleapis.com/v1beta/models');
    expect(CONFIG.API.GEMINI.MODELS.FLASH).toBe('gemini-2.0-flash');
    expect(CONFIG.API.GEMINI.MODELS.PRO).toBe('gemini-2.0-pro-exp-02-05');
    
    expect(CONFIG.API.NOTION).toBeDefined();
    expect(CONFIG.API.NOTION.BASE_URL).toBe('https://api.notion.com/v1');
    expect(CONFIG.API.NOTION.VERSION).toBe('2022-06-28');
  });

  test('should have all storage keys defined', () => {
    expect(CONFIG.STORAGE_KEYS).toBeDefined();
    expect(CONFIG.STORAGE_KEYS.GEMINI_API_KEY).toBe('geminiApiKey');
    expect(CONFIG.STORAGE_KEYS.NOTION_API_KEY).toBe('notionApiKey');
    expect(CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID).toBe('notionDatabaseId');
  });

  test('should have UI configuration', () => {
    expect(CONFIG.UI).toBeDefined();
    expect(CONFIG.UI.POPUP_SIZES).toBeDefined();
    expect(CONFIG.UI.POPUP_SIZES.DEFAULT).toBe(420);
    expect(CONFIG.UI.POPUP_SIZES.LARGE).toBe(980);
    
    expect(CONFIG.UI.CONTENT_THRESHOLDS).toBeDefined();
    expect(CONFIG.UI.CONTENT_THRESHOLDS.SMALL).toBe(1200);
    expect(CONFIG.UI.CONTENT_THRESHOLDS.MEDIUM).toBe(2500);
  });

  test('should have proper limits defined', () => {
    expect(CONFIG.LIMITS).toBeDefined();
    expect(CONFIG.LIMITS.GEMINI_CONTENT_LIMIT).toBe(300000);
    expect(CONFIG.LIMITS.SUMMARY_CHARACTER_LIMIT).toBe(4000);
    expect(CONFIG.LIMITS.WEEKLY_RECAP_MAX_CONTENT).toBe(100000);
    expect(CONFIG.LIMITS.WEEKLY_RECAP_WORD_LIMIT).toBe(500);
    expect(CONFIG.LIMITS.NOTION_BLOCKS_PER_CHUNK).toBe(1000);
  });

  test('should have timeout configurations', () => {
    expect(CONFIG.TIMEOUTS).toBeDefined();
    expect(CONFIG.TIMEOUTS.COPY_STATUS_DISPLAY).toBe(2000);
    expect(CONFIG.TIMEOUTS.AUTO_COPY_STATUS_DISPLAY).toBe(3000);
  });

  test('should have error messages defined', () => {
    expect(CONFIG.MESSAGES.ERRORS).toBeDefined();
    expect(CONFIG.MESSAGES.ERRORS.NO_CONTENT).toBe('No content found to summarize');
    expect(CONFIG.MESSAGES.ERRORS.NO_SUMMARY).toBe('No summary generated');
    expect(CONFIG.MESSAGES.ERRORS.INVALID_API_KEY).toBe('Please enter a valid API key');
  });

  test('should have success messages defined', () => {
    expect(CONFIG.MESSAGES.SUCCESS).toBeDefined();
    expect(CONFIG.MESSAGES.SUCCESS.API_KEY_SAVED).toBe('API key saved successfully!');
    expect(CONFIG.MESSAGES.SUCCESS.COPIED).toBe('Copied!');
    expect(CONFIG.MESSAGES.SUCCESS.AUTO_COPIED).toBe('Auto-copied to clipboard!');
  });

  test('should have CSS selectors defined', () => {
    expect(CONFIG.SELECTORS).toBeDefined();
    expect(CONFIG.SELECTORS.CONTENT_EXTRACTION).toBeDefined();
    expect(CONFIG.SELECTORS.CONTENT_EXTRACTION.ARTICLE).toBe('article');
    expect(CONFIG.SELECTORS.CONTENT_EXTRACTION.MAIN).toBe('main');
  });
});