CREATE TABLE IF NOT EXISTS public.manual_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number integer NOT NULL UNIQUE,
  invoice_url text NOT NULL,
  client_name text NOT NULL,
  client_cif text,
  client_address text,
  client_email text,
  concept text NOT NULL,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  payment_method text NOT NULL DEFAULT 'Transferencia bancaria',
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_invoices_number ON public.manual_invoices(invoice_number DESC);
CREATE INDEX IF NOT EXISTS idx_manual_invoices_issue_date ON public.manual_invoices(issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_manual_invoices_client ON public.manual_invoices(client_name);

DROP TRIGGER IF EXISTS manual_invoices_updated_at ON public.manual_invoices;
CREATE TRIGGER manual_invoices_updated_at
BEFORE UPDATE ON public.manual_invoices
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.manual_invoices ENABLE ROW LEVEL SECURITY;
