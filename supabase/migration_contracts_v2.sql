-- Add new columns to contracts table
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_email TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone TEXT;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_billable BOOLEAN DEFAULT FALSE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS billable_amount NUMERIC(10, 2) DEFAULT 0;

-- Add contract_terms_text to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS contract_terms_text TEXT DEFAULT 'Al continuar, aceptas la política de privacidad y los términos de servicio de VideoMarketing Sevilla.';

-- Update project schema (verify subtitle is there)
-- It already is in schema.sql but we ensure it's here for consistency if not run before
ALTER TABLE projects ADD COLUMN IF NOT EXISTS subtitle TEXT;
