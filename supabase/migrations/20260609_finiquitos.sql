-- Finiquitos: terminación de contratos con causal y cálculo legal.
-- Plan remuneraciones 2026, item adicional Prioridad 1 (audit CTO).

-- ─── Columnas en contratos para causal de término ──────────────────────────
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS causal_termino   text,        -- '159-1', '160-3', '161-1', etc.
  ADD COLUMN IF NOT EXISTS terminado_at     timestamptz,
  ADD COLUMN IF NOT EXISTS terminado_por    uuid REFERENCES auth.users(id);

-- ─── Tabla finiquitos (resultado del cálculo + PDF) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.finiquitos (
  id                              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id                    uuid        NOT NULL REFERENCES public.empleadores(id),
  trabajador_id                   uuid        NOT NULL REFERENCES public.trabajadores(id),
  contrato_id                     uuid        REFERENCES public.contratos(id),

  fecha_termino                   date        NOT NULL,
  causal                          text        NOT NULL,        -- Art. 159-1..6, 160-1..7, 161-1, 161-2
  aviso_previo_dado               boolean     NOT NULL DEFAULT false,

  -- Inputs usados
  sueldo_base                     integer     NOT NULL,
  ultima_remuneracion             integer     NOT NULL,
  dias_vacaciones_pendientes      numeric(6,2) NOT NULL DEFAULT 0,
  dias_vacaciones_proporcionales  numeric(6,2) NOT NULL DEFAULT 0,
  imm_periodo                     integer     NOT NULL,

  -- Conceptos calculados
  remuneracion_dias_trabajados    integer     NOT NULL DEFAULT 0,
  dias_trabajados_mes             integer     NOT NULL DEFAULT 0,
  vacaciones_pendientes_monto     integer     NOT NULL DEFAULT 0,
  vacaciones_proporcionales_monto integer     NOT NULL DEFAULT 0,
  gratificacion_proporcional      integer     NOT NULL DEFAULT 0,
  meses_trabajados_ano            integer     NOT NULL DEFAULT 0,
  indemnizacion_aviso_previo      integer     NOT NULL DEFAULT 0,
  indemnizacion_anos_servicio     integer     NOT NULL DEFAULT 0,
  meses_indemnizacion             integer     NOT NULL DEFAULT 0,
  tope_11_anos_aplicado           boolean     NOT NULL DEFAULT false,
  anos_servicio                   integer     NOT NULL DEFAULT 0,
  total_finiquito                 integer     NOT NULL DEFAULT 0,

  -- Metadata
  observaciones                   text,
  voided                          boolean     NOT NULL DEFAULT false,
  voided_reason                   text,
  created_by                      uuid        REFERENCES auth.users(id),
  created_at                      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_finiquitos_empleador
  ON public.finiquitos (empleador_id, fecha_termino DESC);
CREATE INDEX IF NOT EXISTS idx_finiquitos_trabajador
  ON public.finiquitos (trabajador_id);

-- Un solo finiquito activo por contrato
CREATE UNIQUE INDEX IF NOT EXISTS uq_finiquito_activo_por_contrato
  ON public.finiquitos (contrato_id)
  WHERE voided = false;

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.finiquitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleador_lee_finiquitos"
  ON public.finiquitos FOR SELECT
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_empleadores WHERE auth_user_id = auth.uid()
      UNION
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "empleador_inserta_finiquitos"
  ON public.finiquitos FOR INSERT
  WITH CHECK (
    empleador_id IN (
      SELECT empleador_id FROM public.user_empleadores WHERE auth_user_id = auth.uid()
      UNION
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "empleador_anula_finiquitos"
  ON public.finiquitos FOR UPDATE
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_empleadores WHERE auth_user_id = auth.uid()
      UNION
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (voided = true);
