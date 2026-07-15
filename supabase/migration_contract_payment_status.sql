-- =====================================================
-- CONTRACT PAYMENT STATUS / STRIPE BANK TRANSFER SUPPORT
-- =====================================================

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS payment_method TEXT;

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contracts_payment_status_check'
  ) THEN
    ALTER TABLE contracts
    ADD CONSTRAINT contracts_payment_status_check
    CHECK (payment_status IN ('unpaid', 'pending', 'processing', 'paid', 'failed', 'expired'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contracts_payment_status ON contracts(payment_status);
CREATE INDEX IF NOT EXISTS idx_contracts_payment_intent_id ON contracts(payment_intent_id);
