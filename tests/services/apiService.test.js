import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { GeminiService, NotionService } from '../../gemini-summarizer/services/apiService.js';
import { CONFIG } from '../../gemini-summarizer/config.js';

// Mock fetch globally
global.fetch = jest.fn();

describe('GeminiService', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('summarizeContent', () => {
    const mockRequest = {
      url: 'https://example.com',
      title: 'Test Article',
      content: 'This is test content for summarization',
      apiKey: 'test-api-key'
    };

    test('should successfully summarize content', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'This is a test summary' }]
          }
        }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await GeminiService.summarizeContent(mockRequest);
      
      expect(result).toBe('This is a test summary');
      expect(fetch).toHaveBeenCalledWith(
        `${CONFIG.API.GEMINI.BASE_URL}/${CONFIG.API.GEMINI.MODELS.FLASH}:generateContent?key=test-api-key`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    test('should handle content object with nested content', async () => {
      const requestWithNestedContent = {
        ...mockRequest,
        content: { content: 'Nested content', sourceInfo: 'Test Source' }
      };

      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Summary of nested content' }]
          }
        }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await GeminiService.summarizeContent(requestWithNestedContent);
      expect(result).toBe('Summary of nested content');
    });

    test('should throw error for empty content', async () => {
      const requestWithEmptyContent = {
        ...mockRequest,
        content: ''
      };

      await expect(GeminiService.summarizeContent(requestWithEmptyContent))
        .rejects.toThrow(CONFIG.MESSAGES.ERRORS.NO_CONTENT);
    });

    test('should handle API errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'API quota exceeded' }
        })
      });

      await expect(GeminiService.summarizeContent(mockRequest))
        .rejects.toThrow('API Error: API quota exceeded');
    });

    test('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network failure'));

      await expect(GeminiService.summarizeContent(mockRequest))
        .rejects.toThrow('Network failure');
    });

    test('should handle missing candidates in response', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ candidates: [] })
      });

      await expect(GeminiService.summarizeContent(mockRequest))
        .rejects.toThrow(CONFIG.MESSAGES.ERRORS.NO_SUMMARY);
    });
  });

  describe('generateWeeklyRecap', () => {
    const mockPagesWithContent = [
      {
        title: 'Article 1',
        url: 'https://example1.com',
        content: 'Content of article 1'
      },
      {
        title: 'Article 2',
        url: 'https://example2.com',
        content: 'Content of article 2'
      }
    ];

    test('should successfully generate weekly recap', async () => {
      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'This is a weekly recap summary' }]
          }
        }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await GeminiService.generateWeeklyRecap(mockPagesWithContent, 'test-api-key');
      
      expect(result).toBe('This is a weekly recap summary');
      expect(fetch).toHaveBeenCalledWith(
        `${CONFIG.API.GEMINI.BASE_URL}/${CONFIG.API.GEMINI.MODELS.PRO}:generateContent?key=test-api-key`,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    test('should truncate content if too long', async () => {
      const longContent = 'x'.repeat(CONFIG.LIMITS.WEEKLY_RECAP_MAX_CONTENT + 1000);
      const longPages = [{
        title: 'Long Article',
        url: 'https://example.com',
        content: longContent
      }];

      const mockResponse = {
        candidates: [{
          content: {
            parts: [{ text: 'Truncated recap' }]
          }
        }]
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await GeminiService.generateWeeklyRecap(longPages, 'test-api-key');
      expect(result).toBe('Truncated recap');
      
      // Verify the request body contains truncated content
      const lastCall = fetch.mock.calls[fetch.mock.calls.length - 1];
      const requestBody = JSON.parse(lastCall[1].body);
      const promptContent = requestBody.contents[0].parts[0].text;
      expect(promptContent).toContain('[content truncated due to length]');
    });

    test('should handle API errors for weekly recap', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'Model not available' }
        })
      });

      await expect(GeminiService.generateWeeklyRecap(mockPagesWithContent, 'test-api-key'))
        .rejects.toThrow('API Error: Model not available');
    });
  });
});

