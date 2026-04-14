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
 * Generates a professional PDF buffer for the contract
 */
export async function generateContractPDF(title: string, htmlContent: string, signatureDataUrl: string) {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    
    const fontMain = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    const margin = 50;
    let y = height - margin;

    // --- Content Rendering ---
    // Extract text from HTML (simple replacement for tags)
    // In a production environment with complex HTML, we'd use a dedicated HTML-to-PDF engine
    const cleanText = htmlContent
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p>/gi, '\n')
        .replace(/<\/p>/gi, '\n')
        .replace(/<strong>/gi, '')
        .replace(/<\/strong>/gi, '')
        .replace(/<[^>]*>?/gm, '');

    const sections = cleanText.split('\n');
    const fontSize = 10;
    const lineHeight = fontSize * 1.6;

    for (const section of sections) {
        const text = section.trim();
        if (!text) {
            y -= lineHeight;
            continue;
        }

        // Split text into lines to fit page width
        const words = text.split(' ');
        let currentLine = '';

        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const testWidth = fontMain.widthOfTextAtSize(testLine, fontSize);

            if (testWidth > width - (margin * 2)) {
                // Draw current line and start new one
                if (y < margin + 100) {
                    page = pdfDoc.addPage([595.28, 841.89]);
                    y = height - margin;
                }
                page.drawText(currentLine, { x: margin, y, size: fontSize, font: fontMain, color: rgb(0.15, 0.15, 0.15) });
                y -= lineHeight;
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }

        // Draw last line of section
        if (currentLine) {
            if (y < margin + 100) {
                page = pdfDoc.addPage([595.28, 841.89]);
                y = height - margin;
            }
            page.drawText(currentLine, { x: margin, y, size: fontSize, font: fontMain, color: rgb(0.15, 0.15, 0.15) });
            y -= lineHeight;
        }
        
        y -= 10; // Extra spacing between sections
    }

    // --- Signature ---
    if (signatureDataUrl) {
        y -= 40;
        if (y < 200) {
            page = pdfDoc.addPage([595.28, 841.89]);
            y = height - margin;
        }

        page.drawText('FIRMADO DIGITALMENTE POR EL CLIENTE:', { 
            x: margin, 
            y, 
            size: 9, 
            font: fontBold,
            color: rgb(0.4, 0.4, 0.4)
        });
        y -= 80;

        try {
            // PNG signature from DataURL
            const base64Data = signatureDataUrl.split(',')[1];
            const sigImageBytes = Buffer.from(base64Data, 'base64');
            const sigImage = await pdfDoc.embedPng(sigImageBytes);
            const dims = sigImage.scale(0.4);
            
            page.drawImage(sigImage, {
                x: margin,
                y: y,
                width: dims.width,
                height: dims.height,
            });
            
            // Signature date
            const dateStr = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
            page.drawText(`Fecha: ${dateStr}`, {
                x: margin,
                y: y - 20,
                size: 8,
                font: fontMain,
                color: rgb(0.5, 0.5, 0.5)
            });
        } catch (e) {
            console.error('Error embedding signature in PDF:', e);
        }
    }

    // --- Footer ---
    const pages = pdfDoc.getPages();
    for (let i = 0; i < pages.length; i++) {
        const { width } = pages[i].getSize();
        
        // Left side: Company info
        pages[i].drawText(`VideoMarketing Sevilla | www.videomarketingsevilla.reviseo.es`, {
            x: margin,
            y: 20,
            size: 8,
            font: fontMain,
            color: rgb(0.6, 0.6, 0.6)
        });

        // Right side: Page numbering
        const pageText = `Página ${i + 1} de ${pages.length}`;
        const pageTextWidth = fontMain.widthOfTextAtSize(pageText, 8);
        pages[i].drawText(pageText, {
            x: width - margin - pageTextWidth,
            y: 20,
            size: 8,
            font: fontMain,
            color: rgb(0.6, 0.6, 0.6)
        });
    }

    return await pdfDoc.save();
}


