import { CONFIG } from '../config.js';
import { GeminiService, NotionService } from '../services/apiService.js';
import { DOMUtils, TextUtils, StorageUtils, ClipboardUtils, TabUtils } from '../utils/domUtils.js';

export class PopupController {
  constructor() {
    this.currentSummary = "";
    this.elements = {};
    this.init();
  }

  init() {
    this.initializeElements();
    this.attachEventListeners();
    this.loadSavedCredentials();
  }

  initializeElements() {
    const elementIds = [
      'gemini-api-key', 'save-api-key', 'summarize-btn', 'weekly-recap-btn',
      'api-key-section', 'summary-section', 'loading', 'status-message',
      'summary-display', 'summary-content', 'copy-btn', 'copy-status',
      'recap-content', 'weekly-recap-display', 'recap-copy-status',
      'notion-key-section', 'notion-api-key', 'save-notion-api-key',
      'save-notion-database-id', 'notion-database-id', 'save-to-notion-btn',
      'notion-setup', 'setup-notion-btn'
    ];
    
    this.elements = DOMUtils.getElementsById(elementIds);
  }

  attachEventListeners() {
    this.elements['save-api-key'].addEventListener('click', () => this.handleSaveApiKey());
    this.elements['setup-notion-btn'].addEventListener('click', () => this.handleSetupNotion());
    this.elements['save-notion-api-key'].addEventListener('click', () => this.handleSaveNotionApiKey());
    this.elements['save-notion-database-id'].addEventListener('click', () => this.handleSaveNotionDatabaseId());
    this.elements['copy-btn'].addEventListener('click', () => this.handleCopyToClipboard());
    this.elements['save-to-notion-btn'].addEventListener('click', () => this.handleSaveToNotion());
    this.elements['summarize-btn'].addEventListener('click', () => this.handleSummarize());
    this.elements['weekly-recap-btn'].addEventListener('click', () => this.handleWeeklyRecap());
  }

  async loadSavedCredentials() {
    const result = await StorageUtils.get([
      CONFIG.STORAGE_KEYS.GEMINI_API_KEY,
      CONFIG.STORAGE_KEYS.NOTION_API_KEY,
      CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID
    ]);

    this.updateUIBasedOnCredentials(result);
  }

  updateUIBasedOnCredentials(credentials) {
    const hasGeminiKey = credentials[CONFIG.STORAGE_KEYS.GEMINI_API_KEY];
    const hasNotionKey = credentials[CONFIG.STORAGE_KEYS.NOTION_API_KEY];
    const hasNotionDbId = credentials[CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID];

    // Update input values
    this.elements['gemini-api-key'].value = hasGeminiKey || '';
    this.elements['notion-api-key'].value = hasNotionKey || '';
    this.elements['notion-database-id'].value = hasNotionDbId || '';

    // Update UI visibility
    DOMUtils.toggleElementVisibility(this.elements['api-key-section'], !hasGeminiKey);
    DOMUtils.toggleElementVisibility(this.elements['summary-section'], hasGeminiKey);

    // Update Notion UI
    const hasNotionCredentials = hasNotionKey && hasNotionDbId;
    this.elements['save-to-notion-btn'].disabled = !hasNotionCredentials;
    
    if (hasNotionCredentials && this.elements['notion-key-section'].style.display !== 'block') {
      DOMUtils.hideElement(this.elements['notion-setup']);
      DOMUtils.hideElement(this.elements['notion-key-section']);
    } else if (!hasNotionCredentials) {
      DOMUtils.showElement(this.elements['notion-setup']);
    }
  }

  async handleSaveApiKey() {
    const apiKey = this.elements['gemini-api-key'].value.trim();
    if (!apiKey) {
      this.showStatus(CONFIG.MESSAGES.ERRORS.INVALID_API_KEY, 'error');
      return;
    }

    await StorageUtils.set({ [CONFIG.STORAGE_KEYS.GEMINI_API_KEY]: apiKey });
    DOMUtils.hideElement(this.elements['api-key-section']);
    DOMUtils.showElement(this.elements['summary-section']);
    this.showStatus(CONFIG.MESSAGES.SUCCESS.API_KEY_SAVED, 'success');
    this.loadSavedCredentials();
  }

