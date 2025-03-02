function convertMarkdownToNotionBlocks(markdownContent) {
    // Split the markdown content by lines
    const lines = markdownContent.split('\n');
    const blocks = [];
    let inCodeBlock = false;
    let codeBlockContent = '';
    let codeBlockLanguage = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Handle multi-line code blocks (```code```)
        if (line.trim().startsWith('```')) {
            if (!inCodeBlock) {
                // Start of a code block
                inCodeBlock = true;
                // Extract language if specified
                codeBlockLanguage = line.trim().substring(3).trim();
                codeBlockContent = '';
            } else {
                // End of a code block
                inCodeBlock = false;
                blocks.push({
                    object: "block",
                    type: "code",
                    code: {
                        rich_text: [{
                            type: "text",
                            text: {
                                content: codeBlockContent
                            }
                        }],
                        language: codeBlockLanguage || "plain text"
                    }
                });
            }
            continue;
        }

        // If we're inside a code block, add the line to the code content
        if (inCodeBlock) {
            codeBlockContent += (codeBlockContent ? '\n' : '') + line;
            continue;
        }

        // Skip empty lines outside of code blocks
        if (line.trim() === '') {
            continue;
        }

        // Process inline code (surrounded by backticks)
        const processInlineCode = (text) => {
            let result = [];
            let currentIndex = 0;
            let inInlineCode = false;
            let codeStart = -1;

            for (let i = 0; i < text.length; i++) {
                if (text[i] === '`') {
                    if (!inInlineCode) {
                        // Start of inline code
                        if (i > currentIndex) {
                            // Add text before code
                            result.push({
                                type: "text",
                                text: {
                                    content: text.substring(currentIndex, i)
                                }
                            });
                        }
                        inInlineCode = true;
                        codeStart = i + 1;
                    } else {
                        // End of inline code
                        result.push({
                            type: "text",
                            text: {
                                content: text.substring(codeStart, i)
                            },
                            annotations: {
                                code: true
                            }
                        });
                        inInlineCode = false;
                        currentIndex = i + 1;
                    }
                }
            }

            // Add any remaining text
            if (currentIndex < text.length) {
                result.push({
                    type: "text",
                    text: {
                        content: text.substring(currentIndex)
                    }
                });
            }

            return result.length > 0 ? result : [{
                type: "text",
                text: {
                    content: text
                }
            }];
        };

        // Check for headings
        if (line.startsWith('# ')) {
            blocks.push({
                object: "block",
                type: "heading_1",
                heading_1: {
                    rich_text: processInlineCode(line.substring(2))
                }
            });
        } else if (line.startsWith('## ')) {
            blocks.push({
                object: "block",
                type: "heading_2",
                heading_2: {
                    rich_text: processInlineCode(line.substring(3))
                }
            });
        } else if (line.startsWith('### ')) {
            blocks.push({
                object: "block",
                type: "heading_3",
                heading_3: {
                    rich_text: processInlineCode(line.substring(4))
                }
            });
        }
        // Check for bullet list
        else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
            const content = line.trim().substring(2);
            blocks.push({
                object: "block",
                type: "bulleted_list_item",
                bulleted_list_item: {
                    rich_text: processInlineCode(content)
                }
            });
        }
        // Check for numbered list
        else if (/^\d+\.\s/.test(line.trim())) {
            // Find where the text starts after the number and dot
            const match = line.trim().match(/^\d+\.\s(.*)/);
            if (match && match[1]) {
                blocks.push({
                    object: "block",
                    type: "numbered_list_item",
                    numbered_list_item: {
                        rich_text: processInlineCode(match[1])
                    }
                });
            }
        }
        // Regular paragraph
        else {
            blocks.push({
                object: "block",
                type: "paragraph",
                paragraph: {
                    rich_text: processInlineCode(line)
                }
            });
        }
    }

    // If we ended with an unclosed code block, add it
    if (inCodeBlock && codeBlockContent) {
        blocks.push({
            object: "block",
            type: "code",
            code: {
                rich_text: [{
                    type: "text",
                    text: {
                        content: codeBlockContent
                    }
                }],
                language: codeBlockLanguage || "plain text"
            }
        });
    }

    return blocks;
}

// Export the function
export { convertMarkdownToNotionBlocks };