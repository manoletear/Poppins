-- Idempotente: convierte worker_id/contract_id a uuid y agrega FKs.
-- Maneja el caso en que ya existen policies que dependen de worker_id.

DO $$
DECLARE
  worker_type text;
  contract_type text;
BEGIN
  SELECT data_type INTO worker_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payroll_results' AND column_name='worker_id';

  SELECT data_type INTO contract_type
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='payroll_results' AND column_name='contract_id';

  IF worker_type <> 'uuid' OR contract_type <> 'uuid' THEN
    -- Drop policies dependientes (se recrean al final)
    DROP POLICY IF EXISTS "worker_lee_payroll_results"  ON public.payroll_results;
    DROP POLICY IF EXISTS "worker_lee_payroll_concepts" ON public.payroll_concept_results;

    IF worker_type <> 'uuid' THEN
      ALTER TABLE public.payroll_results
        ALTER COLUMN worker_id TYPE uuid USING worker_id::uuid;
    END IF;

    IF contract_type <> 'uuid' THEN
      ALTER TABLE public.payroll_results
        ALTER COLUMN contract_id TYPE uuid USING contract_id::uuid;
    END IF;
  END IF;
END $$;

-- FKs (idempotentes)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_results_worker_id_fkey') THEN
    ALTER TABLE public.payroll_results
      ADD CONSTRAINT payroll_results_worker_id_fkey
      FOREIGN KEY (worker_id) REFERENCES public.trabajadores(id) ON DELETE RESTRICT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payroll_results_contract_id_fkey') THEN
    ALTER TABLE public.payroll_results
      ADD CONSTRAINT payroll_results_contract_id_fkey
      FOREIGN KEY (contract_id) REFERENCES public.contratos(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- Recrear policies (idempotentes)
DROP POLICY IF EXISTS "worker_lee_payroll_results"  ON public.payroll_results;
CREATE POLICY "worker_lee_payroll_results"
  ON public.payroll_results FOR SELECT
  USING (worker_id = public.get_my_trabajador_id());

DROP POLICY IF EXISTS "worker_lee_payroll_concepts" ON public.payroll_concept_results;
CREATE POLICY "worker_lee_payroll_concepts"
  ON public.payroll_concept_results FOR SELECT
  USING (
    payroll_result_id IN (
      SELECT id FROM public.payroll_results
      WHERE worker_id = public.get_my_trabajador_id()
    )
  );
