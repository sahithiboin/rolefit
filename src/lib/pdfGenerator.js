/**
 * Professional PDF generation using browser's print functionality
 * This creates a hidden print-optimized version and triggers the browser's print dialog
 */

/**
 * Convert markdown to HTML for PDF rendering
 */
function markdownToHTML(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Remove horizontal rules first to avoid confusion with headers or lists
    html = html.replace(/^\s*[-*_]{3,}\s*$/gm, '<hr class="pdf-hr">');

    // Headers (Level 1-6)
    html = html.replace(/^# (.+)$/gm, '<h1 class="pdf-name">$1</h1>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="pdf-section">$1</h2>');
    html = html.replace(/^### (.+)$/gm, '<h3 class="pdf-subsection">$1</h3>');
    html = html.replace(/^####+ (.+)$/gm, '<h4 class="pdf-subsubsection">$1</h4>');

    // Bold and italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links (convert to plain text with URL)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');

    // Tables
    const lines = html.split('\n');
    const processedLines = [];
    let inTable = false;
    let tableBuffer = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('|') && line.endsWith('|')) {
            if (!inTable) {
                inTable = true;
                tableBuffer = [];
                // Check if previous line was also a table line (rare but possible if trim failed)
            }
            tableBuffer.push(line);
        } else {
            if (inTable) {
                processedLines.push(renderTable(tableBuffer));
                inTable = false;
                tableBuffer = [];
            }
            processedLines.push(lines[i]);
        }
    }
    if (inTable) {
        processedLines.push(renderTable(tableBuffer));
    }

    html = processedLines.join('\n');

    // Bullet points (Level 1 and 2)
    html = html.replace(/^[\-\*] (.+)$/gm, '<li class="pdf-bullet-1">$1</li>');
    html = html.replace(/^  [\-\*] (.+)$/gm, '<li class="pdf-bullet-2">$1</li>');

    // Wrap consecutive list items in ul
    html = html.replace(/(<li class="pdf-bullet-[12]">.*?<\/li>\n?)+/gs, (match) => {
        return `<ul class="pdf-list">${match}</ul>`;
    });

    // Paragraphs (lines that aren't tags or other markdown)
    html = html.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('<') || trimmed.match(/^#{1,4} /)) {
            return line;
        }
        return `<p class="pdf-paragraph">${line}</p>`;
    }).join('\n');

    return html;
}

/**
 * Simple table renderer for Markdown tables
 */
function renderTable(lines) {
    if (lines.length < 2) return lines.join('\n');

    const rows = lines.map(line => {
        return line.split('|').filter(cell => cell.trim() !== '' || line.startsWith('|') && line.endsWith('|')).map(cell => cell.trim());
    });

    // Filter out rows that are just separators (---)
    const dataRows = rows.filter(row => !row.every(cell => cell.match(/^[:\s-]*$/)));

    let tableHtml = '<table class="pdf-table">';
    dataRows.forEach((row, index) => {
        const tag = index === 0 ? 'th' : 'td';
        tableHtml += '<tr>';
        row.filter(cell => cell !== '').forEach(cell => {
            tableHtml += `<${tag}>${cell}</${tag}>`;
        });
        tableHtml += '</tr>';
    });
    tableHtml += '</table>';

    return tableHtml;
}

/**
 * Generate PDF styles for professional formatting
 */
