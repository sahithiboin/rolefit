import { Document, Packer, Paragraph, TextRun, AlignmentType, ExternalHyperlink, BorderStyle } from "docx";
import { saveAs } from "file-saver";

// Color / size constants matching the PDF look
const DARK = "1F2937";      // near-black body text
const HEADING_COLOR = "111827"; // section header color

/**
 * Parse markdown text into DOCX TextRun/ExternalHyperlink objects.
 * Handles **bold**, *italic*, [link](url)
 */
function parseTextToRuns(text, baseColor = DARK) {
    const runs = [];
    let remaining = text;

    while (remaining.length > 0) {
        const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
        const italicMatch = remaining.match(/\*(.*?)\*/);
        const linkMatch = remaining.match(/\[(.*?)\]\((.*?)\)/);

        let firstMatch = null;
        let type = '';

        if (boldMatch) { firstMatch = boldMatch; type = 'bold'; }
        if (italicMatch && (!firstMatch || italicMatch.index < firstMatch.index)) { firstMatch = italicMatch; type = 'italic'; }
        if (linkMatch && (!firstMatch || linkMatch.index < firstMatch.index)) { firstMatch = linkMatch; type = 'link'; }

        if (firstMatch) {
            if (firstMatch.index > 0) {
                runs.push(new TextRun({ text: remaining.substring(0, firstMatch.index), color: baseColor }));
            }
            if (type === 'link') {
                // Render links as plain underlined dark text — no blue
                runs.push(new TextRun({
                    text: firstMatch[1],
                    color: baseColor,
                    underline: { type: "single" },
                }));
            } else {
                runs.push(new TextRun({
                    text: firstMatch[1],
                    bold: type === 'bold',
                    italics: type === 'italic',
                    color: baseColor,
                }));
            }
            remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
        } else {
            runs.push(new TextRun({ text: remaining, color: baseColor }));
            remaining = '';
        }
    }

    return runs;
}

/**
 * Convert markdown to DOCX Paragraphs using explicit styling to match PDF look.
 * Does NOT use HeadingLevel (which inherits blue theme colors).
 */
function markdownToDocx(markdown) {
    if (!markdown) return [];

    const lines = markdown.split('\n');
    const paragraphs = [];

    // Track whether we've seen the name line for contact detection
    let nameFound = false;
    let contactFound = false;

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();

        // Skip blank lines — use tight spacing on paragraphs instead
        if (!line) {
            paragraphs.push(new Paragraph({ spacing: { before: 0, after: 0 }, children: [new TextRun({ text: '' })] }));
            continue;
        }

        if (line.startsWith('# ')) {
            // Name — large, bold, centered, dark
            nameFound = true;
            paragraphs.push(new Paragraph({
                alignment: AlignmentType.CENTER,
                spacing: { before: 0, after: 60 },
                children: [new TextRun({
                    text: line.substring(2).replace(/\*\*/g, ''),
                    bold: true,
                    size: 44,           // 22pt
                    color: HEADING_COLOR,
                    font: "Arial",
                })]
            }));

        } else if (line.startsWith('## ')) {
            // Section header — uppercase, bold, dark, compact, with bottom border
            const text = line.substring(3).replace(/\*\*/g, '');
            paragraphs.push(new Paragraph({
                spacing: { before: 160, after: 60 },
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: "E5E7EB" }
                },
                children: [new TextRun({
                    text: text.toUpperCase(),
                    bold: true,
                    size: 24,           // 12pt
                    color: HEADING_COLOR,
                    font: "Arial",
                })]
            }));

        } else if (line.startsWith('### ')) {
            // Sub-section header (e.g. Technical Skills:)
            const text = line.substring(4).replace(/\*\*/g, '');
            paragraphs.push(new Paragraph({
                spacing: { before: 100, after: 40 },
                children: [new TextRun({
                    text,
                    bold: true,
                    size: 22,           // 11pt
                    color: HEADING_COLOR,
                    font: "Arial",
                })]
            }));

        } else if (line.startsWith('#### ')) {
            const text = line.substring(5).replace(/\*\*/g, '');
            paragraphs.push(new Paragraph({
                spacing: { before: 80, after: 40 },
                children: [new TextRun({
                    text,
                    bold: true,
                    size: 21,
                    color: HEADING_COLOR,
                    font: "Arial",
                })]
            }));

        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            // Bullet — compact, dark, justified
            paragraphs.push(new Paragraph({
                bullet: { level: 0 },
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 40, after: 40 },
                children: parseTextToRuns(line.substring(2)),
            }));

        } else if (line.startsWith('  - ') || line.startsWith('  * ')) {
            paragraphs.push(new Paragraph({
                bullet: { level: 1 },
                alignment: AlignmentType.JUSTIFIED,
                spacing: { before: 30, after: 30 },
                children: parseTextToRuns(line.substring(4)),
            }));

        } else {
            // Normal paragraph — contact line is centered, everything else is justified
            const isContactLine = nameFound && !contactFound &&
                (line.includes('@') || line.includes('|') || line.toLowerCase().includes('linkedin'));

            if (isContactLine) contactFound = true;

            paragraphs.push(new Paragraph({
                alignment: isContactLine ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
                spacing: { before: isContactLine ? 40 : 60, after: isContactLine ? 80 : 60 },
                children: parseTextToRuns(line),
            }));
        }
    }

    return paragraphs;
}

// Shared page margins in twips (1 inch = 1440 twips; 19mm ≈ 1080 twips)
const PAGE_MARGINS = { top: 1080, right: 1080, bottom: 1080, left: 1080 };

export const downloadResumeDOCX = async (content, jobTitle) => {
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Arial", size: 21, color: DARK },  // 10.5pt default
                },
            },
        },
        sections: [{
            properties: { page: { margin: PAGE_MARGINS } },
            children: markdownToDocx(content)
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Resume_${jobTitle.replace(/[^a-z0-9]/gi, '_') || 'RoleFit'}.docx`);
};

export const downloadCoverLetterDOCX = async (content, jobTitle) => {
    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: { font: "Arial", size: 21, color: DARK },
                },
            },
        },
        sections: [{
            properties: { page: { margin: PAGE_MARGINS } },
            children: markdownToDocx(content)
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `CoverRequest_${jobTitle.replace(/[^a-z0-9]/gi, '_') || 'RoleFit'}.docx`);
};
