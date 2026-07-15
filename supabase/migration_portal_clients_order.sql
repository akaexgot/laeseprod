-- Add manual ordering support for portal clients.
ALTER TABLE public.portal_clients
ADD COLUMN IF NOT EXISTS "order" integer DEFAULT 0;

WITH ordered_clients AS (
  SELECT
    id,
    row_number() OVER (ORDER BY created_at ASC, id ASC) - 1 AS position
  FROM public.portal_clients
)
UPDATE public.portal_clients AS client
SET "order" = ordered_clients.position
FROM ordered_clients
WHERE client.id = ordered_clients.id
  AND (client."order" IS NULL OR client."order" = 0);

ALTER TABLE public.portal_clients
ALTER COLUMN "order" SET DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_portal_clients_order
ON public.portal_clients ("order", created_at, id);
