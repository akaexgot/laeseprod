import { describe, expect, it } from 'vitest';
import {
  INVOICE_COMPANY,
  INVOICE_FIXED_CONCEPT,
  calculateSpanishVatFromGross,
  formatInvoiceNumber,
  generateContractPDF,
} from '../contracts';

describe('invoice helpers', () => {
  it('formats invoice numbers with the fiscal series', () => {
    expect(formatInvoiceNumber(20000)).toBe('F-20000');
  });

  it('splits a gross Stripe amount into Spanish VAT amounts', () => {
    expect(calculateSpanishVatFromGross(750)).toEqual({
      taxableBase: 619.83,
      vatRate: 0.21,
      vatAmount: 130.17,
      total: 750,
    });
  });

  it('uses the fixed invoice concept and a single-line issuer address', () => {
    expect(INVOICE_FIXED_CONCEPT).toBe('Prestacion de servicios audiovisuales.');
    expect(INVOICE_COMPANY.address).toBe('c/ Nuestra Señora de Valme 23, 41701, Dos Hermanas');
  });

  it('generates signed contracts with the company seal asset available', async () => {
    const signaturePng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const pdf = await generateContractPDF(
      'Contrato test',
      '<h2>Titulo</h2><p>Texto <strong>negrita</strong>, <em>cursiva</em> y <u>subrayado</u>.</p><ul><li>Clausula uno</li></ul>',
      signaturePng
    );

    expect(pdf.length).toBeGreaterThan(1000);
  });
});
