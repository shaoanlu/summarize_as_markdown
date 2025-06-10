import { getAllPagesWithContent, generateWeeklyRecap } from './weeklyRecap.js';

document.addEventListener('DOMContentLoaded', function () {
    // --- Element Definitions ---
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const summarizeBtn = document.getElementById('summarize-btn');
    const weeklyRecapBtn = document.getElementById('weekly-recap-btn');
    const apiKeySection = document.getElementById('api-key-section');
    const summarySection = document.getElementById('summary-section');
    const loadingElement = document.getElementById('loading');
    const statusMessage = document.getElementById('status-message');
    const summaryDisplay = document.getElementById('summary-display');
    const summaryContent = document.getElementById('summary-content');
    const copyBtn = document.getElementById('copy-btn');
    const copyStatus = document.getElementById('copy-status');
    const recapContentDiv = document.getElementById('recap-content');
    const weeklyRecapDisplay = document.getElementById('weekly-recap-display');
    const recapCopyStatus = document.getElementById('recap-copy-status');
    const notionKeySection = document.getElementById('notion-key-section');
    const notionApiKeyInput = document.getElementById('notion-api-key');
    const saveNotionApiKeyBtn = document.getElementById('save-notion-api-key');
    const saveNotionDatabaseIdBtn = document.getElementById('save-notion-database-id');
    const notionDatabaseIdInput = document.getElementById('notion-database-id');
    const saveToNotionBtn = document.getElementById('save-to-notion-btn');
    const notionSetup = document.getElementById('notion-setup');
    const setupNotionBtn = document.getElementById('setup-notion-btn');

    let currentSummary = "";

    // --- Dynamic Sizing and UI Effects ---

    function updatePopupSize(contentLength = 0) {
        const body = document.body;
        let targetWidth;

        if (contentLength <= 0) {
            targetWidth = 400; // Default width
        } else if (contentLength < 1500) {
            targetWidth = 550; // Medium summary
        } else {
            targetWidth = 780; // Large summary
        }
        body.style.width = targetWidth + 'px';
    }

    document.addEventListener('mousemove', (e) => {
        const container = document.querySelector('.glass-container');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        const tiltX = (y - 0.5) * 4;
        const tiltY = (x - 0.5) * -4;
        container.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
    });

    // --- Core Logic ---

    function loadSavedCredentials() {
        chrome.storage.local.get(['geminiApiKey', 'notionApiKey', 'notionDatabaseId'], function (result) {
            if (result.geminiApiKey) {
                apiKeySection.style.display = 'none';
                summarySection.style.display = 'block';
            } else {
                apiKeySection.style.display = 'flex';
                summarySection.style.display = 'none';
            }
            if (result.notionApiKey) notionApiKeyInput.value = result.notionApiKey;
            if (result.notionDatabaseId) notionDatabaseIdInput.value = result.notionDatabaseId;
            
            updateNotionButtonState(result.notionApiKey, result.notionDatabaseId);
        });
    }

    function updateNotionButtonState(key, dbId) {
        if (key && dbId) {
            saveToNotionBtn.disabled = false;
            notionSetup.style.display = 'none';
        } else {
            saveToNotionBtn.disabled = true;
            notionSetup.style.display = 'flex';
        }
    }

    // Initial load of saved credentials
    loadSavedCredentials();

    // Save API key
    saveApiKeyBtn.addEventListener('click', function () { const apiKey = apiKeyInput.value.trim(); if (apiKey) { chrome.storage.local.set({ geminiApiKey: apiKey }, () => { showStatus('API key saved!', 'success'); loadSavedCredentials(); }); }});

    // Setup Notion button
    setupNotionBtn.addEventListener('click', function () {
        notionKeySection.classList.toggle('collapsed');
        loadSavedCredentials(); // Re-populate fields
    });

    // Save Notion API Key
    saveNotionApiKeyBtn.addEventListener('click', function () {
        const notionApiKey = notionApiKeyInput.value.trim();
        if (notionApiKey) {
            chrome.storage.local.set({ notionApiKey: notionApiKey }, () => {
                showStatus('Notion API Key saved!', 'success');
                chrome.storage.local.get(['notionDatabaseId'], (res) => updateNotionButtonState(notionApiKey, res.notionDatabaseId));
            });
        }
    });

    // Save Notion Database ID
    saveNotionDatabaseIdBtn.addEventListener('click', function () {
        const notionDatabaseId = notionDatabaseIdInput.value.trim();
        if (notionDatabaseId) {
            chrome.storage.local.set({ notionDatabaseId: notionDatabaseId }, () => {
                showStatus('Notion Database ID saved!', 'success');
                chrome.storage.local.get(['notionApiKey'], (res) => updateNotionButtonState(res.notionApiKey, notionDatabaseId));
            });
        }
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', function () { navigator.clipboard.writeText(currentSummary).then(() => { copyStatus.textContent = 'Copied!'; setTimeout(() => copyStatus.textContent = '', 2000); }); });

    // Save to Notion
    saveToNotionBtn.addEventListener('click', function () {
        saveToNotionBtn.disabled = true;
        saveToNotionBtn.textContent = 'Saving...';

        // Get the current tab title for the page title
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            const currentTab = tabs[0];

            chrome.storage.local.get(['notionApiKey', 'notionDatabaseId'], function (result) {
                if (!result.notionApiKey || !result.notionDatabaseId) {
                    notionSetup.style.display = 'block';
                    saveToNotionBtn.disabled = false;
                    saveToNotionBtn.textContent = 'Save to Notion';
                    showStatus('Notion credentials not found', 'error');
                    return;
                }

                // Extract title and tags from the summary
                let title = currentTab.title;
                let tags = [];
                let summaryText = currentSummary;

                // Try to extract tags from the summary
                const tagsMatch = summaryText.match(/Suggested Tags: (.*?)(\n|$)/);
                if (tagsMatch && tagsMatch[1]) {
                    tags = tagsMatch[1].replace(/[\[\]`"'*#@<>{}]/g, '').split(',').map(tag => tag.trim());
                }

                // Send to background script to make the Notion API call
                chrome.runtime.sendMessage({
                    action: 'saveToNotion',
                    title: title,
                    content: summaryText,
                    tags: tags,
                    url: currentTab.url,
                    notionApiKey: result.notionApiKey,
                    notionDatabaseId: result.notionDatabaseId
                }, function (response) {
                    saveToNotionBtn.disabled = false;
                    saveToNotionBtn.textContent = 'Save to Notion';

                    if (response && response.success) {
                        showStatus('Saved to Notion successfully!', 'success');
                    } else {
                        showStatus('Error saving to Notion: ' + (response ? response.error : 'Unknown error'), 'error');
                    }
                });
            });
        });
    });

    summarizeBtn.addEventListener('click', function () {
        chrome.storage.local.get(['geminiApiKey'], function (result) {
            if (!result.geminiApiKey) {
                loadSavedCredentials(); return;
            }
            updatePopupSize();
            summaryDisplay.classList.add('collapsed');
            weeklyRecapDisplay.classList.add('collapsed');
            notionKeySection.classList.add('collapsed');
            loadingElement.style.display = 'block';
            statusMessage.textContent = '';

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, function: extractPageContent }, 
                (results) => {
                    if (chrome.runtime.lastError || !results || !results[0]) {
                        showStatus('Error accessing page content.', 'error'); loadingElement.style.display = 'none'; return;
                    }
                    chrome.runtime.sendMessage({ action: 'summarize', url: tabs[0].url, title: tabs[0].title, content: results[0].result, apiKey: result.geminiApiKey }, 
                    (response) => {
                        loadingElement.style.display = 'none';
                        if (response.success && response.summaryText) {
                            currentSummary = response.summaryText;
                            summaryContent.innerHTML = formatMarkdown(response.summaryText);
                            updatePopupSize(response.summaryText.length);
                            summaryDisplay.classList.remove('collapsed');
                            navigator.clipboard.writeText(response.summaryText).then(() => {
                                copyStatus.textContent = 'Auto-copied!';
                                setTimeout(() => { copyStatus.textContent = ''; }, 3000);
                            });
                        } else {
                            showStatus('Error: ' + response.error, 'error');
                        }
                    });
                });
            });
        });
    });

    weeklyRecapBtn.addEventListener('click', async function () {
        chrome.storage.local.get(['geminiApiKey', 'notionApiKey', 'notionDatabaseId'], async function (result) {
            if (!result.notionApiKey || !result.notionDatabaseId || !result.geminiApiKey) {
                showStatus('Please configure Gemini and Notion keys first.', 'error');
                notionKeySection.classList.remove('collapsed'); return;
            }
            updatePopupSize();
            summaryDisplay.classList.add('collapsed');
            weeklyRecapDisplay.classList.add('collapsed');
            notionKeySection.classList.add('collapsed');
            loadingElement.style.display = 'block';
            statusMessage.textContent = 'Generating weekly recap...';

            try {
                const pages = await getAllPagesWithContent(result.notionApiKey, result.notionDatabaseId);
                const recapText = await generateWeeklyRecap(pages, result.geminiApiKey);
                recapContentDiv.innerHTML = formatMarkdown(recapText);
                updatePopupSize(recapText.length);
                weeklyRecapDisplay.classList.remove('collapsed');
                navigator.clipboard.writeText(recapText).then(() => {
                    recapCopyStatus.textContent = 'Auto-copied!';
                    setTimeout(() => { recapCopyStatus.textContent = ''; }, 3000);
                });
            } catch (error) {
                showStatus('Error: ' + error.message, 'error');
            } finally {
                loadingElement.style.display = 'none';
                statusMessage.textContent = '';
            }
        });
    });

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
        setTimeout(() => { statusMessage.textContent = ''; statusMessage.className = ''; }, 4000);
    }
    
    function formatMarkdown(text) {
        return text
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/^\* (.*$)/gm, '<li>$1</li>')
            .replace(/<\/li><li>/g, '</li><li>') // Basic list correction
            .replace(/\n/g, '<br>');
    }

});

// Function to extract content from the page (no changes needed here)
function extractPageContent() {
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
    const article = document.querySelector('article');

    if (article) {
        content = article.innerText;
    } else {
        const main = document.querySelector('main') || document.body;
        const textElements = main.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        content = Array.from(textElements).map(el => el.innerText).join('\n\n');
        if (!content.trim()) {
            content = main.innerText;
        }
    }

    let sourceInfo = '';
    const possibleSourceElements = document.querySelectorAll('[rel="author"], .author, .byline, [itemprop="author"]');
    if (possibleSourceElements.length > 0) {
        sourceInfo = Array.from(possibleSourceElements)
            .map(el => el.textContent.trim())
            .filter(text => text)
            .join(', ');
    }

    if (!sourceInfo) {
        const siteName = document.querySelector('[property="og:site_name"]');
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