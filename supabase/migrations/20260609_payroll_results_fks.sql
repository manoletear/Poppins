-- Agrega foreign keys a payroll_results para habilitar embeds de PostgREST.
--
-- payroll_results.worker_id    text → uuid + FK → trabajadores(id)
-- payroll_results.contract_id  text → uuid + FK → contratos(id)
--
-- Sin estas FKs, las queries con embed (.select('..., trabajadores(...)'))
-- fallan con PGRST200 porque PostgREST no detecta la relación.

-- 1) Convertir columnas a uuid (asumen que ya contienen UUIDs válidos).
ALTER TABLE public.payroll_results
  ALTER COLUMN worker_id   TYPE uuid USING worker_id::uuid,
  ALTER COLUMN contract_id TYPE uuid USING contract_id::uuid;

-- 2) Agregar FK constraints (idempotente vía DO block).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_results_worker_id_fkey'
  ) THEN
    ALTER TABLE public.payroll_results
      ADD CONSTRAINT payroll_results_worker_id_fkey
      FOREIGN KEY (worker_id) REFERENCES public.trabajadores(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payroll_results_contract_id_fkey'
  ) THEN
    ALTER TABLE public.payroll_results
      ADD CONSTRAINT payroll_results_contract_id_fkey
      FOREIGN KEY (contract_id) REFERENCES public.contratos(id) ON DELETE RESTRICT;
  END IF;
END $$;