  handleSetupNotion() {
    DOMUtils.showElement(this.elements['notion-key-section']);
    this.loadSavedCredentials();
  }

  async handleSaveNotionApiKey() {
    const notionApiKey = this.elements['notion-api-key'].value.trim();
    if (!notionApiKey) {
      this.showStatus('Please enter a valid Notion API Key.', 'error');
      return;
    }

    await StorageUtils.set({ [CONFIG.STORAGE_KEYS.NOTION_API_KEY]: notionApiKey });
    this.showStatus(CONFIG.MESSAGES.SUCCESS.NOTION_API_KEY_SAVED, 'success');
    this.loadSavedCredentials();
  }

  async handleSaveNotionDatabaseId() {
    const notionDatabaseId = this.elements['notion-database-id'].value.trim();
    if (!notionDatabaseId) {
      this.showStatus('Please enter a valid Notion Database ID.', 'error');
      return;
    }

    await StorageUtils.set({ [CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID]: notionDatabaseId });
    this.showStatus(CONFIG.MESSAGES.SUCCESS.NOTION_DATABASE_ID_SAVED, 'success');
    this.loadSavedCredentials();
  }

  async handleCopyToClipboard() {
    const text = this.elements['summary-content'].textContent;
    const success = await ClipboardUtils.copyToClipboard(text);
    
    const message = success ? CONFIG.MESSAGES.SUCCESS.COPIED : 'Failed to copy';
    ClipboardUtils.showCopyStatus(this.elements['copy-status'], message);
  }

  async handleSaveToNotion() {
    DOMUtils.disableButton(this.elements['save-to-notion-btn'], CONFIG.MESSAGES.STATUS.SAVING_TO_NOTION);

    try {
      const currentTab = await TabUtils.getCurrentTab();
      const credentials = await StorageUtils.get([
        CONFIG.STORAGE_KEYS.NOTION_API_KEY,
        CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID
      ]);

      if (!credentials[CONFIG.STORAGE_KEYS.NOTION_API_KEY] || !credentials[CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID]) {
        DOMUtils.showElement(this.elements['notion-setup']);
        this.showStatus(CONFIG.MESSAGES.ERRORS.NOTION_CREDENTIALS_MISSING, 'error');
        return;
      }

      const title = currentTab.title;
      const tags = TextUtils.extractTagsFromSummary(this.currentSummary);

      await NotionService.saveToNotion({
        title,
        content: this.currentSummary,
        tags,
        url: currentTab.url,
        notionApiKey: credentials[CONFIG.STORAGE_KEYS.NOTION_API_KEY],
        notionDatabaseId: credentials[CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID]
      });

      this.showStatus(CONFIG.MESSAGES.SUCCESS.NOTION_SAVE_SUCCESS, 'success');
    } catch (error) {
      this.showStatus('Error saving to Notion: ' + error.message, 'error');
    } finally {
      DOMUtils.enableButton(this.elements['save-to-notion-btn'], 'Save to Notion');
    }
  }

