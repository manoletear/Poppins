-- Fase 0 — Unificación del catálogo de planes a: starter / pro / pro_plus
-- Reemplaza el vocabulario divergente previo (casa/hogar/free/premium/enterprise).
-- Modelo: starter = trial 30d sin cobro · pro = 1 trabajador ($14.990) ·
--         pro_plus = trabajadores ilimitados ($19.990). Sin comisión.
-- La máquina de estados de suscripción (trial/camino/ciclo) llega en Fase 1.

-- 1. Migrar valores existentes en empleadores.plan_tipo
UPDATE empleadores SET plan_tipo = 'pro'      WHERE plan_tipo IN ('casa', 'premium');
UPDATE empleadores SET plan_tipo = 'pro_plus' WHERE plan_tipo IN ('hogar', 'enterprise');
UPDATE empleadores SET plan_tipo = 'starter'  WHERE plan_tipo = 'free' OR plan_tipo IS NULL;

-- 2. Default + CHECK con el vocabulario nuevo
ALTER TABLE empleadores ALTER COLUMN plan_tipo SET DEFAULT 'starter';
ALTER TABLE empleadores DROP CONSTRAINT IF EXISTS empleadores_plan_tipo_check;
ALTER TABLE empleadores
  ADD CONSTRAINT empleadores_plan_tipo_check
  CHECK (plan_tipo IN ('starter', 'pro', 'pro_plus'));