function getPDFStyles() {
    return `
        <style>
            @media print {
                @page {
                    size: A4;
                    margin: 0; /* Important: removes browser headers and footers */
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Segoe UI", Roboto, sans-serif;
                    font-size: 10.5pt;
                    line-height: 1.45;
                    color: #1F2937;
                    background: white;
                    padding: 20mm 25mm !important; /* Move margins here to prevent overlaps and keep clean edges */
                }
                
                /* Name header */
                .pdf-name {
                    font-size: 22pt;
                    font-weight: 800;
                    text-align: left;
                    margin: 0 0 4pt 0;
                    padding: 0;
                    color: #111827;
                }
                
                /* Contact info */
                .pdf-contact {
                    font-size: 10pt;
                    text-align: left;
                    margin: 0 0 16pt 0;
                    padding-bottom: 8pt;
                    border-bottom: 1.5pt solid #E5E7EB;
                    color: #4B5563;
                }
                
                /* Section headers */
                .pdf-section {
                    font-size: 13pt;
                    font-weight: 700;
                    text-transform: uppercase;
                    margin: 14pt 0 6pt 0;
                    padding: 0;
                    color: #1F2937;
                    border-bottom: 0.5pt solid #E5E7EB;
                    padding-bottom: 3pt;
                    page-break-after: avoid;
                }
                
                /* Subsection headers */
                .pdf-subsection {
                    font-size: 11.5pt;
                    font-weight: 700;
                    margin: 10pt 0 3pt 0;
                    padding: 0;
                    color: #374151;
                    page-break-after: avoid;
                }

                /* Sub-subsection headers */
                .pdf-subsubsection {
                    font-size: 10.5pt;
                    font-weight: 700;
                    margin: 8pt 0 2pt 0;
                    padding: 0;
                    color: #4B5563;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }
                
                /* Paragraphs */
                .pdf-paragraph {
                    margin: 4pt 0;
                    padding: 0;
                    text-align: justify;
                }
                
                /* Lists */
                .pdf-list {
                    margin: 4pt 0 8pt 0;
                    padding: 0;
                    list-style: none;
                }
                
                /* Level 1 bullets */
                .pdf-bullet-1 {
                    margin: 2pt 0 2pt 5mm;
                    padding: 0;
                    position: relative;
                    text-align: justify;
                }
                
                .pdf-bullet-1:before {
                    content: "•";
                    position: absolute;
                    left: -4mm;
                    color: #6B7280;
                }
                
                /* Level 2 bullets */
                .pdf-bullet-2 {
                    margin: 1pt 0 1pt 10mm;
                    padding: 0;
                    position: relative;
                }
                
                .pdf-bullet-2:before {
                    content: "○";
                    position: absolute;
                    left: -4mm;
                    color: #6B7280;
                }
                
                /* Tables */
                .pdf-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 10pt 0;
                    font-size: 9.5pt;
                }
                
                .pdf-table th, .pdf-table td {
                    border: 0.5pt solid #E5E7EB;
                    padding: 6pt;
                    text-align: left;
                }
                
                .pdf-table th {
                    background-color: #F9FAFB;
                    font-weight: 700;
                    color: #1F2937;
                }

                .pdf-hr {
                    border: none;
                    border-top: 0.5pt solid #E5E7EB;
                    margin: 12pt 0;
                }
                
                /* Emphasis */
                strong { font-weight: 700; color: #111827; }
                em { font-style: italic; }
                
                /* Layout controls */
                h1, h2, h3, h4 { page-break-after: avoid; }
                li { page-break-inside: avoid; }
                ul { page-break-inside: auto; }
            }
        </style>
    `;
}

/**
 * Download PDF using browser's print dialog
 */
export function downloadResumePDF(resumeContent, jobTitle = '') {
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Parse markdown to HTML
    const htmlContent = markdownToHTML(resumeContent);

    // Extract name and contact from first few lines to use as cleaner header
    const lines = resumeContent.split('\n');
    let name = '';
    let contact = '';

    for (let i = 0; i < Math.min(8, lines.length); i++) {
        const line = lines[i].trim();
        if (line.startsWith('# ')) {
            name = line.substring(2).replace(/\*\*/g, '');
        } else if (line.includes('@') || line.includes('|')) {
            contact = line.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
        }
    }

    // Build the print document
    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Resume - ${name || 'RoleFit'}</title>
            ${getPDFStyles()}
        </head>
        <body>
            ${name ? `<h1 class="pdf-name">${name}</h1>` : ''}
            ${contact ? `<div class="pdf-contact">${contact}</div>` : ''}
            ${htmlContent.replace(new RegExp(`<h1 class="pdf-name">${name}</h1>`, 'g'), '').replace(new RegExp(`<div class="pdf-contact">${contact}</div>`, 'g'), '')}
        </body>
        </html>
    `;

    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    // Wait for content to load, then print
    iframe.onload = () => {
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Clean up after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 250);
    };
}

/**
 * Download cover letter PDF
 */
export function downloadCoverLetterPDF(coverLetterContent, jobTitle = '') {
    // Create a hidden iframe for printing
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Parse markdown to HTML
    const htmlContent = markdownToHTML(coverLetterContent);

    // Build the print document
    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Cover Letter - RoleFit</title>
            ${getPDFStyles()}
        </head>
        <body>
            ${htmlContent}
        </body>
        </html>
    `;

    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    // Wait for content to load, then print
    iframe.onload = () => {
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();

            // Clean up after printing
            setTimeout(() => {
                document.body.removeChild(iframe);
            }, 1000);
        }, 250);
    };
}
