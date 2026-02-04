import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Indent } from "docx";
import { saveAs } from "file-saver";

/**
 * Parse markdown text into DOCX TextRun objects
 * Handles bold (**text**) and italic (*text*)
 */
function parseTextToRuns(text) {
    const runs = [];
    let remaining = text;

    // Simple parser for **bold** and *italic*
    // Note: This is a basic implementation. Nested formatting might need more complex logic.
    while (remaining.length > 0) {
        // Check for bold
        const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
        // Check for italic
        const italicMatch = remaining.match(/\*(.*?)\*/);

        // Find the earliest match
        let firstMatch = null;
        let type = '';

        if (boldMatch && italicMatch) {
            if (boldMatch.index < italicMatch.index) {
                firstMatch = boldMatch;
                type = 'bold';
            } else {
                firstMatch = italicMatch;
                type = 'italic';
            }
        } else if (boldMatch) {
            firstMatch = boldMatch;
            type = 'bold';
        } else if (italicMatch) {
            firstMatch = italicMatch;
            type = 'italic';
        }

        if (firstMatch) {
            // Add text before match
            if (firstMatch.index > 0) {
                runs.push(new TextRun({ text: remaining.substring(0, firstMatch.index) }));
            }

            // Add formatted text
            runs.push(new TextRun({
                text: firstMatch[1],
                bold: type === 'bold',
                italics: type === 'italic'
            }));

            remaining = remaining.substring(firstMatch.index + firstMatch[0].length);
        } else {
            // No more matches
            runs.push(new TextRun({ text: remaining }));
            remaining = '';
        }
    }

    return runs;
}

/**
 * Convert markdown context to DOCX Paragraphs
 */
function markdownToDocx(markdown) {
    if (!markdown) return [];

    const lines = markdown.split('\n');
    const paragraphs = [];

    for (let i = 0; i < lines.length; i++) {
        let line = lines[i].trim();
        if (!line) {
            // Add empty paragraph for spacing
            paragraphs.push(new Paragraph({}));
            continue;
        }

        // Headers
        if (line.startsWith('# ')) {
            paragraphs.push(new Paragraph({
                children: parseTextToRuns(line.substring(2)),
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 240, after: 120 }
            }));
        } else if (line.startsWith('## ')) {
            paragraphs.push(new Paragraph({
                children: parseTextToRuns(line.substring(3)),
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 240, after: 120 }
            }));
        } else if (line.startsWith('### ')) {
            paragraphs.push(new Paragraph({
                children: parseTextToRuns(line.substring(4)),
                heading: HeadingLevel.HEADING_3,
                spacing: { before: 200, after: 100 }
            }));
        } else if (line.startsWith('#### ')) {
            paragraphs.push(new Paragraph({
                children: parseTextToRuns(line.substring(5)),
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 150, after: 80 }
            }));
        }
        // Bullet points
        else if (line.startsWith('- ') || line.startsWith('* ')) {
            paragraphs.push(new Paragraph({
                children: parseTextToRuns(line.substring(2)),
                bullet: { level: 0 }
            }));
        }
        else if (line.startsWith('  - ') || line.startsWith('  * ')) {
            paragraphs.push(new Paragraph({
                children: parseTextToRuns(line.substring(4)),
                bullet: { level: 1 }
            }));
        }
        // Normal text
        else {
            paragraphs.push(new Paragraph({
                children: parseTextToRuns(line),
                spacing: { before: 80, after: 80 }
            }));
        }
    }

    return paragraphs;
}

export const downloadResumeDOCX = async (content, jobTitle) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: markdownToDocx(content)
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Resume_${jobTitle.replace(/[^a-z0-9]/gi, '_') || 'RoleFit'}.docx`);
};

export const downloadCoverLetterDOCX = async (content, jobTitle) => {
    const doc = new Document({
        sections: [{
            properties: {},
            children: markdownToDocx(content)
        }]
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `CoverRequest_${jobTitle.replace(/[^a-z0-9]/gi, '_') || 'RoleFit'}.docx`);
};
