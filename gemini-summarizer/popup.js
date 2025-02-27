document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const summarizeBtn = document.getElementById('summarize-btn');
    const apiKeySection = document.getElementById('api-key-section');
    const summarySection = document.getElementById('summary-section');
    const loadingElement = document.getElementById('loading');
    const statusMessage = document.getElementById('status-message');
    const summaryDisplay = document.getElementById('summary-display');
    const summaryContent = document.getElementById('summary-content');
    const copyBtn = document.getElementById('copy-btn');
    const copyStatus = document.getElementById('copy-status');

    // Notion related elements
    const notionKeySection = document.getElementById('notion-key-section');
    const notionApiKeyInput = document.getElementById('notion-api-key');
    const saveNotionApiKeyBtn = document.getElementById('save-notion-api-key');
    const saveNotionDatabaseIdBtn = document.getElementById('save-notion-database-id');
    const notionDatabaseIdInput = document.getElementById('notion-database-id');
    const saveToNotionBtn = document.getElementById('save-to-notion-btn');
    const notionSetup = document.getElementById('notion-setup');
    const setupNotionBtn = document.getElementById('setup-notion-btn');

    let currentSummary = "";

    // Check if API keys are saved
    chrome.storage.local.get(['geminiApiKey', 'notionApiKey', 'notionDatabaseId'], function (result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
            apiKeySection.style.display = 'none';
            summarySection.style.display = 'block';
        }

        // Check Notion credentials
        if (result.notionApiKey && result.notionDatabaseId) {
            notionApiKeyInput.value = result.notionApiKey;
            notionDatabaseIdInput.value = result.notionDatabaseId;
            notionSetup.style.display = 'none';
            notionKeySection.style.display = 'none';
        } else {
            saveToNotionBtn.disabled = true;
            // Make Notion setup visible by default if credentials aren't saved
            notionSetup.style.display = 'block';
            notionKeySection.style.display = 'block';
        }
    });

    // Save API key
    saveApiKeyBtn.addEventListener('click', function () {
        const apiKey = apiKeyInput.value.trim();
        if (apiKey) {
            chrome.storage.local.set({ geminiApiKey: apiKey }, function () {
                apiKeySection.style.display = 'none';
                summarySection.style.display = 'block';
                showStatus('API key saved successfully!', 'success');
            });
        } else {
            showStatus('Please enter a valid API key', 'error');
        }
    });

    // Setup Notion button
    setupNotionBtn.addEventListener('click', function () {
        notionKeySection.style.display = 'block';
        summarySection.style.display = 'none';
    });

    // Save Notion API Key
    saveNotionApiKeyBtn.addEventListener('click', function () {
        const notionApiKey = notionApiKeyInput.value.trim();
        if (notionApiKey) {
            chrome.storage.local.set({ notionApiKey: notionApiKey }, function () {
                showStatus('Notion API Key saved!', 'success');
            });
        } else {
            showStatus('Please enter a valid Notion API Key.', 'error');
        }
    });

    // Save Notion Database ID
    saveNotionDatabaseIdBtn.addEventListener('click', function () {
        const notionDatabaseId = notionDatabaseIdInput.value.trim();
        if (notionDatabaseId) {
            chrome.storage.local.set({ notionDatabaseId: notionDatabaseId }, function () {
                showStatus('Notion Database ID saved!', 'success');
            });
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
                const tagsMatch = summaryText.match(/Suggested Tags: \[(.*?)\]/);
                if (tagsMatch && tagsMatch[1]) {
                    tags = tagsMatch[1].split(',').map(tag => tag.trim());
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

    // Summarize current tab
    summarizeBtn.addEventListener('click', function () {
        chrome.storage.local.get(['geminiApiKey'], function (result) {
            if (!result.geminiApiKey) {
                apiKeySection.style.display = 'block';
                summarySection.style.display = 'none';
                return;
            }

            // Hide previous summary and show loading
            summaryDisplay.style.display = 'none';
            loadingElement.style.display = 'block';
            statusMessage.textContent = '';
            statusMessage.className = '';

            // Get current tab information
            chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
                const currentTab = tabs[0];

                // Extract content from the current tab
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

                    // Send data to background script for Gemini API processing
                    chrome.runtime.sendMessage({
                        action: 'summarize',
                        url: currentTab.url,
                        title: currentTab.title,
                        content: pageData,
                        apiKey: result.geminiApiKey
                    }, function (response) {
                        loadingElement.style.display = 'none';

                        if (response.success) {
                            // Display the summary
                            if (response.summaryText) {
                                // Save the raw summary text
                                currentSummary = response.summaryText;

                                // Check if user has Notion credentials
                                chrome.storage.local.get(['notionApiKey', 'notionDatabaseId'], function (notionResult) {
                                    if (notionResult.notionApiKey && notionResult.notionDatabaseId) {
                                        notionSetup.style.display = 'none';
                                        saveToNotionBtn.disabled = false;
                                    } else {
                                        notionSetup.style.display = 'block';
                                        saveToNotionBtn.disabled = true;
                                    }
                                });

                                // Convert markdown to HTML (basic conversion)
                                const formattedText = response.summaryText
                                    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
                                    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
                                    .replace(/^\* (.*$)/gm, '<li>$1</li>')
                                    .replace(/^(\* .*$)/gm, '<ul>$1</ul>')
                                    .replace(/<\/ul>\s*<ul>/g, '')
                                    .replace(/\n\n/g, '<br><br>');

                                summaryContent.innerHTML = formattedText;
                                summaryDisplay.style.display = 'block';

                                // Auto-copy to clipboard
                                navigator.clipboard.writeText(response.summaryText)
                                    .then(() => {
                                        copyStatus.textContent = 'Auto-copied to clipboard!';
                                        setTimeout(() => {
                                            copyStatus.textContent = '';
                                        }, 3000);
                                    })
                                    .catch(err => {
                                        console.error('Auto-copy failed: ', err);
                                    });

                                showStatus('Summary generated successfully!', 'success');
                            } else {
                                showStatus('Summary created but no content received.', 'error');
                            }
                        } else {
                            showStatus('Error: ' + response.error, 'error');
                        }
                    });
                });
            });
        });
    });

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = type;
    }
});

