-- =====================================================
-- CONTRACTS SYSTEM MIGRATION
-- =====================================================

-- 1. Contract Templates
CREATE TABLE IF NOT EXISTS contract_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- The main text with {{placeholders}}
  admin_fields TEXT[],   -- Array of field names the admin should fill
  client_fields TEXT[],  -- Array of field names the client should fill
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Contracts (Instances)
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES contract_templates(id),
  status TEXT DEFAULT 'pending_client', -- pending_client, pending_payment, paid, completed
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  amount_to_pay NUMERIC(10, 2) NOT NULL DEFAULT 0, -- The Stripe checkout amount
  admin_data JSONB DEFAULT '{}',
  client_data JSONB DEFAULT '{}',
  signature_svg TEXT, -- Base64 or SVG data of the signature
  payment_id TEXT, -- Stripe Session ID
  pdf_url TEXT, -- Link to the generated PDF in Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Public read for single contract (so clients can fill their data)
DROP POLICY IF EXISTS "Public read single contract" ON contracts;
CREATE POLICY "Public read single contract" ON contracts 
  FOR SELECT USING (status != 'completed' OR auth.role() = 'authenticated');

-- Public update for client data (Allows signing and transition to payment)
DROP POLICY IF EXISTS "Public update contract data" ON contracts;
CREATE POLICY "Public update contract data" ON contracts 
  FOR UPDATE USING (status = 'pending_client')
  WITH CHECK (status IN ('pending_client', 'pending_payment'));

-- Admin full access
DROP POLICY IF EXISTS "Admin full access contract_templates" ON contract_templates;
CREATE POLICY "Admin full access contract_templates" ON contract_templates
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admin full access contracts" ON contracts;
CREATE POLICY "Admin full access contracts" ON contracts
  FOR ALL USING (auth.role() = 'authenticated');

-- Triggers for updated_at
DROP TRIGGER IF EXISTS contract_templates_updated_at ON contract_templates;
CREATE TRIGGER contract_templates_updated_at BEFORE UPDATE ON contract_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS contracts_updated_at ON contracts;
CREATE TRIGGER contracts_updated_at BEFORE UPDATE ON contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed a default template
INSERT INTO contract_templates (title, content, admin_fields, client_fields)
VALUES (
  'Contrato de Producción Audiovisual',
  '<p>Este contrato establece que <strong>VideoMarketing Sevilla</strong> proveerá el servicio de <strong>{{SERVICIO}}</strong> a favor de <strong>{{CLIENTE_NOMBRE_FISCAL}}</strong>.</p><p>El precio total acordado es de <strong>{{PRECIO_TOTAL}}€</strong>. El pago inicial requerido para comenzar es de <strong>{{PAGO_INICIAL}}€</strong>.</p><p>Los datos del cliente son:</p><ul><li>NIF/CIF: {{CLIENTE_CIF}}</li><li>Dirección: {{CLIENTE_DIRECCION}}</li></ul>',
  ARRAY['SERVICIO', 'PRECIO_TOTAL', 'PAGO_INICIAL'],
  ARRAY['CLIENTE_NOMBRE_FISCAL', 'CLIENTE_CIF', 'CLIENTE_DIRECCION']
);
