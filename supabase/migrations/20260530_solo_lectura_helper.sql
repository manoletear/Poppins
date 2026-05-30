-- Fase 3 — Enforcement de solo-lectura (trial vencido sin suscripción).
--
-- Helper SQL reutilizable en políticas RLS. Aditivo y seguro: no cambia
-- comportamiento por sí solo (sólo expone la función). La UI ya entra en modo
-- solo-lectura vía GET /api/suscripcion/estado; este helper es la defensa en
-- profundidad a nivel DB para los writes directos del cliente Supabase.

CREATE OR REPLACE FUNCTION public.empleador_solo_lectura(p_empleador_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    -- Con suscripción al día / en gracia / en trial → puede escribir
    WHEN EXISTS (
      SELECT 1 FROM suscripciones s
      WHERE s.empleador_id = p_empleador_id
        AND s.estado IN ('activa', 'past_due', 'trial')
    ) THEN false
    -- Suscripción pausada/cancelada → solo lectura
    WHEN EXISTS (
      SELECT 1 FROM suscripciones s
      WHERE s.empleador_id = p_empleador_id
        AND s.estado IN ('pausada', 'cancelada', 'suspendida', 'vencida')
    ) THEN true
    -- Sin suscripción: solo-lectura si el trial de 30 días ya venció
    ELSE COALESCE(
      (SELECT (e.created_at + INTERVAL '30 days') < now()
       FROM empleadores e WHERE e.id = p_empleador_id),
      false
    )
  END;
$$;

-- ── Patrón de policy RLS (NO aplicado: revisar choques con policies existentes) ──
-- Para cada tabla de escritura del empleador, agregar policies RESTRICTIVE que
-- permitan SELECT pero bloqueen INSERT/UPDATE/DELETE cuando esté en solo-lectura.
-- Ejemplo para `tareas` (descomentar y replicar por tabla tras validar):
--
--   CREATE POLICY ro_block_insert ON tareas AS RESTRICTIVE FOR INSERT
--     WITH CHECK (NOT public.empleador_solo_lectura(empleador_id));
--   CREATE POLICY ro_block_update ON tareas AS RESTRICTIVE FOR UPDATE
--     USING (NOT public.empleador_solo_lectura(empleador_id));
--   CREATE POLICY ro_block_delete ON tareas AS RESTRICTIVE FOR DELETE
--     USING (NOT public.empleador_solo_lectura(empleador_id));
