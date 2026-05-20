import { describe, expect, it } from 'vitest';
import { calculateSpanishVatFromGross, formatInvoiceNumber } from '../contracts';

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
});