  async handleSummarize() {
    try {
      const credentials = await StorageUtils.get([CONFIG.STORAGE_KEYS.GEMINI_API_KEY]);
      
      if (!credentials[CONFIG.STORAGE_KEYS.GEMINI_API_KEY]) {
        DOMUtils.showElement(this.elements['api-key-section']);
        DOMUtils.hideElement(this.elements['summary-section']);
        DOMUtils.addClassToElement(this.elements['weekly-recap-display'], 'collapsed');
        this.loadSavedCredentials();
        return;
      }

      this.prepareSummarizeUI();
      
      const currentTab = await TabUtils.getCurrentTab();
      const pageData = await TabUtils.executeScript(currentTab.id, this.extractPageContent);
      
      const summaryText = await GeminiService.summarizeContent({
        url: currentTab.url,
        title: currentTab.title,
        content: pageData,
        apiKey: credentials[CONFIG.STORAGE_KEYS.GEMINI_API_KEY]
      });

      this.displaySummary(summaryText);
      await this.autoCopyToClipboard(summaryText);
      
    } catch (error) {
      this.showStatus('Error: ' + error.message, 'error');
    } finally {
      DOMUtils.hideElement(this.elements['loading']);
    }
  }

  async handleWeeklyRecap() {
    try {
      const credentials = await StorageUtils.get([
        CONFIG.STORAGE_KEYS.GEMINI_API_KEY,
        CONFIG.STORAGE_KEYS.NOTION_API_KEY,
        CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID
      ]);

      if (!this.validateWeeklyRecapCredentials(credentials)) return;

      this.prepareWeeklyRecapUI();
      
      this.showStatus(CONFIG.MESSAGES.STATUS.FETCHING_SUMMARIES, '');
      const pagesWithContent = await this.getAllPagesWithContent(
        credentials[CONFIG.STORAGE_KEYS.NOTION_API_KEY],
        credentials[CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID]
      );

      this.showStatus(CONFIG.MESSAGES.STATUS.GENERATING_RECAP, '');
      const recapText = await GeminiService.generateWeeklyRecap(
        pagesWithContent,
        credentials[CONFIG.STORAGE_KEYS.GEMINI_API_KEY]
      );

      this.displayWeeklyRecap(recapText);
      await this.autoCopyToClipboard(recapText, this.elements['recap-copy-status']);

    } catch (error) {
      this.showStatus('Error generating weekly recap: ' + error.message, 'error');
    } finally {
      DOMUtils.hideElement(this.elements['loading']);
    }
  }

  validateWeeklyRecapCredentials(credentials) {
    const hasAllCredentials = credentials[CONFIG.STORAGE_KEYS.NOTION_API_KEY] && 
                             credentials[CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID] && 
                             credentials[CONFIG.STORAGE_KEYS.GEMINI_API_KEY];

    if (!hasAllCredentials) {
      this.showStatus(CONFIG.MESSAGES.ERRORS.NOTION_SETUP_REQUIRED, 'error');
      
      if (!credentials[CONFIG.STORAGE_KEYS.GEMINI_API_KEY]) {
        DOMUtils.showElement(this.elements['api-key-section']);
        DOMUtils.hideElement(this.elements['summary-section']);
      }
      
      if (!credentials[CONFIG.STORAGE_KEYS.NOTION_API_KEY] || !credentials[CONFIG.STORAGE_KEYS.NOTION_DATABASE_ID]) {
        DOMUtils.showElement(this.elements['notion-setup']);
        DOMUtils.showElement(this.elements['notion-key-section']);
      }
      
      this.loadSavedCredentials();
      return false;
    }
    
    return true;
  }

  prepareSummarizeUI() {
    DOMUtils.updatePopupSize();
    DOMUtils.addClassToElement(this.elements['summary-display'], 'collapsed');
    DOMUtils.addClassToElement(this.elements['weekly-recap-display'], 'collapsed');
    DOMUtils.showElement(this.elements['loading']);
    this.showStatus(CONFIG.MESSAGES.STATUS.GENERATING_SUMMARY, '');
  }

  prepareWeeklyRecapUI() {
    DOMUtils.updatePopupSize();
    DOMUtils.addClassToElement(this.elements['summary-display'], 'collapsed');
    DOMUtils.addClassToElement(this.elements['weekly-recap-display'], 'collapsed');
    DOMUtils.showElement(this.elements['loading']);
  }

