import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { GeminiService, NotionService } from '../../gemini-summarizer/services/apiService.js';
import { PopupController } from '../../gemini-summarizer/ui/popupController.js';

// Mock the entire flow
describe('Extension Integration Tests', () => {
  let mockFetch;
  let mockChrome;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock fetch globally
    mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock Chrome APIs
    mockChrome = {
      storage: {
        local: {
          get: jest.fn(),
          set: jest.fn()
        }
      },
      tabs: {
        query: jest.fn()
      },
      scripting: {
        executeScript: jest.fn()
      },
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        }
      }
    };
    global.chrome = mockChrome;

    // Mock DOM
    global.document = {
      getElementById: jest.fn(() => ({
        value: '',
        textContent: '',
        innerHTML: '',
        style: {},
        disabled: false,
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        },
        addEventListener: jest.fn()
      })),
      body: { style: {} }
    };

    // Mock navigator
    global.navigator = {
      clipboard: {
        writeText: jest.fn().mockResolvedValue()
      }
    };
  });

  describe('Complete Summarization Flow', () => {
    test('should complete end-to-end summarization', async () => {
      // Mock successful Gemini API response
      const mockSummaryResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '# Summary of Test Article\n\n* URL: https://example.com\n* Date: 2024-01-01\n* Source: Example.com\n* Suggested Tags: test, article, example\n\n## Summary\nThis is a test article summary.\n\n## Key Points\n- Point 1\n- Point 2'
            }]
          }
        }]
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSummaryResponse)
      });

      // Test the service call
      const result = await GeminiService.summarizeContent({
        url: 'https://example.com',
        title: 'Test Article',
        content: 'This is test content for the article.',
        apiKey: 'test-gemini-key'
      });

      expect(result).toContain('# Summary of Test Article');
      expect(result).toContain('This is a test article summary');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gemini-2.0-flash:generateContent'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    test('should handle summarization errors gracefully', async () => {
      // Mock API error
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          error: { message: 'API quota exceeded' }
        })
      });

      await expect(GeminiService.summarizeContent({
        url: 'https://example.com',
        title: 'Test Article',
        content: 'Test content',
        apiKey: 'invalid-key'
      })).rejects.toThrow('API Error: API quota exceeded');
    });
  });

  describe('Complete Notion Save Flow', () => {
    test('should save summary to Notion successfully', async () => {
      // Mock successful Notion API response
      const mockNotionResponse = {
        id: 'page-123',
        url: 'https://notion.so/page-123'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockNotionResponse)
      });

      // Mock the convertMarkdownToNotionBlocks function
      jest.doMock('../../gemini-summarizer/notionUtils.js', () => ({
        convertMarkdownToNotionBlocks: jest.fn(() => [
          {
            type: 'heading_1',
            heading_1: {
              rich_text: [{ type: 'text', text: { content: 'Test Summary' } }]
            }
          }
        ])
      }), { virtual: true });

      const result = await NotionService.saveToNotion({
        title: 'Test Article',
        content: '# Test Summary\n\nThis is a test summary.',
        tags: ['test', 'article'],
        url: 'https://example.com',
        notionApiKey: 'test-notion-key',
        notionDatabaseId: 'test-db-id'
      });

      expect(result).toBe('page-123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/pages'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-notion-key'
          })
        })
      );
    });

    test('should handle Notion save errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({
          message: 'Invalid database ID'
        })
      });

      jest.doMock('../../gemini-summarizer/notionUtils.js', () => ({
        convertMarkdownToNotionBlocks: jest.fn(() => [])
      }), { virtual: true });

      await expect(NotionService.saveToNotion({
        title: 'Test',
        content: 'Test content',
        tags: [],
        url: 'https://example.com',
        notionApiKey: 'test-key',
        notionDatabaseId: 'invalid-db'
      })).rejects.toThrow('Notion API Error: Invalid database ID');
    });
  });

  describe('Weekly Recap Flow', () => {
    test('should generate weekly recap from Notion pages', async () => {
      // Mock Notion pages query response
      const mockPagesResponse = {
        results: [
          {
            id: 'page1',
            properties: {
              Title: { title: [{ plain_text: 'Article 1' }] },
              URL: { url: 'https://example1.com' }
            }
          },
          {
            id: 'page2',
            properties: {
              Title: { title: [{ plain_text: 'Article 2' }] },
              URL: { url: 'https://example2.com' }
            }
          }
        ]
      };

      // Mock page content responses
      const mockContentResponse = {
        results: [
          {
            type: 'paragraph',
            paragraph: {
              rich_text: [{ plain_text: 'This is article content.' }]
            }
          }
        ]
      };

      // Mock Gemini recap response
      const mockRecapResponse = {
        candidates: [{
          content: {
            parts: [{
              text: '# Weekly Learning Recap\n\nThis week you explored various topics including...'
            }]
          }
        }]
      };

      // Setup fetch mock to return different responses in sequence
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPagesResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockContentResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockContentResponse)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockRecapResponse)
        });

      // Get pages from Notion
      const pages = await NotionService.getNotionPagesFromPastWeek('notion-key', 'db-id');
      expect(pages).toHaveLength(2);

      // Get content for first page
      const content1 = await NotionService.getPageContent('page1', 'notion-key');
      expect(content1).toHaveLength(1);

      // Get content for second page
      const content2 = await NotionService.getPageContent('page2', 'notion-key');
      expect(content2).toHaveLength(1);

      // Generate weekly recap
      const mockPagesWithContent = [
        {
          id: 'page1',
          title: 'Article 1',
          url: 'https://example1.com',
          content: 'This is article content.'
        },
        {
          id: 'page2',
          title: 'Article 2',
          url: 'https://example2.com',
          content: 'This is article content.'
        }
      ];

      const recap = await GeminiService.generateWeeklyRecap(mockPagesWithContent, 'gemini-key');
      expect(recap).toContain('Weekly Learning Recap');
      expect(recap).toContain('This week you explored');
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle network failures gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network failure'));

      await expect(GeminiService.summarizeContent({
        url: 'https://example.com',
        title: 'Test',
        content: 'Test content',
        apiKey: 'test-key'
      })).rejects.toThrow('Network failure');
    });

    test('should handle rate limiting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: () => Promise.resolve({
          error: { message: 'Rate limit exceeded' }
        })
      });

      await expect(GeminiService.summarizeContent({
        url: 'https://example.com',
        title: 'Test',
        content: 'Test content',
        apiKey: 'test-key'
      })).rejects.toThrow('API Error: Rate limit exceeded');
    });

    test('should handle invalid API responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          candidates: [] // Empty candidates array
        })
      });

      await expect(GeminiService.summarizeContent({
        url: 'https://example.com',
        title: 'Test',
        content: 'Test content',
        apiKey: 'test-key'
      })).rejects.toThrow('No summary generated');
    });
  });

  describe('Chrome Extension API Integration', () => {
    test('should interact with Chrome storage correctly', async () => {
      mockChrome.storage.local.get.mockImplementation((keys, callback) => {
        callback({
          geminiApiKey: 'stored-gemini-key',
          notionApiKey: 'stored-notion-key',
          notionDatabaseId: 'stored-db-id'
        });
      });

      mockChrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      // Test storage operations
      const getPromise = new Promise(resolve => {
        mockChrome.storage.local.get(['geminiApiKey'], resolve);
      });

      const result = await getPromise;
      expect(result.geminiApiKey).toBe('stored-gemini-key');

      const setPromise = new Promise(resolve => {
        mockChrome.storage.local.set({ testKey: 'testValue' }, resolve);
      });

      await setPromise;
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        { testKey: 'testValue' },
        expect.any(Function)
      );
    });

    test('should handle tab operations', async () => {
      const mockTab = {
        id: 1,
        url: 'https://example.com',
        title: 'Example Page'
      };

      mockChrome.tabs.query.mockImplementation((query, callback) => {
        callback([mockTab]);
      });

      mockChrome.scripting.executeScript.mockImplementation((options, callback) => {
        callback([{
          result: {
            title: 'Example Page',
            content: 'Page content',
            sourceInfo: 'example.com'
          }
        }]);
      });

      // Test tab query
      const tabPromise = new Promise(resolve => {
        mockChrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });

      const tabs = await tabPromise;
      expect(tabs[0]).toEqual(mockTab);

      // Test script execution
      const scriptPromise = new Promise(resolve => {
        mockChrome.scripting.executeScript({
          target: { tabId: 1 },
          function: () => ({ title: 'test' })
        }, resolve);
      });

      const scriptResult = await scriptPromise;
      expect(scriptResult[0].result.title).toBe('Example Page');
    });
  });
});