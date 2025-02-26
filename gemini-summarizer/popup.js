document.addEventListener('DOMContentLoaded', function () {
    const apiKeyInput = document.getElementById('gemini-api-key');
    const saveApiKeyBtn = document.getElementById('save-api-key');
    const summarizeBtn = document.getElementById('summarize-btn');
    const apiKeySection = document.getElementById('api-key-section');
    const summarySection = document.getElementById('summary-section');
    const loadingElement = document.getElementById('loading');
    const statusMessage = document.getElementById('status-message');

    // Check if API key is saved
    chrome.storage.local.get(['geminiApiKey'], function (result) {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
            apiKeySection.style.display = 'none';
            summarySection.style.display = 'block';
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

    // Summarize current tab
    summarizeBtn.addEventListener('click', function () {
        chrome.storage.local.get(['geminiApiKey'], function (result) {
            if (!result.geminiApiKey) {
                apiKeySection.style.display = 'block';
                summarySection.style.display = 'none';
                return;
            }

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
                            // If successful and we have summary text, download it
                            if (response.summaryText) {
                                downloadSummary(response.summaryText, response.filename);
                                showStatus('Summary created! File downloaded.', 'success');
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

    // Function to download the summary as a file
    function downloadSummary(content, filename) {
        // Create a blob for the content
        const blob = new Blob([content], { type: 'text/markdown' });

        // Create a download link
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = filename;

        // Append to the document, click it, then remove it
        document.body.appendChild(downloadLink);
        downloadLink.click();

        // Clean up
        setTimeout(() => {
            URL.revokeObjectURL(downloadLink.href);
            document.body.removeChild(downloadLink);
        }, 100);
    }

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