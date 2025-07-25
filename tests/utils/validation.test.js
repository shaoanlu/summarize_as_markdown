import { describe, test, expect } from '@jest/globals';
import { ValidationUtils, ErrorHandler } from '../../gemini-summarizer/utils/validation.js';

describe('ValidationUtils', () => {
  describe('validateApiKey', () => {
    test('should accept valid API key', () => {
      const validKey = 'sk-1234567890abcdef';
      expect(ValidationUtils.validateApiKey(validKey)).toBe(validKey);
    });

    test('should trim whitespace from API key', () => {
      const keyWithSpaces = '  sk-1234567890abcdef  ';
      expect(ValidationUtils.validateApiKey(keyWithSpaces)).toBe('sk-1234567890abcdef');
    });

    test('should throw error for empty API key', () => {
      expect(() => ValidationUtils.validateApiKey('')).toThrow('Please enter a valid API key');
      expect(() => ValidationUtils.validateApiKey('   ')).toThrow('Please enter a valid API key');
      expect(() => ValidationUtils.validateApiKey(null)).toThrow('Please enter a valid API key');
      expect(() => ValidationUtils.validateApiKey(undefined)).toThrow('Please enter a valid API key');
    });

    test('should throw error for non-string API key', () => {
      expect(() => ValidationUtils.validateApiKey(123)).toThrow('Please enter a valid API key');
      expect(() => ValidationUtils.validateApiKey({})).toThrow('Please enter a valid API key');
    });
  });

  describe('validateNotionCredentials', () => {
    test('should accept valid Notion credentials', () => {
      const result = ValidationUtils.validateNotionCredentials('secret_123', 'db_456');
      expect(result).toEqual({
        apiKey: 'secret_123',
        databaseId: 'db_456'
      });
    });

    test('should trim whitespace from credentials', () => {
      const result = ValidationUtils.validateNotionCredentials('  secret_123  ', '  db_456  ');
      expect(result).toEqual({
        apiKey: 'secret_123',
        databaseId: 'db_456'
      });
    });

    test('should throw error for invalid API key', () => {
      expect(() => ValidationUtils.validateNotionCredentials('', 'db_456')).toThrow('Invalid Notion API Key');
      expect(() => ValidationUtils.validateNotionCredentials(null, 'db_456')).toThrow('Invalid Notion API Key');
    });

    test('should throw error for invalid database ID', () => {
      expect(() => ValidationUtils.validateNotionCredentials('secret_123', '')).toThrow('Invalid Notion Database ID');
      expect(() => ValidationUtils.validateNotionCredentials('secret_123', null)).toThrow('Invalid Notion Database ID');
    });

    test('should throw combined error for both invalid credentials', () => {
      expect(() => ValidationUtils.validateNotionCredentials('', '')).toThrow('Invalid Notion API Key, Invalid Notion Database ID');
    });
  });

  describe('validateContentData', () => {
    test('should accept valid string content', () => {
      const content = 'This is valid content';
      expect(ValidationUtils.validateContentData(content)).toBe(content);
    });

    test('should extract content from object', () => {
      const contentObj = { content: 'Extracted content' };
      expect(ValidationUtils.validateContentData(contentObj)).toBe('Extracted content');
    });

    test('should stringify complex objects', () => {
      const contentObj = { title: 'Test', data: 'complex' };
      expect(ValidationUtils.validateContentData(contentObj)).toBe('{"title":"Test","data":"complex"}');
    });

    test('should throw error for empty content', () => {
      expect(() => ValidationUtils.validateContentData('')).toThrow('No content found to summarize');
      expect(() => ValidationUtils.validateContentData({ content: '' })).toThrow('No content found to summarize');
      expect(() => ValidationUtils.validateContentData(null)).toThrow('No content found to summarize');
    });
  });

  describe('validateUrl', () => {
    test('should accept valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://sub.domain.co.uk/path?query=value'
      ];
      
      validUrls.forEach(url => {
        expect(ValidationUtils.validateUrl(url)).toBe(url);
      });
    });

    test('should throw error for invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://invalid',
        '',
        'javascript:alert(1)'
      ];
      
      invalidUrls.forEach(url => {
        expect(() => ValidationUtils.validateUrl(url)).toThrow('Invalid URL provided');
      });
    });
  });

  describe('validateTitle', () => {
    test('should accept valid titles', () => {
      expect(ValidationUtils.validateTitle('Valid Title')).toBe('Valid Title');
    });

    test('should trim whitespace from titles', () => {
      expect(ValidationUtils.validateTitle('  Spaced Title  ')).toBe('Spaced Title');
    });

    test('should return "Untitled" for invalid titles', () => {
      expect(ValidationUtils.validateTitle('')).toBe('Untitled');
      expect(ValidationUtils.validateTitle('   ')).toBe('Untitled');
      expect(ValidationUtils.validateTitle(null)).toBe('Untitled');
      expect(ValidationUtils.validateTitle(undefined)).toBe('Untitled');
      expect(ValidationUtils.validateTitle(123)).toBe('Untitled');
    });
  });

  describe('validateTags', () => {
    test('should accept valid tag arrays', () => {
      const tags = ['tag1', 'tag2', 'tag3'];
      expect(ValidationUtils.validateTags(tags)).toEqual(tags);
    });

    test('should filter out invalid tags', () => {
      const tags = ['valid', '', null, undefined, 'another-valid', 123];
      expect(ValidationUtils.validateTags(tags)).toEqual(['valid', 'another-valid']);
    });

    test('should trim whitespace from tags', () => {
      const tags = ['  tag1  ', '  tag2  '];
      expect(ValidationUtils.validateTags(tags)).toEqual(['tag1', 'tag2']);
    });

    test('should limit to 10 tags', () => {
      const tags = Array.from({ length: 15 }, (_, i) => `tag${i}`);
      const result = ValidationUtils.validateTags(tags);
      expect(result).toHaveLength(10);
      expect(result).toEqual(tags.slice(0, 10));
    });

    test('should return empty array for non-arrays', () => {
      expect(ValidationUtils.validateTags(null)).toEqual([]);
      expect(ValidationUtils.validateTags('not-array')).toEqual([]);
      expect(ValidationUtils.validateTags(123)).toEqual([]);
    });
  });

  describe('validatePageData', () => {
    test('should validate complete page data', () => {
      const pageData = {
        title: 'Test Page',
        url: 'https://example.com',
        content: 'Page content',
        sourceInfo: 'Example Source'
      };
      
      const result = ValidationUtils.validatePageData(pageData);
      expect(result).toEqual({
        title: 'Test Page',
        url: 'https://example.com',
        content: 'Page content',
        sourceInfo: 'Example Source'
      });
    });

    test('should handle missing optional fields', () => {
      const pageData = {
        content: 'Page content'
      };
      
      const result = ValidationUtils.validatePageData(pageData);
      expect(result.title).toBe('Untitled');
      expect(result.url).toBe('');
      expect(result.content).toBe('Page content');
      expect(result.sourceInfo).toBe('Unknown source');
    });

    test('should throw error for invalid page data', () => {
      expect(() => ValidationUtils.validatePageData(null)).toThrow('Invalid page data provided');
      expect(() => ValidationUtils.validatePageData('not-object')).toThrow('Invalid page data provided');
    });
  });
});

