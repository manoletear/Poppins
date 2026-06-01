-- ════════════════════════════════════════════════════════════════════════
-- APLICAR EN: Supabase del FRONT (sczxyejqooqthxcxksah) → SQL Editor → Run
-- Pegar TODO y ejecutar una sola vez. Idempotente (re-ejecutable sin romper).
-- Orden obligatorio: 1 unificación → 2 state machine → 3 helper → 4 policies RLS.
-- ════════════════════════════════════════════════════════════════════════

-- ── 0/4 · PRERREQUISITOS: tablas base que los ALTER de abajo necesitan ──
--    (de 20260325_pagos_redesign y 20260408_onboarding_lifecycle).
--    sczxy tenía `empleadores` pero no `tarjetas_cliente` ni `suscripciones`.
CREATE TABLE IF NOT EXISTS tarjetas_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  bin VARCHAR(8) NOT NULL,
  ultimos_4 VARCHAR(4) NOT NULL,
  banco VARCHAR(100) NOT NULL,
  tipo_tarjeta VARCHAR(20) NOT NULL DEFAULT 'visa',
  categoria VARCHAR(30) NOT NULL DEFAULT 'classic',
  programa_puntos VARCHAR(100) NOT NULL,
  tasa_puntos NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  activa BOOLEAN NOT NULL DEFAULT true,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tarjetas_empleador ON tarjetas_cliente(empleador_id);

CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'poppins' CHECK (plan IN ('poppins','premium','enterprise')),
  estado TEXT NOT NULL DEFAULT 'trial'
    CHECK (estado IN ('trial','activa','suspendida','cancelada','vencida')),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE,
  trial_hasta DATE DEFAULT CURRENT_DATE + 14,
  monto_mensual INT NOT NULL DEFAULT 24770,
  moneda TEXT DEFAULT 'CLP',
  dia_cobro INT DEFAULT 1 CHECK (dia_cobro BETWEEN 1 AND 28),
  num_trabajadores INT DEFAULT 1,
  cancelada_at TIMESTAMPTZ,
  motivo_cancelacion TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_suscripciones_empleador ON suscripciones(empleador_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suscripciones_activa ON suscripciones(empleador_id)
  WHERE estado IN ('trial','activa');

-- ── 1/4 · 20260530_planes_pro_unificacion ──────────────────────────────
UPDATE empleadores SET plan_tipo = 'pro'      WHERE plan_tipo IN ('casa', 'premium');
UPDATE empleadores SET plan_tipo = 'pro_plus' WHERE plan_tipo IN ('hogar', 'enterprise');
UPDATE empleadores SET plan_tipo = 'starter'  WHERE plan_tipo = 'free' OR plan_tipo IS NULL;
ALTER TABLE empleadores ALTER COLUMN plan_tipo SET DEFAULT 'starter';
ALTER TABLE empleadores DROP CONSTRAINT IF EXISTS empleadores_plan_tipo_check;
ALTER TABLE empleadores
  ADD CONSTRAINT empleadores_plan_tipo_check
  CHECK (plan_tipo IN ('starter', 'pro', 'pro_plus'));

-- ── 2/4 · 20260530_suscripcion_state_machine ───────────────────────────
ALTER TABLE suscripciones
  ADD COLUMN IF NOT EXISTS plan_tipo            TEXT,
  ADD COLUMN IF NOT EXISTS ciclo                TEXT NOT NULL DEFAULT 'mensual',
  ADD COLUMN IF NOT EXISTS camino               TEXT,
  ADD COLUMN IF NOT EXISTS trial_inicio         DATE,
  ADD COLUMN IF NOT EXISTS trial_fin            DATE,
  ADD COLUMN IF NOT EXISTS fecha_primer_cobro   DATE,
  ADD COLUMN IF NOT EXISTS fecha_proximo_cobro  DATE,
  ADD COLUMN IF NOT EXISTS cobros_realizados    INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tarjeta_id           UUID REFERENCES tarjetas_cliente(id),
  ADD COLUMN IF NOT EXISTS flow_customer_id     TEXT,
  ADD COLUMN IF NOT EXISTS flow_subscription_id TEXT;

UPDATE suscripciones SET plan_tipo = 'pro'      WHERE plan IN ('poppins', 'premium') AND plan_tipo IS NULL;
UPDATE suscripciones SET plan_tipo = 'pro_plus' WHERE plan = 'enterprise' AND plan_tipo IS NULL;
UPDATE suscripciones SET plan_tipo = COALESCE(plan_tipo, 'starter');
ALTER TABLE suscripciones ALTER COLUMN plan_tipo SET DEFAULT 'starter';

ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_estado_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_estado_check
  CHECK (estado IN ('trial', 'activa', 'past_due', 'pausada', 'suspendida', 'cancelada', 'vencida'));

ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_plan_tipo_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_plan_tipo_check
  CHECK (plan_tipo IN ('starter', 'pro', 'pro_plus'));

ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_ciclo_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_ciclo_check
  CHECK (ciclo IN ('mensual', 'anual'));

ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_camino_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_camino_check
  CHECK (camino IS NULL OR camino IN ('A_inmediato', 'B_post_trial'));

ALTER TABLE suscripciones ALTER COLUMN trial_hasta SET DEFAULT (CURRENT_DATE + 30);

CREATE INDEX IF NOT EXISTS idx_suscripciones_proximo_cobro
  ON suscripciones (fecha_proximo_cobro)
  WHERE estado IN ('activa', 'past_due');

-- ── 3/4 · 20260530_solo_lectura_helper ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.empleador_solo_lectura(p_empleador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM suscripciones s
      WHERE s.empleador_id = p_empleador_id
        AND s.estado IN ('activa', 'past_due', 'trial')
    ) THEN false
    WHEN EXISTS (
      SELECT 1 FROM suscripciones s
      WHERE s.empleador_id = p_empleador_id
        AND s.estado IN ('pausada', 'cancelada', 'suspendida', 'vencida')
    ) THEN true
    ELSE COALESCE(
      (SELECT (e.created_at + INTERVAL '30 days') < now()
       FROM empleadores e WHERE e.id = p_empleador_id),
      false
    )
  END;
$$;

-- ── 4/4 · 20260531_rls_solo_lectura_policies ───────────────────────────
DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'contratos','pagos_empleador','solicitudes_empleado','trabajadores',
    'marcajes_horario','cuentas_pago','tareas','tareas_recurrentes',
    'mascotas_empleador','familiares_empleador','items_lista_compras',
    'listas_compras','recordatorios','anticipos','viviendas_empleador',
    'preferencias_trabajo','dias_libre_disposicion','beneficios_empleador',
    'comprobantes_pago'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'empleador_id'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS ro_block_insert ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS ro_block_update ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS ro_block_delete ON public.%I', t);
      EXECUTE format('CREATE POLICY ro_block_insert ON public.%I AS RESTRICTIVE FOR INSERT WITH CHECK (NOT public.empleador_solo_lectura(empleador_id))', t);
      EXECUTE format('CREATE POLICY ro_block_update ON public.%I AS RESTRICTIVE FOR UPDATE USING (NOT public.empleador_solo_lectura(empleador_id))', t);
      EXECUTE format('CREATE POLICY ro_block_delete ON public.%I AS RESTRICTIVE FOR DELETE USING (NOT public.empleador_solo_lectura(empleador_id))', t);
      RAISE NOTICE 'RLS solo-lectura aplicada a %', t;
    ELSE
      RAISE NOTICE 'Saltada % (no existe o sin empleador_id)', t;
    END IF;
  END LOOP;
END $$;
