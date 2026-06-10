-- Audit log por empleador (plan remuneraciones 2026, item #4)
--
-- Registra acciones sensibles que afectan datos del empleador:
-- - Cierre/reapertura de períodos
-- - Cambios en novedades (alta/baja)
-- - Descargas de archivos legales (LRE, Previred, CCAF)
-- - Switch de empleador activo (multi-tenancy)
-- - Anulaciones de payroll_results

CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        REFERENCES auth.users(id),
  empleador_id  uuid        REFERENCES public.empleadores(id),
  action        text        NOT NULL,        -- 'payroll.close', 'payroll.reopen', 'novedades.create', etc.
  entity        text,                        -- 'payroll_results', 'payroll_novedades', etc.
  entity_id     text,                        -- ID del recurso afectado (uuid/period/etc)
  payload       jsonb       NOT NULL DEFAULT '{}',
  ip            inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_empleador
  ON public.audit_log (empleador_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_user
  ON public.audit_log (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON public.audit_log (action, created_at DESC);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Lectura: solo los miembros del empleador (N:M) pueden ver el log de ese empleador
CREATE POLICY "empleador_lee_audit_log"
  ON public.audit_log FOR SELECT
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_empleadores WHERE auth_user_id = auth.uid()
      UNION
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

-- Escritura: solo service_role / endpoints autenticados (no expone INSERT directo)
-- Las rutas API insertan vía createClient con el user logueado; permitimos INSERT
-- si el user es miembro del empleador o es service_role.
CREATE POLICY "empleador_inserta_audit_log"
  ON public.audit_log FOR INSERT
  WITH CHECK (
    empleador_id IS NULL  -- permite logs sin empleador (ej. login fallido)
    OR empleador_id IN (
      SELECT empleador_id FROM public.user_empleadores WHERE auth_user_id = auth.uid()
      UNION
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

-- NO se permite UPDATE ni DELETE: el log es inmutable.
