import { CONFIG } from '../config.js';

export class ValidationUtils {
  static validateApiKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      throw new Error(CONFIG.MESSAGES.ERRORS.INVALID_API_KEY);
    }
    return apiKey.trim();
  }

  static validateNotionCredentials(notionApiKey, notionDatabaseId) {
    const errors = [];
    
    if (!notionApiKey || typeof notionApiKey !== 'string' || notionApiKey.trim().length === 0) {
      errors.push('Invalid Notion API Key');
    }
    
    if (!notionDatabaseId || typeof notionDatabaseId !== 'string' || notionDatabaseId.trim().length === 0) {
      errors.push('Invalid Notion Database ID');
    }
    
    if (errors.length > 0) {
      throw new Error(errors.join(', '));
    }
    
    return {
      apiKey: notionApiKey.trim(),
      databaseId: notionDatabaseId.trim()
    };
  }

  static validateContentData(content) {
    if (!content) {
      throw new Error(CONFIG.MESSAGES.ERRORS.NO_CONTENT);
    }

    const contentString = typeof content === 'string' ? content :
      (content && content.content ? content.content : JSON.stringify(content));

    if (!contentString || contentString.trim().length === 0) {
      throw new Error(CONFIG.MESSAGES.ERRORS.NO_CONTENT);
    }

    return contentString;
  }

  static validateUrl(url) {
    try {
      new URL(url);
      return url;
    } catch {
      throw new Error('Invalid URL provided');
    }
  }

  static validateTitle(title) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return 'Untitled';
    }
    return title.trim();
  }

  static validateTags(tags) {
    if (!Array.isArray(tags)) {
      return [];
    }
    
    return tags
      .filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0)
      .map(tag => tag.trim())
      .slice(0, 10); // Limit to 10 tags
  }

  static validatePageData(pageData) {
    if (!pageData || typeof pageData !== 'object') {
      throw new Error('Invalid page data provided');
    }

    return {
      title: this.validateTitle(pageData.title),
      url: pageData.url ? this.validateUrl(pageData.url) : '',
      content: this.validateContentData(pageData.content),
      sourceInfo: pageData.sourceInfo || 'Unknown source'
    };
  }
}

export class ErrorHandler {
  static handleApiError(error, context = 'API call') {
    console.error(`Error in ${context}:`, error);
    
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return new Error('Network error: Please check your internet connection');
    }
    
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return new Error('Invalid API key. Please check your credentials');
    }
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return new Error('Rate limit exceeded. Please try again later');
    }
    
    if (error.message.includes('404')) {
      return new Error('Resource not found. Please verify your configuration');
    }
    
    return error;
  }

  static handleNotionError(error) {
    console.error('Notion API error:', error);
    
    if (error.message.includes('database_id')) {
      return new Error('Invalid Notion Database ID. Please check your configuration');
    }
    
    if (error.message.includes('integration')) {
      return new Error('Notion integration not properly configured. Please check permissions');
    }
    
    return this.handleApiError(error, 'Notion API');
  }

  static handleGeminiError(error) {
    console.error('Gemini API error:', error);
    
    if (error.message.includes('quota')) {
      return new Error('Gemini API quota exceeded. Please try again later');
    }
    
    if (error.message.includes('model')) {
      return new Error('Gemini model not available. Please try again later');
    }
    
    return this.handleApiError(error, 'Gemini API');
  }
}