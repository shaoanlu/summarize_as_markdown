import { CONFIG } from '../config.js';

export class DOMUtils {
  static getElementsById(ids) {
    const elements = {};
    ids.forEach(id => {
      elements[id] = document.getElementById(id);
    });
    return elements;
  }

  static showElement(element) {
    if (element) element.style.display = 'block';
  }

  static hideElement(element) {
    if (element) element.style.display = 'none';
  }

  static toggleElementVisibility(element, show) {
    if (show) {
      this.showElement(element);
    } else {
      this.hideElement(element);
    }
  }

  static setElementText(element, text) {
    if (element) element.textContent = text;
  }

  static setElementHTML(element, html) {
    if (element) element.innerHTML = html;
  }

  static disableButton(button, text = null) {
    if (button) {
      button.disabled = true;
      if (text) button.textContent = text;
    }
  }

  static enableButton(button, text = null) {
    if (button) {
      button.disabled = false;
      if (text) button.textContent = text;
    }
  }

  static addClassToElement(element, className) {
    if (element) element.classList.add(className);
  }

  static removeClassFromElement(element, className) {
    if (element) element.classList.remove(className);
  }

  static updatePopupSize(contentLength = 0) {
    const body = document.body;
    let targetWidth;

    if (contentLength <= 0) {
      targetWidth = CONFIG.UI.POPUP_SIZES.DEFAULT;
    } else if (contentLength < CONFIG.UI.CONTENT_THRESHOLDS.SMALL) {
      targetWidth = CONFIG.UI.POPUP_SIZES.SMALL;
    } else if (contentLength < CONFIG.UI.CONTENT_THRESHOLDS.MEDIUM) {
      targetWidth = CONFIG.UI.POPUP_SIZES.MEDIUM;
    } else {
      targetWidth = CONFIG.UI.POPUP_SIZES.LARGE;
    }
    
    body.style.width = targetWidth + 'px';
  }
}

export class TextUtils {
  static formatMarkdownToHTML(text) {
    return text
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^(?:\*|\-)\s/gm, '<ul><li>')
      .replace(/<\/li>\n/g, '</li></ul>\n<ul>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>');
  }

  static extractTagsFromSummary(summaryText) {
    const tagsMatch = summaryText.match(/Suggested Tags: (.*?)(\n|$)/);
    if (tagsMatch && tagsMatch[1]) {
      return tagsMatch[1]
        .replace(/[\[\]`"'*#@<>{}]/g, '')
        .split(',')
        .map(tag => tag.trim());
    }
    return [];
  }
}

export class StorageUtils {
  static async get(keys) {
    return new Promise((resolve) => {
      chrome.storage.local.get(keys, resolve);
    });
  }

  static async set(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set(data, resolve);
    });
  }
}

export class ClipboardUtils {
  static async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Copy failed:', error);
      return false;
    }
  }

  static showCopyStatus(statusElement, message, duration = CONFIG.TIMEOUTS.COPY_STATUS_DISPLAY) {
    if (statusElement) {
      statusElement.textContent = message;
      setTimeout(() => {
        statusElement.textContent = '';
      }, duration);
    }
  }
}

export class TabUtils {
  static async getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0]);
      });
    });
  }

  static async executeScript(tabId, func) {
    return new Promise((resolve, reject) => {
      chrome.scripting.executeScript({
        target: { tabId },
        function: func
      }, (results) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(results[0].result);
        }
      });
    });
  }
}