  displaySummary(summaryText) {
    this.currentSummary = summaryText;
    this.loadSavedCredentials();

    const formattedText = TextUtils.formatMarkdownToHTML(summaryText);
    DOMUtils.setElementHTML(this.elements['summary-content'], formattedText);
    DOMUtils.setElementText(this.elements['status-message'], '');

    DOMUtils.updatePopupSize(summaryText.length);
    DOMUtils.removeClassFromElement(this.elements['summary-display'], 'collapsed');
  }

  displayWeeklyRecap(recapText) {
    const formattedRecap = TextUtils.formatMarkdownToHTML(recapText);
    DOMUtils.setElementHTML(this.elements['recap-content'], formattedRecap);
    DOMUtils.setElementText(this.elements['status-message'], '');

    DOMUtils.updatePopupSize(recapText.length);
    DOMUtils.removeClassFromElement(this.elements['weekly-recap-display'], 'collapsed');
  }

  async autoCopyToClipboard(text, statusElement = this.elements['copy-status']) {
    const success = await ClipboardUtils.copyToClipboard(text);
    if (success) {
      ClipboardUtils.showCopyStatus(
        statusElement, 
        CONFIG.MESSAGES.SUCCESS.AUTO_COPIED, 
        CONFIG.TIMEOUTS.AUTO_COPY_STATUS_DISPLAY
      );
    }
  }

  async getAllPagesWithContent(notionApiKey, notionDatabaseId) {
    const pages = await NotionService.getNotionPagesFromPastWeek(notionApiKey, notionDatabaseId);
    const pagesWithContent = [];

    for (const page of pages) {
      const pageContent = await NotionService.getPageContent(page.id, notionApiKey);
      
      const title = page.properties.Title?.title?.[0]?.plain_text || "Untitled";
      const url = page.properties.URL?.url || "";
      const contentText = this.extractTextFromBlocks(pageContent);

      pagesWithContent.push({
        id: page.id,
        title,
        url,
        content: contentText
      });
    }

    return pagesWithContent;
  }

  extractTextFromBlocks(blocks) {
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

  extractPageContent() {
    const isPDF = document.contentType === 'application/pdf' ||
        window.location.href.toLowerCase().endsWith('.pdf');

    if (isPDF) {
      return {
        title: document.title,
        content: "This is a PDF document. PDF extraction requires more complex handling.",
        sourceInfo: document.title,
        isPDF: true
      };
    }

    let content = '';
    const article = document.querySelector(CONFIG.SELECTORS.CONTENT_EXTRACTION.ARTICLE);

    if (article) {
      content = article.innerText;
    } else {
      const main = document.querySelector(CONFIG.SELECTORS.CONTENT_EXTRACTION.MAIN) || document.body;
      const textElements = main.querySelectorAll(CONFIG.SELECTORS.CONTENT_EXTRACTION.TEXT_ELEMENTS);
      content = Array.from(textElements).map(el => el.innerText).join('\n\n');
      if (!content.trim()) {
        content = main.innerText;
      }
    }

    let sourceInfo = '';
    const possibleSourceElements = document.querySelectorAll(CONFIG.SELECTORS.CONTENT_EXTRACTION.AUTHOR);
    if (possibleSourceElements.length > 0) {
      sourceInfo = Array.from(possibleSourceElements)
        .map(el => el.textContent.trim())
        .filter(text => text)
        .join(', ');
    }

    if (!sourceInfo) {
      const siteName = document.querySelector(CONFIG.SELECTORS.CONTENT_EXTRACTION.SITE_NAME);
      if (siteName && siteName.getAttribute('content')) {
        sourceInfo = siteName.getAttribute('content');
      } else {
        const domain = new URL(window.location.href).hostname;
        sourceInfo = domain.replace('www.', '');
      }
    }

    return {
      title: document.title,
      content: content,
      sourceInfo: sourceInfo,
      isPDF: false
    };
  }

  showStatus(message, type) {
    DOMUtils.setElementText(this.elements['status-message'], message);
    this.elements['status-message'].className = type;
  }
}