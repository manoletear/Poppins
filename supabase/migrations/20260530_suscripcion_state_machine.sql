-- Fase 1 — Máquina de estados de suscripción.
-- Extiende `suscripciones` para soportar: trial 30d, camino A/B, ciclo mensual/anual,
-- cobro cada 30 días, mes-gratis-anual (camino A) e IDs de Flow (Fase 2).
-- La lógica de fechas vive en src/lib/pagos/suscripcion-engine.ts (testeada).

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

-- Migrar el vocabulario de plan legacy (poppins/premium/enterprise) → plan_tipo
UPDATE suscripciones SET plan_tipo = 'pro'      WHERE plan IN ('poppins', 'premium') AND plan_tipo IS NULL;
UPDATE suscripciones SET plan_tipo = 'pro_plus' WHERE plan = 'enterprise' AND plan_tipo IS NULL;
UPDATE suscripciones SET plan_tipo = COALESCE(plan_tipo, 'starter');
ALTER TABLE suscripciones ALTER COLUMN plan_tipo SET DEFAULT 'starter';

-- Estados: ampliar el CHECK (mantiene los legacy para no romper filas existentes)
ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_estado_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_estado_check
  CHECK (estado IN ('trial', 'activa', 'past_due', 'pausada', 'suspendida', 'cancelada', 'vencida'));

-- CHECKs del modelo nuevo
ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_plan_tipo_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_plan_tipo_check
  CHECK (plan_tipo IN ('starter', 'pro', 'pro_plus'));

ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_ciclo_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_ciclo_check
  CHECK (ciclo IN ('mensual', 'anual'));

ALTER TABLE suscripciones DROP CONSTRAINT IF EXISTS suscripciones_camino_check;
ALTER TABLE suscripciones ADD CONSTRAINT suscripciones_camino_check
  CHECK (camino IS NULL OR camino IN ('A_inmediato', 'B_post_trial'));

-- Trial por defecto a 30 días (antes 14)
ALTER TABLE suscripciones ALTER COLUMN trial_hasta SET DEFAULT (CURRENT_DATE + 30);

CREATE INDEX IF NOT EXISTS idx_suscripciones_proximo_cobro
  ON suscripciones (fecha_proximo_cobro)
  WHERE estado IN ('activa', 'past_due');
