import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { DOMUtils, TextUtils, StorageUtils, ClipboardUtils, TabUtils } from '../../gemini-summarizer/utils/domUtils.js';

// Mock DOM elements
const createMockElement = (id) => ({
  id,
  style: {},
  textContent: '',
  innerHTML: '',
  disabled: false,
  classList: {
    add: jest.fn(),
    remove: jest.fn()
  }
});

describe('DOMUtils', () => {
  beforeEach(() => {
    // Reset DOM mocks
    document.getElementById = jest.fn();
    document.body = { style: {} };
  });

  describe('getElementsById', () => {
    test('should get elements by their IDs', () => {
      const mockElement1 = createMockElement('test1');
      const mockElement2 = createMockElement('test2');
      
      document.getElementById
        .mockReturnValueOnce(mockElement1)
        .mockReturnValueOnce(mockElement2);

      const result = DOMUtils.getElementsById(['test1', 'test2']);
      
      expect(result).toEqual({
        test1: mockElement1,
        test2: mockElement2
      });
    });
  });

  describe('showElement and hideElement', () => {
    test('should show element by setting display to block', () => {
      const element = createMockElement('test');
      DOMUtils.showElement(element);
      expect(element.style.display).toBe('block');
    });

    test('should hide element by setting display to none', () => {
      const element = createMockElement('test');
      DOMUtils.hideElement(element);
      expect(element.style.display).toBe('none');
    });

    test('should handle null elements gracefully', () => {
      expect(() => DOMUtils.showElement(null)).not.toThrow();
      expect(() => DOMUtils.hideElement(null)).not.toThrow();
    });
  });

  describe('toggleElementVisibility', () => {
    test('should show element when show is true', () => {
      const element = createMockElement('test');
      DOMUtils.toggleElementVisibility(element, true);
      expect(element.style.display).toBe('block');
    });

    test('should hide element when show is false', () => {
      const element = createMockElement('test');
      DOMUtils.toggleElementVisibility(element, false);
      expect(element.style.display).toBe('none');
    });
  });

  describe('setElementText and setElementHTML', () => {
    test('should set text content', () => {
      const element = createMockElement('test');
      DOMUtils.setElementText(element, 'Hello World');
      expect(element.textContent).toBe('Hello World');
    });

    test('should set HTML content', () => {
      const element = createMockElement('test');
      DOMUtils.setElementHTML(element, '<strong>Bold</strong>');
      expect(element.innerHTML).toBe('<strong>Bold</strong>');
    });

    test('should handle null elements gracefully', () => {
      expect(() => DOMUtils.setElementText(null, 'text')).not.toThrow();
      expect(() => DOMUtils.setElementHTML(null, 'html')).not.toThrow();
    });
  });

  describe('button methods', () => {
    test('should disable button', () => {
      const button = createMockElement('button');
      DOMUtils.disableButton(button, 'Loading...');
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe('Loading...');
    });

    test('should enable button', () => {
      const button = createMockElement('button');
      DOMUtils.enableButton(button, 'Click me');
      expect(button.disabled).toBe(false);
      expect(button.textContent).toBe('Click me');
    });
  });

  describe('CSS class methods', () => {
    test('should add CSS class', () => {
      const element = createMockElement('test');
      DOMUtils.addClassToElement(element, 'active');
      expect(element.classList.add).toHaveBeenCalledWith('active');
    });

    test('should remove CSS class', () => {
      const element = createMockElement('test');
      DOMUtils.removeClassFromElement(element, 'active');
      expect(element.classList.remove).toHaveBeenCalledWith('active');
    });
  });

  describe('updatePopupSize', () => {
    test('should set default width for no content', () => {
      DOMUtils.updatePopupSize(0);
      expect(document.body.style.width).toBe('420px');
    });

    test('should set small width for small content', () => {
      DOMUtils.updatePopupSize(1000);
      expect(document.body.style.width).toBe('450px');
    });

    test('should set medium width for medium content', () => {
      DOMUtils.updatePopupSize(2000);
      expect(document.body.style.width).toBe('700px');
    });

    test('should set large width for large content', () => {
      DOMUtils.updatePopupSize(3000);
      expect(document.body.style.width).toBe('980px');
    });
  });
});

