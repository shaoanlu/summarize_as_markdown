// weeklyRecapPopup.js

// Function to create and display the weekly recap popup
function showWeeklyRecapPopup(recapContent) {
    // Create popup container
    const popupOverlay = document.createElement('div');
    popupOverlay.style.position = 'fixed';
    popupOverlay.style.top = '0';
    popupOverlay.style.left = '0';
    popupOverlay.style.width = '100%';
    popupOverlay.style.height = '100%';
    popupOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    popupOverlay.style.zIndex = '9999';
    popupOverlay.style.display = 'flex';
    popupOverlay.style.justifyContent = 'center';
    popupOverlay.style.alignItems = 'center';

    // Create popup content
    const popupContent = document.createElement('div');
    popupContent.style.backgroundColor = 'white';
    popupContent.style.padding = '20px';
    popupContent.style.borderRadius = '8px';
    popupContent.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
    popupContent.style.width = '80%';
    popupContent.style.maxWidth = '800px';
    popupContent.style.maxHeight = '90vh';
    popupContent.style.overflowY = 'auto';
    popupContent.style.position = 'relative';

    // Create close button
    const closeButton = document.createElement('button');
    closeButton.textContent = '×';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.backgroundColor = 'transparent';
    closeButton.style.border = 'none';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.onclick = () => document.body.removeChild(popupOverlay);

    // Create title
    const title = document.createElement('h2');
    title.textContent = 'Weekly Recap';
    title.style.borderBottom = '1px solid #eee';
    title.style.paddingBottom = '10px';
    title.style.marginTop = '0';
    title.style.color = '#1a73e8';

    // Create content area with markdown formatting
    const contentArea = document.createElement('div');
    contentArea.style.whiteSpace = 'pre-wrap';
    contentArea.style.lineHeight = '1.5';
    contentArea.style.marginTop = '15px';

    // Format markdown (simple version)
    const formattedContent = recapContent
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^\* (.*$)/gm, '• $1<br>')
        .replace(/^\d+\. (.*$)/gm, '$1<br>')
        .replace(/\n\n/g, '<br><br>');

    contentArea.innerHTML = formattedContent;

    // Create copy button
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy to Clipboard';
    copyButton.style.backgroundColor = '#1a73e8';
    copyButton.style.color = 'white';
    copyButton.style.border = 'none';
    copyButton.style.padding = '8px 16px';
    copyButton.style.borderRadius = '4px';
    copyButton.style.marginTop = '20px';
    copyButton.style.cursor = 'pointer';
    copyButton.onclick = () => {
        navigator.clipboard.writeText(recapContent)
            .then(() => {
                const origText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                setTimeout(() => {
                    copyButton.textContent = origText;
                }, 2000);
            })
            .catch(err => {
                console.error('Copy failed: ', err);
            });
    };

    // Assemble popup
    popupContent.appendChild(closeButton);
    popupContent.appendChild(title);
    popupContent.appendChild(contentArea);
    popupContent.appendChild(copyButton);
    popupOverlay.appendChild(popupContent);

    // Add to document
    document.body.appendChild(popupOverlay);
}

export { showWeeklyRecapPopup };