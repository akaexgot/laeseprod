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

export const INVOICE_START_NUMBER = 20000;

export const INVOICE_COMPANY = {
    name: 'LAESE PRODUCCIONES S.L.',
    cif: 'B-72757990',
    address: 'c/ Nuestra Señora de Valme 23, 41701, Dos Hermanas (Sevilla)',
    iban: 'ES84 0182 3135 2202 0161 7430',
};

export const INVOICE_CLIENT_FIELDS = [
    { key: 'CLIENTE_NOMBRE_FISCAL', label: 'Nombre de empresa / razón social' },
    { key: 'CLIENTE_CIF', label: 'CIF / NIF' },
    { key: 'CLIENTE_DIRECCION', label: 'Dirección fiscal' },
];

export function getInvoiceClientFieldKeys() {
    return INVOICE_CLIENT_FIELDS.map((field) => field.key);
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
        pages[i].drawText(`VideoMarketing Sevilla | www.videomarketingsevilla.com`, {
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

interface InvoicePdfInput {
    invoiceNumber: number;
    issueDate: Date;
    clientName: string;
    clientCif: string;
    clientAddress: string;
    concept: string;
    amount: number;
    contractId: string;
}

/**
 * Generates a simple invoice PDF for paid contracts.
 */
export async function generateInvoicePDF(input: InvoicePdfInput) {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]);
    const { width, height } = page.getSize();

    const fontMain = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const margin = 50;
    const carmin = rgb(0.61, 0.11, 0.19);
    const dark = rgb(0.08, 0.08, 0.1);
    const muted = rgb(0.42, 0.42, 0.46);
    const lightLine = rgb(0.88, 0.88, 0.9);

    const date = input.issueDate.toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' });
    const amount = Number(input.amount || 0);
    const amountText = `${amount.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EUR`;

    page.drawText('FACTURA', { x: margin, y: height - 72, size: 30, font: fontBold, color: dark });
    page.drawText(`No ${input.invoiceNumber}`, { x: margin, y: height - 100, size: 12, font: fontBold, color: carmin });
    page.drawText(`Fecha: ${date}`, { x: margin, y: height - 120, size: 10, font: fontMain, color: muted });

    const sellerX = margin;
    const buyerX = width / 2 + 10;
    let y = height - 175;

    page.drawText('Emisor', { x: sellerX, y, size: 11, font: fontBold, color: dark });
    page.drawText('Cliente', { x: buyerX, y, size: 11, font: fontBold, color: dark });
    y -= 22;

    [
        INVOICE_COMPANY.name,
        `CIF: ${INVOICE_COMPANY.cif}`,
        INVOICE_COMPANY.address,
        `IBAN: ${INVOICE_COMPANY.iban}`,
    ].forEach((line) => {
        page.drawText(line, { x: sellerX, y, size: 9, font: fontMain, color: dark, maxWidth: 230 });
        y -= 15;
    });

    y = height - 197;
    [
        input.clientName,
        `CIF/NIF: ${input.clientCif}`,
        input.clientAddress,
        `Contrato: ${input.contractId}`,
    ].forEach((line) => {
        page.drawText(line || '-', { x: buyerX, y, size: 9, font: fontMain, color: dark, maxWidth: 235 });
        y -= 15;
    });

    y = height - 330;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: lightLine });
    y -= 28;

    page.drawText('Concepto', { x: margin, y, size: 10, font: fontBold, color: muted });
    page.drawText('Importe', { x: width - margin - 80, y, size: 10, font: fontBold, color: muted });
    y -= 18;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: lightLine });
    y -= 28;

    page.drawText(input.concept || 'Pago de servicios audiovisuales', {
        x: margin,
        y,
        size: 10,
        font: fontMain,
        color: dark,
        maxWidth: 330,
    });
    page.drawText(amountText, { x: width - margin - 95, y, size: 10, font: fontMain, color: dark });

    y -= 90;
    page.drawLine({ start: { x: width - margin - 180, y }, end: { x: width - margin, y }, thickness: 1, color: lightLine });
    y -= 26;
    page.drawText('Total factura', { x: width - margin - 180, y, size: 12, font: fontBold, color: dark });
    page.drawText(amountText, { x: width - margin - 95, y, size: 12, font: fontBold, color: carmin });

    page.drawText('Factura generada automáticamente tras la confirmación del pago.', {
        x: margin,
        y: 70,
        size: 8,
        font: fontMain,
        color: muted,
    });

    return await pdfDoc.save();
}

