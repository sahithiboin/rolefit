import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Convert markdown to HTML for PDF rendering (Print Optimization)
 */
function markdownToHTML(markdown) {
    if (!markdown) return '';

    let html = markdown;

    // Remove horizontal rules first
    html = html.replace(/^\s*[-*_]{3,}\s*$/gm, '<hr class="pdf-hr">');

    // Headers
    html = html.replace(/^# (.+)$/gm, '<h1 class="pdf-name">$1</h1>');
    html = html.replace(/^## (.+)$/gm, '<h2 class="pdf-section">$1</h2>');
    html = html.replace(/^### (.+)$/gm, '<h3 class="pdf-subsection">$1</h3>');
    html = html.replace(/^####+ (.+)$/gm, '<h4 class="pdf-subsubsection">$1</h4>');

    // Bold/Italic
    html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

    // Links (clickable)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="pdf-link">$1</a>');

    // Bullet points
    html = html.replace(/^[\-\*] (.+)$/gm, '<li class="pdf-bullet-1">$1</li>');
    html = html.replace(/^  [\-\*] (.+)$/gm, '<li class="pdf-bullet-2">$1</li>');

    // Wrap in ul
    html = html.replace(/(<li class="pdf-bullet-[12]">.*?<\/li>\n?)+/gs, (match) => {
        return `<ul class="pdf-list">${match}</ul>`;
    });

    // Paragraphs
    html = html.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('<') || trimmed.match(/^#{1,4} /)) {
            return line;
        }
        return `<p class="pdf-paragraph">${line}</p>`;
    }).join('\n');

    return html;
}

function getPDFStyles() {
    return `
        <style>
            @media print {
                @page {
                    size: letter;
                    margin: 18mm 20mm 18mm 20mm;
                }
                * {
                    box-sizing: border-box;
                }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    font-size: 10.5pt;
                    line-height: 1.45;
                    color: #1F2937;
                    background: white;
                    padding: 0 !important;
                    margin: 0 !important;
                    width: 100% !important;
                    max-width: 100% !important;
                    overflow-x: hidden;
                    word-break: break-word;
                    overflow-wrap: break-word;
                }
                /* Explicitly suppress non-linear elements */
                table, .grid, .sidebar, .columns { display: none !important; visibility: hidden !important; height: 0 !important; width: 0 !important; margin: 0 !important; padding: 0 !important; }
                
                .pdf-name { font-size: 22pt; font-weight: 800; text-align: center; margin: 0 0 4pt 0; color: #111827; display: block !important; width: 100% !important; }
                .pdf-contact { font-size: 10pt; text-align: center; margin: 0 0 14pt 0; padding-bottom: 8pt; border-bottom: 1.5pt solid #E5E7EB; color: #4B5563; display: block !important; width: 100% !important; word-break: break-word; }
                .pdf-section { font-size: 13pt; font-weight: 700; text-transform: uppercase; margin: 14pt 0 6pt 0; color: #1F2937; border-bottom: 0.5pt solid #E5E7EB; padding-bottom: 3pt; display: block !important; width: 100% !important; clear: both !important; }
                .pdf-subsection { font-size: 11.5pt; font-weight: 700; margin: 10pt 0 3pt 0; color: #374151; display: block !important; width: 100% !important; }
                .pdf-subsubsection { font-size: 10.5pt; font-weight: 700; margin: 8pt 0 2pt 0; color: #4B5563; text-transform: uppercase; display: block !important; width: 100% !important; }
                .pdf-paragraph { margin: 4pt 0; text-align: justify; display: block !important; width: 100% !important; word-break: break-word; overflow-wrap: break-word; }
                .pdf-list { margin: 4pt 0 8pt 0; padding: 0; list-style: none; display: block !important; width: 100% !important; }
                .pdf-bullet-1 { margin: 2pt 0 2pt 5mm; position: relative; text-align: justify; display: block !important; width: calc(100% - 5mm) !important; word-break: break-word; overflow-wrap: break-word; }
                .pdf-bullet-1:before { content: "•"; position: absolute; left: -4mm; color: #6B7280; }
                .pdf-bullet-2 { margin: 1pt 0 1pt 10mm; position: relative; word-break: break-word; overflow-wrap: break-word; }
                .pdf-bullet-2:before { content: "○"; position: absolute; left: -4mm; color: #6B7280; }
                .pdf-hr { border: none; border-top: 0.5pt solid #E5E7EB; margin: 12pt 0; }
                .pdf-link { color: #2563EB; text-decoration: underline; }
                strong { font-weight: 700; color: #111827; }
                em { font-style: italic; }
            }
        </style>
    `;
}

/**
 * Print Preview version as requested by the user.
 */
function printContent(content, isResume) {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'absolute';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;

    // Header extraction — strip name & contact from markdown BEFORE converting to HTML
    // so they only appear once (as the centered header), never as a duplicate body line.
    const lines = content.split('\n');
    let name = '';
    let contact = '';
    let nameLineIdx = -1;
    let contactLineIdx = -1;

    if (isResume) {
        for (let i = 0; i < Math.min(8, lines.length); i++) {
            const line = lines[i].trim();
            if (line.startsWith('# ') && nameLineIdx === -1) {
                name = line.substring(2).replace(/\*\*/g, '');
                nameLineIdx = i;
            } else if ((line.includes('@') || line.includes('|')) && contactLineIdx === -1 && nameLineIdx !== -1) {
                // Keep markdown links for display in the centered header
                contact = line.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="pdf-link">$1</a>');
                contactLineIdx = i;
            }
        }
    }

    // Build a cleaned markdown with name+contact lines removed to avoid duplication
    const cleanedLines = lines.filter((_, i) => i !== nameLineIdx && i !== contactLineIdx);
    const htmlContent = markdownToHTML(cleanedLines.join('\n'));

    const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>${isResume ? 'Resume' : 'Cover Letter'}</title>
            ${getPDFStyles()}
        </head>
        <body>
            ${name ? `<h1 class="pdf-name">${name}</h1>` : ''}
            ${contact ? `<div class="pdf-contact">${contact}</div>` : ''}
            ${htmlContent}
        </body>
        </html>
    `;

    iframeDoc.open();
    iframeDoc.write(printHTML);
    iframeDoc.close();

    iframe.onload = () => {
        setTimeout(() => {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
            setTimeout(() => document.body.removeChild(iframe), 1000);
        }, 250);
    };
}

/**
 * Exported functions that favor the Print Preview
 */
export function downloadResumePDF(markdownContent, jobTitle = '') {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 768);
    if (isMobile) {
        generatejsPDF(markdownContent, `Resume_${jobTitle.replace(/[^a-z0-9]/gi, '_') || 'RoleFit'}`, true);
    } else {
        printContent(markdownContent, true);
    }
}

export function downloadCoverLetterPDF(markdownContent, jobTitle = '') {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (window.innerWidth <= 768);
    if (isMobile) {
        generatejsPDF(markdownContent, `CoverLetter_${jobTitle.replace(/[^a-z0-9]/gi, '_') || 'RoleFit'}`, false);
    } else {
        printContent(markdownContent, false);
    }
}

/**
 * Keep the jsPDF ATS version as an alternative (Download ATS-Optimized PDF)
 */
export function downloadResumeATS(markdownContent, jobTitle = '') {
    generatejsPDF(markdownContent, `Resume_${jobTitle.replace(/[^a-z0-9]/gi, '_') || 'RoleFit'}`, true);
}

function generatejsPDF(markdown, filename, isResume) {
    if (!markdown) return;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });
    const margin = 50;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let currentY = margin;

    doc.setFont("helvetica");

    const renderText = (text, size, style, color = 0, indent = 0) => {
        if (currentY > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); currentY = margin; }
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(color);
        const lines = doc.splitTextToSize(text, contentWidth - indent);
        if ((size > 10) && currentY > margin) currentY += 10;
        doc.text(lines, margin + indent, currentY + size);
        currentY += (lines.length * size * 1.5) + (size > 10 ? 10 : 5);
    };

    const lines = markdown.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) { currentY += 8; continue; }
        if (line.match(/^[-*_]{3,}$/)) { doc.setDrawColor(200); doc.line(margin, currentY + 5, pageWidth - margin, currentY + 5); currentY += 15; continue; }
        
        // Single column rendering: Fixed width, no floating elements
        if (line.startsWith('# ')) renderText(line.substring(2).replace(/\*/g, ''), 22, 'bold');
        else if (line.startsWith('## ')) { renderText(line.substring(3).replace(/\*/g, '').toUpperCase(), 14, 'bold'); doc.setDrawColor(200); doc.line(margin, currentY - 5, pageWidth - margin, currentY - 5); }
        else if (line.startsWith('### ')) renderText(line.substring(4).replace(/\*/g, ''), 12, 'bold');
        else if (line.startsWith('  - ') || line.startsWith('  * ')) renderText(`○  ${line.substring(4).replace(/\*\*/g, '').replace(/\*/g, '')}`, 10, 'normal', 0, 30);
        else if (line.startsWith('- ') || line.startsWith('* ')) renderText(`•  ${line.substring(2).replace(/\*\*/g, '').replace(/\*/g, '')}`, 10, 'normal', 0, 15);
        // Better bold handling for Job Titles and Companies
        else if (line.startsWith('**') && line.endsWith('**')) renderText(line.replace(/\*\*/g, ''), 10, 'bold');
        else renderText(line.replace(/\*\*/g, '').replace(/\*/g, ''), 10, 'normal');
    }

    doc.save(`${filename}.pdf`);
}

