/**
 * Contracts Utility Library
 * Handles placeholder replacement and PDF generation logic
 */

/**
 * Replaces {{TAGS}} in content with values from data object
 * @param content The HTML/Text content with placeholders
 * @param data Object containing key-value pairs for placeholders
 */
export function replacePlaceholders(content: string, data: Record<string, any>): string {
    let result = content;
    for (const [key, value] of Object.entries(data)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, value?.toString() || '');
    }
    return result;
}

/**
 * Extracts all {{TAGS}} found in a string
 */
export function extractPlaceholders(content: string): string[] {
    const regex = /{{(.*?)}}/g;
    const matches = content.match(regex) || [];
    return [...new Set(matches.map(m => m.replace(/{{|}}/g, '')))];
}

/**
 * Generates a PDF buffer for the contract
 */
export async function generateContractPDF(title: string, htmlContent: string, signatureDataUrl: string) {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const fontMain = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 50;
    let y = height - margin;

    // Header
    page.drawText(title, { x: margin, y, size: 20, font: fontBold, color: rgb(0, 0, 0) });
    y -= 40;

    // Content (Simplified text rendering for now, splitting by newlines/tags)
    // In a real app we would use a more advanced HTML-to-PDF engine
    const cleanText = htmlContent.replace(/<[^>]*>?/gm, '\n');
    const lines = cleanText.split('\n').filter(l => l.trim().length > 0);

    for (const line of lines) {
        if (y < margin + 100) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - margin;
        }
        page.drawText(line, { x: margin, y, size: 10, font: fontMain, color: rgb(0.1, 0.1, 0.1), maxWidth: width - (margin * 2) });
        y -= 15;
    }

    // Signature
    if (signatureDataUrl) {
        y -= 30;
        if (y < 200) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - margin;
        }

        page.drawText('Firmado digitalmente por el Cliente:', { x: margin, y, size: 10, font: fontBold });
        y -= 60;

        try {
            const sigImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
            const sigImage = await pdfDoc.embedPng(sigImageBytes);
            const dims = sigImage.scale(0.5);
            page.drawImage(sigImage, {
                x: margin,
                y: y,
                width: dims.width,
                height: dims.height,
            });
        } catch (e) {
            console.error('Error embedding signature:', e);
        }
    }

    return await pdfDoc.save();
}

