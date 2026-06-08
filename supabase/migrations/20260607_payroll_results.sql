-- Resultados del motor de remuneraciones Poppins (payroll-cl §16).
--
-- payroll_results      → una fila por trabajador × período × contrato
-- payroll_concept_results → detalle de conceptos (haberes, descuentos, aportes)
--
-- mode='preview' no persiste; solo mode='final' escribe aquí.
-- Una vez creado un resultado FINAL, no se modifica: se anula (voided=true) y
-- se crea uno nuevo. Esto preserva trazabilidad de correcciones.

-- ─── Tabla principal ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payroll_results (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period          text        NOT NULL,           -- 'YYYY-MM'
  contract_id             text        NOT NULL,
  worker_id               text        NOT NULL,
  empleador_id            uuid        NOT NULL REFERENCES public.empleadores(id),
  indicator_snapshot_id   text        NOT NULL,

  -- Bases de cálculo
  gross_income            integer     NOT NULL,
  taxable_income          integer     NOT NULL,
  pension_base            integer     NOT NULL,
  health_base             integer     NOT NULL,
  afc_base                integer     NOT NULL,
  mutual_base             integer     NOT NULL,
  income_tax_base         integer     NOT NULL,

  -- Descuentos trabajador
  deduction_afp10         integer     NOT NULL DEFAULT 0,
  deduction_afp_commission integer    NOT NULL DEFAULT 0,
  deduction_health7       integer     NOT NULL DEFAULT 0,
  deduction_income_tax    integer     NOT NULL DEFAULT 0,
  deduction_advances      integer     NOT NULL DEFAULT 0,
  deduction_other         integer     NOT NULL DEFAULT 0,

  -- Aportes empleador
  contribution_sis        integer     NOT NULL DEFAULT 0,
  contribution_afc_employer integer   NOT NULL DEFAULT 0,
  contribution_cai111     integer     NOT NULL DEFAULT 0,
  contribution_mutual     integer     NOT NULL DEFAULT 0,

  -- Resultado
  net_pay                 integer     NOT NULL,
  total_employer_cost     integer     NOT NULL,

  -- Metadata
  warnings                text[]      NOT NULL DEFAULT '{}',
  calculation_trace       jsonb       NOT NULL DEFAULT '[]',
  voided                  boolean     NOT NULL DEFAULT false,
  voided_reason           text,
  created_by              uuid        REFERENCES auth.users(id),
  created_at              timestamptz NOT NULL DEFAULT now(),

  -- Un solo resultado FINAL activo por contrato × período
  CONSTRAINT uq_payroll_result_active
    EXCLUDE USING btree (contract_id WITH =, payroll_period WITH =)
    WHERE (voided = false)
);

CREATE INDEX IF NOT EXISTS idx_payroll_results_worker
  ON public.payroll_results (worker_id, payroll_period);

CREATE INDEX IF NOT EXISTS idx_payroll_results_empleador
  ON public.payroll_results (empleador_id, payroll_period);

-- ─── Conceptos ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.payroll_concept_results (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_result_id   uuid        NOT NULL REFERENCES public.payroll_results(id) ON DELETE CASCADE,
  concept_code        text        NOT NULL,
  concept_name        text        NOT NULL,
  concept_type        text        NOT NULL CHECK (concept_type IN ('HABER','DESCUENTO','APORTE_EMPLEADOR')),
  amount              integer     NOT NULL,
  base_amount         integer,
  rate                numeric(10,6),
  taxable             boolean     NOT NULL DEFAULT true,
  imponible           boolean     NOT NULL DEFAULT true,
  legal               boolean     NOT NULL DEFAULT true,
  visible_in_payslip  boolean     NOT NULL DEFAULT true,
  calculation_order   integer     NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_payroll_concept_results_result
  ON public.payroll_concept_results (payroll_result_id);

-- ─── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE public.payroll_results         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_concept_results ENABLE ROW LEVEL SECURITY;

-- Empleador ve solo sus resultados
CREATE POLICY "empleador_lee_payroll_results"
  ON public.payroll_results FOR SELECT
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

-- Conceptos: acceso derivado del resultado padre
CREATE POLICY "empleador_lee_payroll_concepts"
  ON public.payroll_concept_results FOR SELECT
  USING (
    payroll_result_id IN (
      SELECT id FROM public.payroll_results
      WHERE empleador_id IN (
        SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
        UNION
        SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Escritura solo desde service role (la route usa createClient con auth de usuario
-- pero inserta vía el cliente autenticado — la policy de INSERT permite al owner).
CREATE POLICY "owner_inserta_payroll_results"
  ON public.payroll_results FOR INSERT
  WITH CHECK (
    empleador_id IN (
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "owner_inserta_payroll_concepts"
  ON public.payroll_concept_results FOR INSERT
  WITH CHECK (
    payroll_result_id IN (
      SELECT id FROM public.payroll_results
      WHERE empleador_id IN (
        SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
        UNION
        SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
      )
    )
  );

-- Anular (voided=true): solo el owner puede marcar como anulado
CREATE POLICY "owner_anula_payroll_results"
  ON public.payroll_results FOR UPDATE
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (voided = true); -- solo permite pasar a voided, no editar montos