describe('ErrorHandler', () => {
  describe('handleApiError', () => {
    test('should handle network errors', () => {
      const networkError = new TypeError('fetch failed');
      const result = ErrorHandler.handleApiError(networkError);
      expect(result.message).toBe('Network error: Please check your internet connection');
    });

    test('should handle 401 errors', () => {
      const authError = new Error('401 Unauthorized');
      const result = ErrorHandler.handleApiError(authError);
      expect(result.message).toBe('Invalid API key. Please check your credentials');
    });

    test('should handle rate limit errors', () => {
      const rateLimitError = new Error('429 Too Many Requests');
      const result = ErrorHandler.handleApiError(rateLimitError);
      expect(result.message).toBe('Rate limit exceeded. Please try again later');
    });

    test('should handle 404 errors', () => {
      const notFoundError = new Error('404 Not Found');
      const result = ErrorHandler.handleApiError(notFoundError);
      expect(result.message).toBe('Resource not found. Please verify your configuration');
    });

    test('should pass through other errors unchanged', () => {
      const genericError = new Error('Some other error');
      const result = ErrorHandler.handleApiError(genericError);
      expect(result).toBe(genericError);
    });
  });

  describe('handleNotionError', () => {
    test('should handle database_id errors', () => {
      const dbError = new Error('Invalid database_id');
      const result = ErrorHandler.handleNotionError(dbError);
      expect(result.message).toBe('Invalid Notion Database ID. Please check your configuration');
    });

    test('should handle integration errors', () => {
      const integrationError = new Error('Integration not configured');
      const result = ErrorHandler.handleNotionError(integrationError);
      expect(result.message).toBe('Notion integration not properly configured. Please check permissions');
    });
  });

  describe('handleGeminiError', () => {
    test('should handle quota errors', () => {
      const quotaError = new Error('Quota exceeded');
      const result = ErrorHandler.handleGeminiError(quotaError);
      expect(result.message).toBe('Gemini API quota exceeded. Please try again later');
    });

    test('should handle model errors', () => {
      const modelError = new Error('Model not available');
      const result = ErrorHandler.handleGeminiError(modelError);
      expect(result.message).toBe('Gemini model not available. Please try again later');
    });
  });
});