// Function to extract content from the page
function extractPageContent() {
    // Check if it's a PDF (simplified approach)
    const isPDF = document.contentType === 'application/pdf' ||
        window.location.href.toLowerCase().endsWith('.pdf');

    if (isPDF) {
        // For PDFs, we'd need a more sophisticated approach
        // This is a simplified placeholder
        return {
            title: document.title,
            content: "This is a PDF document. PDF extraction requires more complex handling.",
            sourceInfo: document.title,
            isPDF: true
        };
    }

    // For regular webpages
    // Get main content, prioritizing article content
    let content = '';
    const article = document.querySelector('article');

    if (article) {
        content = article.innerText;
    } else {
        // Fallback to main content or body
        const main = document.querySelector('main') || document.body;

        // Get all paragraphs and headings
        const textElements = main.querySelectorAll('p, h1, h2, h3, h4, h5, h6');
        content = Array.from(textElements).map(el => el.innerText).join('\n\n');

        // If still no content, get all text
        if (!content.trim()) {
            content = main.innerText;
        }
    }

    // Try to find author/source information
    let sourceInfo = '';
    const possibleSourceElements = document.querySelectorAll('[rel="author"], .author, .byline, [itemprop="author"]');
    if (possibleSourceElements.length > 0) {
        sourceInfo = Array.from(possibleSourceElements)
            .map(el => el.textContent.trim())
            .filter(text => text)
            .join(', ');
    }

    // If no specific author found, try to use site name/publication
    if (!sourceInfo) {
        const siteName = document.querySelector('[property="og:site_name"]');
        if (siteName && siteName.getAttribute('content')) {
            sourceInfo = siteName.getAttribute('content');
        } else {
            // Extract domain as fallback source
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