describe('TextUtils', () => {
  describe('formatMarkdownToHTML', () => {
    test('should convert headings', () => {
      const markdown = '# Heading 1\n## Heading 2\n### Heading 3';
      const html = TextUtils.formatMarkdownToHTML(markdown);
      expect(html).toContain('<h1>Heading 1</h1>');
      expect(html).toContain('<h2>Heading 2</h2>');
      expect(html).toContain('<h3>Heading 3</h3>');
    });

    test('should convert bold text', () => {
      const markdown = '**bold text**';
      const html = TextUtils.formatMarkdownToHTML(markdown);
      expect(html).toContain('<strong>bold text</strong>');
    });

    test('should convert line breaks', () => {
      const markdown = 'Line 1\n\nLine 2\nLine 3';
      const html = TextUtils.formatMarkdownToHTML(markdown);
      expect(html).toContain('<br><br>');
      expect(html).toContain('<br>');
    });
  });

  describe('extractTagsFromSummary', () => {
    test('should extract tags from summary text', () => {
      const summary = 'Some text\nSuggested Tags: tag1, tag2, tag3\nMore text';
      const tags = TextUtils.extractTagsFromSummary(summary);
      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('should clean up tag formatting', () => {
      const summary = 'Suggested Tags: [tag1], "tag2", #tag3';
      const tags = TextUtils.extractTagsFromSummary(summary);
      expect(tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    test('should return empty array if no tags found', () => {
      const summary = 'Some text without tags';
      const tags = TextUtils.extractTagsFromSummary(summary);
      expect(tags).toEqual([]);
    });
  });
});

describe('StorageUtils', () => {
  beforeEach(() => {
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  describe('get', () => {
    test('should get values from chrome storage', async () => {
      const mockData = { key1: 'value1', key2: 'value2' };
      chrome.storage.local.get.mockImplementation((keys, callback) => {
        callback(mockData);
      });

      const result = await StorageUtils.get(['key1', 'key2']);
      expect(result).toEqual(mockData);
      expect(chrome.storage.local.get).toHaveBeenCalledWith(['key1', 'key2'], expect.any(Function));
    });
  });

  describe('set', () => {
    test('should set values in chrome storage', async () => {
      const data = { key1: 'value1' };
      chrome.storage.local.set.mockImplementation((data, callback) => {
        callback();
      });

      await StorageUtils.set(data);
      expect(chrome.storage.local.set).toHaveBeenCalledWith(data, expect.any(Function));
    });
  });
});

describe('ClipboardUtils', () => {
  beforeEach(() => {
    navigator.clipboard.writeText.mockClear();
  });

  describe('copyToClipboard', () => {
    test('should copy text to clipboard successfully', async () => {
      navigator.clipboard.writeText.mockResolvedValue();
      
      const result = await ClipboardUtils.copyToClipboard('test text');
      expect(result).toBe(true);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test text');
    });

    test('should handle clipboard errors', async () => {
      navigator.clipboard.writeText.mockRejectedValue(new Error('Clipboard error'));
      
      const result = await ClipboardUtils.copyToClipboard('test text');
      expect(result).toBe(false);
    });
  });

  describe('showCopyStatus', () => {
    test('should show copy status with timeout', (done) => {
      const statusElement = { textContent: '' };
      
      ClipboardUtils.showCopyStatus(statusElement, 'Copied!', 100);
      
      expect(statusElement.textContent).toBe('Copied!');
      
      setTimeout(() => {
        expect(statusElement.textContent).toBe('');
        done();
      }, 150);
    });

    test('should handle null status element', () => {
      expect(() => ClipboardUtils.showCopyStatus(null, 'message')).not.toThrow();
    });
  });
});

describe('TabUtils', () => {
  beforeEach(() => {
    chrome.tabs.query.mockClear();
    chrome.scripting.executeScript.mockClear();
  });

  describe('getCurrentTab', () => {
    test('should get current active tab', async () => {
      const mockTab = { id: 1, url: 'https://example.com' };
      chrome.tabs.query.mockImplementation((query, callback) => {
        callback([mockTab]);
      });

      const result = await TabUtils.getCurrentTab();
      expect(result).toEqual(mockTab);
      expect(chrome.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
    });
  });

  describe('executeScript', () => {
    test('should execute script in tab', async () => {
      const mockResult = { result: 'script result' };
      chrome.scripting.executeScript.mockImplementation((options, callback) => {
        callback([mockResult]);
      });

      const testFunction = () => 'test';
      const result = await TabUtils.executeScript(1, testFunction);
      
      expect(result).toBe('script result');
      expect(chrome.scripting.executeScript).toHaveBeenCalledWith(
        { target: { tabId: 1 }, function: testFunction },
        expect.any(Function)
      );
    });

    test('should handle script execution errors', async () => {
      chrome.runtime.lastError = { message: 'Script error' };
      chrome.scripting.executeScript.mockImplementation((options, callback) => {
        callback();
      });

      await expect(TabUtils.executeScript(1, () => {}))
        .rejects.toThrow('Script error');
      
      // Clean up
      chrome.runtime.lastError = null;
    });
  });
});