describe('NotionService', () => {
  beforeEach(() => {
    fetch.mockClear();
  });

  describe('saveToNotion', () => {
    const mockSaveRequest = {
      title: 'Test Page',
      content: '# Test Content\n\nThis is test content.',
      tags: ['tag1', 'tag2'],
      url: 'https://example.com',
      notionApiKey: 'notion-api-key',
      notionDatabaseId: 'database-id'
    };

    test('should successfully save to Notion', async () => {
      // Mock the convertMarkdownToNotionBlocks import
      const mockBlocks = [
        { type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: 'Test Content' } }] } },
        { type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'This is test content.' } }] } }
      ];

      // Mock dynamic import
      jest.doMock('../../gemini-summarizer/notionUtils.js', () => ({
        convertMarkdownToNotionBlocks: jest.fn(() => mockBlocks)
      }), { virtual: true });

      const mockCreateResponse = {
        id: 'page-id-123'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCreateResponse)
      });

      const result = await NotionService.saveToNotion(mockSaveRequest);
      
      expect(result).toBe('page-id-123');
      expect(fetch).toHaveBeenCalledWith(
        `${CONFIG.API.NOTION.BASE_URL}/pages`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer notion-api-key',
            'Content-Type': 'application/json',
            'Notion-Version': CONFIG.API.NOTION.VERSION
          })
        })
      );
    });

    test('should handle Notion API errors', async () => {
      jest.doMock('../../gemini-summarizer/notionUtils.js', () => ({
        convertMarkdownToNotionBlocks: jest.fn(() => [])
      }), { virtual: true });

      fetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          message: 'Invalid database_id'
        })
      });

      await expect(NotionService.saveToNotion(mockSaveRequest))
        .rejects.toThrow('Notion API Error: Invalid database_id');
    });
  });

  describe('getNotionPagesFromPastWeek', () => {
    test('should successfully fetch pages from past week', async () => {
      const mockPages = [
        { id: 'page1', properties: { Title: { title: [{ plain_text: 'Page 1' }] } } },
        { id: 'page2', properties: { Title: { title: [{ plain_text: 'Page 2' }] } } }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: mockPages })
      });

      const result = await NotionService.getNotionPagesFromPastWeek('api-key', 'db-id');
      
      expect(result).toEqual(mockPages);
      expect(fetch).toHaveBeenCalledWith(
        `${CONFIG.API.NOTION.BASE_URL}/databases/db-id/query`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer api-key'
          }),
          body: JSON.stringify({
            filter: {
              property: "Date",
              date: { past_week: {} }
            }
          })
        })
      );
    });

    test('should handle API errors when fetching pages', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Database not found')
      });

      await expect(NotionService.getNotionPagesFromPastWeek('api-key', 'invalid-db-id'))
        .rejects.toThrow('Error retrieving pages: 404 Database not found');
    });
  });

  describe('getPageContent', () => {
    test('should successfully fetch page content', async () => {
      const mockBlocks = [
        { type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Content block 1' }] } },
        { type: 'heading_1', heading_1: { rich_text: [{ plain_text: 'Heading' }] } }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: mockBlocks })
      });

      const result = await NotionService.getPageContent('page-id', 'api-key');
      
      expect(result).toEqual(mockBlocks);
      expect(fetch).toHaveBeenCalledWith(
        `${CONFIG.API.NOTION.BASE_URL}/blocks/page-id/children`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': 'Bearer api-key'
          })
        })
      );
    });

    test('should handle errors when fetching page content', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve('Access denied')
      });

      await expect(NotionService.getPageContent('page-id', 'api-key'))
        .rejects.toThrow('Error retrieving page content: 403 Access denied');
    });
  });

  describe('_chunkBlocks', () => {
    test('should chunk blocks correctly', () => {
      const blocks = Array.from({ length: 2500 }, (_, i) => ({ id: i }));
      const chunks = NotionService._chunkBlocks(blocks);
      
      expect(chunks).toHaveLength(3); // 1000 + 1000 + 500
      expect(chunks[0]).toHaveLength(1000);
      expect(chunks[1]).toHaveLength(1000);
      expect(chunks[2]).toHaveLength(500);
    });
  });
});