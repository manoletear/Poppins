-- Caché de liquidaciones de Buk (#4: persistir liquidaciones en Supabase).
--
-- Buk no tiene endpoint de histórico barato: /accounting se barre mes a mes en vivo.
-- Esta tabla espeja la salida de getPayrollItems (incluye `items` crudos dentro de
-- `data` para que el PDF conserve el detalle de líneas). Da resiliencia (si Buk cae,
-- la ficha sigue mostrando liquidaciones) y velocidad (evita re-barrer /accounting).
--
-- Acceso: SOLO service role (RLS habilitado sin políticas → authenticated/anon no
-- pueden leer/escribir directo). El servidor la usa vía createServiceClient.

CREATE TABLE IF NOT EXISTS public.buk_payroll_cache (
  employee_id integer    NOT NULL,           -- id de empleado en Buk
  periodo     text       NOT NULL,           -- 'YYYY-MM'
  data        jsonb      NOT NULL,           -- liquidación mapeada (incluye items[])
  synced_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (employee_id, periodo)
);

CREATE INDEX IF NOT EXISTS idx_buk_payroll_cache_employee
  ON public.buk_payroll_cache (employee_id);

ALTER TABLE public.buk_payroll_cache ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo el service role (que bypassa RLS) accede.
