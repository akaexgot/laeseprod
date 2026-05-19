-- =====================================================
-- CONTRACT INVOICES
-- Stores the automatically generated invoice for paid contracts.
-- Invoice numbers start at 20000 in application code.
-- =====================================================

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS invoice_number INTEGER;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS invoice_url TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS invoice_issued_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS contracts_invoice_number_unique
  ON contracts(invoice_number)
  WHERE invoice_number IS NOT NULL;
