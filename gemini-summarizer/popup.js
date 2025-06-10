import { getAllPagesWithContent, generateWeeklyRecap } from './weeklyRecap.js';
import { encryption } from './encryption.js';

document.addEventListener('DOMContentLoaded', async function () {
    // Initialize encryption first
    await encryption.init();
    
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

    /**
     * Dynamically adjusts the popup width based on content length for better readability.
     * @param {number} [contentLength=0] - The length of the summary or recap text.
     */
    function updatePopupSize(contentLength = 0) {
        const body = document.body;
        let targetWidth;

        if (contentLength <= 0) {
            targetWidth = 420; // Default/collapsed width
        } else if (contentLength < 1200) {
            targetWidth = 450; // Small summary
        } else if (contentLength < 2500) {
            targetWidth = 700; // Medium summary
        } else {
            targetWidth = 980; // Large summary, respects Chrome's max-width
        }
        body.style.width = targetWidth + 'px';
    }

    async function loadSavedCredentials() {
        try {
            // Use encrypted storage for sensitive data
            const geminiApiKey = await encryption.secureGet('geminiApiKey');
            const notionApiKey = await encryption.secureGet('notionApiKey');
            const notionDatabaseId = await encryption.secureGet('notionDatabaseId');

            // Check for legacy unencrypted data and migrate if needed
            if (!geminiApiKey) {
                const migrated = await encryption.migrateKey('geminiApiKey');
                if (migrated) {
                    apiKeyInput.value = migrated;
                }
            } else {
                apiKeyInput.value = geminiApiKey;
            }

            if (!notionApiKey) {
                const migrated = await encryption.migrateKey('notionApiKey');
                if (migrated) {
                    notionApiKeyInput.value = migrated;
                }
            } else {
                notionApiKeyInput.value = notionApiKey;
            }

            if (!notionDatabaseId) {
                const migrated = await encryption.migrateKey('notionDatabaseId');
                if (migrated) {
                    notionDatabaseIdInput.value = migrated;
                }
            } else {
                notionDatabaseIdInput.value = notionDatabaseId;
            }

            // Update UI based on available credentials
            if (geminiApiKey || apiKeyInput.value) {
                apiKeySection.style.display = 'none';
                summarySection.style.display = 'block';
            } else {
                apiKeySection.style.display = 'block';
                summarySection.style.display = 'none';
            }

            if ((notionApiKey || notionApiKeyInput.value) && (notionDatabaseId || notionDatabaseIdInput.value)) {
                saveToNotionBtn.disabled = false;
                if (notionKeySection.style.display !== 'block') {
                    notionSetup.style.display = 'none';
                    notionKeySection.style.display = 'none';
                }
            } else {
                saveToNotionBtn.disabled = true;
                notionSetup.style.display = 'block';
            }
        } catch (error) {
            console.error('Error loading credentials:', error);
            showStatus('Error loading saved credentials', 'error');
        }
    }

    // Initial load of saved credentials
    await loadSavedCredentials();

    // Save API key with encryption
    saveApiKeyBtn.addEventListener('click', async function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            try {
                await encryption.secureSet('geminiApiKey', apiKey);
                apiKeySection.style.display = 'none';
                summarySection.style.display = 'block';
                showStatus('API key saved securely!', 'success');
                await loadSavedCredentials();
            } catch (error) {
                console.error('Error saving API key:', error);
                showStatus('Error saving API key', 'error');
            }
        } else {
            showStatus('Please enter a valid API key', 'error');
        }
    });

    // Setup Notion button
    setupNotionBtn.addEventListener('click', function () {
        notionKeySection.style.display = 'block';
        loadSavedCredentials();
    });

    // Save Notion API Key with encryption
    saveNotionApiKeyBtn.addEventListener('click', async function () {
        const notionApiKey = notionApiKeyInput.value.trim();
        if (notionApiKey) {
            try {
                await encryption.secureSet('notionApiKey', notionApiKey);
                showStatus('Notion API Key saved securely!', 'success');
                await loadSavedCredentials();
            } catch (error) {
                console.error('Error saving Notion API key:', error);
                showStatus('Error saving Notion API key', 'error');
            }
        } else {
            showStatus('Please enter a valid Notion API Key.', 'error');
        }
    });

    // Save Notion Database ID with encryption
    saveNotionDatabaseIdBtn.addEventListener('click', async function () {
        const notionDatabaseId = notionDatabaseIdInput.value.trim();
        if (notionDatabaseId) {
            try {
                await encryption.secureSet('notionDatabaseId', notionDatabaseId);
                showStatus('Notion Database ID saved securely!', 'success');
                await loadSavedCredentials();
            } catch (error) {
                console.error('Error saving Notion Database ID:', error);
                showStatus('Error saving Notion Database ID', 'error');
            }
        } else {
            showStatus('Please enter a valid Notion Database ID.', 'error');
        }
    });

    // Copy to clipboard
    copyBtn.addEventListener('click', function () {
        const text = summaryContent.textContent;
        navigator.clipboard.writeText(text)
            .then(() => {
                copyStatus.textContent = 'Copied!';
                setTimeout(() => {
                    copyStatus.textContent = '';
                }, 2000);
            })
            .catch(err => {
                copyStatus.textContent = 'Failed to copy';
                console.error('Copy failed: ', err);
            });
    });

    // Save to Notion
    saveToNotionBtn.addEventListener('click', async function () {
        saveToNotionBtn.disabled = true;
        saveToNotionBtn.textContent = 'Saving...';

        // Get the current tab title for the page title
        chrome.tabs.query({ active: true, currentWindow: true }, async function (tabs) {
            const currentTab = tabs[0];

            try {
                const notionApiKey = await encryption.secureGet('notionApiKey');
                const notionDatabaseId = await encryption.secureGet('notionDatabaseId');

                if (!notionApiKey || !notionDatabaseId) {
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
                    notionApiKey: notionApiKey,
                    notionDatabaseId: notionDatabaseId
                }, function (response) {
                    saveToNotionBtn.disabled = false;
                    saveToNotionBtn.textContent = 'Save to Notion';

                    if (response && response.success) {
                        showStatus('Saved to Notion successfully!', 'success');
                    } else {
                        showStatus('Error saving to Notion: ' + (response ? response.error : 'Unknown error'), 'error');
                    }
                });
            } catch (error) {
                console.error('Error retrieving Notion credentials:', error);
                saveToNotionBtn.disabled = false;
                saveToNotionBtn.textContent = 'Save to Notion';
                showStatus('Error retrieving Notion credentials', 'error');
            }
        });
    });

    summarizeBtn.addEventListener('click', async function () {
        try {
            const geminiApiKey = await encryption.secureGet('geminiApiKey');
            
            if (!geminiApiKey) {
                apiKeySection.style.display = 'block';
                summarySection.style.display = 'none';
                weeklyRecapDisplay.classList.add('collapsed');
                await loadSavedCredentials();
                return;
            }

            // Collapse sections and reset width before generating
            updatePopupSize(); // Reset to default width
            summaryDisplay.classList.add('collapsed');
            weeklyRecapDisplay.classList.add('collapsed');
            loadingElement.style.display = 'block';
            statusMessage.textContent = 'Generating summary...';
            statusMessage.className = '';

            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const currentTab = tabs[0];
                chrome.scripting.executeScript({
                    target: { tabId: currentTab.id },
                    function: extractPageContent
                }, function (results) {
                    if (chrome.runtime.lastError) {
                        showStatus('Error accessing page content: ' + chrome.runtime.lastError.message, 'error');
                        loadingElement.style.display = 'none';
                        return;
                    }

                    const pageData = results[0].result;
                    chrome.runtime.sendMessage({
                        action: 'summarize',
                        url: currentTab.url,
                        title: currentTab.title,
                        content: pageData,
                        apiKey: geminiApiKey
                    }, function (response) {
                        loadingElement.style.display = 'none';

                        if (response.success && response.summaryText) {
                            currentSummary = response.summaryText;
                            loadSavedCredentials();

                            const formattedText = response.summaryText
                                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                .replace(/^\* (.*$)/gm, '<li>$1</li>')
                                .replace(/^(?:\*|\-)\s/gm, '<ul><li>')
                                .replace(/<\/li>\n/g, '</li></ul>\n<ul>')
                                .replace(/\n\n/g, '<br><br>');

                            summaryContent.innerHTML = formattedText;
                            statusMessage.textContent = '';

                            // Expand popup width and height
                            updatePopupSize(response.summaryText.length);
                            summaryDisplay.classList.remove('collapsed');

                            navigator.clipboard.writeText(response.summaryText).then(() => {
                                copyStatus.textContent = 'Auto-copied to clipboard!';
                                setTimeout(() => { copyStatus.textContent = ''; }, 3000);
                            }).catch(err => console.error('Auto-copy failed: ', err));
                        } else {
                            showStatus('Error: ' + (response ? response.error : "Unknown error"), 'error');
                        }
                    });
                });
            });
        } catch (error) {
            console.error('Error getting API key:', error);
            showStatus('Error retrieving API key', 'error');
            loadingElement.style.display = 'none';
        }
    });

    weeklyRecapBtn.addEventListener('click', async function () {
        try {
            const geminiApiKey = await encryption.secureGet('geminiApiKey');
            const notionApiKey = await encryption.secureGet('notionApiKey');
            const notionDatabaseId = await encryption.secureGet('notionDatabaseId');

            if (!notionApiKey || !notionDatabaseId || !geminiApiKey) {
                showStatus('Please ensure Notion API Key, Notion Database ID, and Gemini API Key are set.', 'error');
                if (!geminiApiKey) {
                    apiKeySection.style.display = 'block';
                    summarySection.style.display = 'none';
                } else if (!notionApiKey || !notionDatabaseId) {
                    notionSetup.style.display = 'block';
                    notionKeySection.style.display = 'block';
                }
                await loadSavedCredentials();
                return;
            }

            // Collapse sections and reset width before generating
            updatePopupSize(); // Reset to default width
            summaryDisplay.classList.add('collapsed');
            weeklyRecapDisplay.classList.add('collapsed');
            loadingElement.style.display = 'block';
            statusMessage.textContent = 'Fetching past week\'s summaries...';
            statusMessage.className = '';

            const pagesWithContent = await getAllPagesWithContent(notionApiKey, notionDatabaseId);
            statusMessage.textContent = 'Generating weekly recap...';
            const recapText = await generateWeeklyRecap(pagesWithContent, geminiApiKey);

            const formattedRecap = recapText
                .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                .replace(/^### (.*$)/gm, '<h3>$1</h3>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\n\n/g, '<br><br>')
                .replace(/\n/g, '<br>');

            navigator.clipboard.writeText(recapText).then(() => {
                recapCopyStatus.textContent = 'Auto-copied to clipboard!';
                setTimeout(() => { recapCopyStatus.textContent = ''; }, 3000);
            }).catch(err => console.error('Auto-copy failed: ', err));

            recapContentDiv.innerHTML = formattedRecap;
            statusMessage.textContent = '';

            // Expand popup width and height
            updatePopupSize(recapText.length);
            weeklyRecapDisplay.classList.remove('collapsed');

        } catch (error) {
            showStatus('Error generating weekly recap: ' + error.message, 'error');
        } finally {
            loadingElement.style.display = 'none';
        }
    });

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
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