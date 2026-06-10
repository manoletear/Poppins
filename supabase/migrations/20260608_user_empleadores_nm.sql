-- Relación N:M user ↔ empleador (plan remuneraciones 2026, item #1)
--
-- Pasamos de 1:1 (user_profiles.empleador_id / empleadores.auth_user_id)
-- a N:M (un user puede administrar varios hogares; un hogar puede tener varios admins).
--
-- NO se crea ningún middleware tipo withTenant(). El control sigue siendo
-- RLS-based: get_my_empleador_id() ahora retorna el active_empleador_id de
-- la sesión, validándolo contra user_empleadores. Si el active no está
-- autorizado, get_my_empleador_id() retorna NULL → RLS bloquea acceso.

-- ─── Tabla junction N:M ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_empleadores (
  auth_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empleador_id  uuid        NOT NULL REFERENCES public.empleadores(id) ON DELETE CASCADE,
  rol           text        NOT NULL DEFAULT 'admin' CHECK (rol IN ('owner','admin','contador','viewer')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  created_by    uuid        REFERENCES auth.users(id),
  PRIMARY KEY (auth_user_id, empleador_id)
);

CREATE INDEX IF NOT EXISTS idx_user_empleadores_user
  ON public.user_empleadores (auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_empleadores_empleador
  ON public.user_empleadores (empleador_id);

-- ─── Active empleador en la sesión ──────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS active_empleador_id uuid REFERENCES public.empleadores(id);

-- ─── Backfill: poblar user_empleadores desde el modelo 1:1 actual ───────────
-- (a) desde user_profiles.empleador_id
INSERT INTO public.user_empleadores (auth_user_id, empleador_id, rol)
SELECT DISTINCT up.auth_user_id, up.empleador_id,
       CASE WHEN up.rol = 'admin' THEN 'admin' ELSE 'owner' END
  FROM public.user_profiles up
 WHERE up.empleador_id IS NOT NULL
   AND up.auth_user_id IS NOT NULL
ON CONFLICT (auth_user_id, empleador_id) DO NOTHING;

-- (b) desde empleadores.auth_user_id (owners directos)
INSERT INTO public.user_empleadores (auth_user_id, empleador_id, rol)
SELECT DISTINCT e.auth_user_id, e.id, 'owner'
  FROM public.empleadores e
 WHERE e.auth_user_id IS NOT NULL
ON CONFLICT (auth_user_id, empleador_id) DO NOTHING;

-- Setear active_empleador_id por defecto al primero del N:M para cada user
UPDATE public.user_profiles up
   SET active_empleador_id = COALESCE(up.active_empleador_id, up.empleador_id, (
     SELECT ue.empleador_id FROM public.user_empleadores ue
      WHERE ue.auth_user_id = up.auth_user_id
      ORDER BY ue.created_at ASC LIMIT 1
   ))
 WHERE up.active_empleador_id IS NULL;

-- ─── Funciones RLS reescritas ───────────────────────────────────────────────
-- get_my_empleador_id() ahora retorna el active si está autorizado, NULL si no.
-- Mantiene la firma → las 27+ policies existentes siguen funcionando idéntico.
CREATE OR REPLACE FUNCTION public.get_my_empleador_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH activo AS (
    SELECT active_empleador_id AS id FROM public.user_profiles
     WHERE auth_user_id = auth.uid() AND active_empleador_id IS NOT NULL
  ),
  legacy AS (
    -- Compatibilidad: si active no está set pero el user tiene un único empleador
    -- (vía user_empleadores), úsalo.
    SELECT empleador_id AS id FROM public.user_empleadores
     WHERE auth_user_id = auth.uid()
  )
  SELECT a.id FROM activo a
   WHERE EXISTS (
     SELECT 1 FROM public.user_empleadores ue
      WHERE ue.auth_user_id = auth.uid() AND ue.empleador_id = a.id
   )
  UNION ALL
  SELECT id FROM legacy WHERE (SELECT COUNT(*) FROM legacy) = 1
   AND NOT EXISTS (SELECT 1 FROM activo)
  LIMIT 1;
$$;

-- Función nueva: lista de empleadores accesibles para el user actual
CREATE OR REPLACE FUNCTION public.get_my_empleadores()
RETURNS TABLE (empleador_id uuid, rol text, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT ue.empleador_id, ue.rol,
         (ue.empleador_id = (SELECT active_empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid())) AS is_active
    FROM public.user_empleadores ue
   WHERE ue.auth_user_id = auth.uid()
   ORDER BY ue.created_at ASC;
$$;

-- ─── RLS sobre user_empleadores ─────────────────────────────────────────────
ALTER TABLE public.user_empleadores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_lee_sus_empleadores"
  ON public.user_empleadores FOR SELECT
  USING (auth_user_id = auth.uid());

-- Solo owners pueden agregar nuevos admins/contadores
CREATE POLICY "owner_invita_admins"
  ON public.user_empleadores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_empleadores ue
       WHERE ue.auth_user_id = auth.uid()
         AND ue.empleador_id = user_empleadores.empleador_id
         AND ue.rol = 'owner'
    )
  );

CREATE POLICY "owner_remueve_admins"
  ON public.user_empleadores FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_empleadores ue
       WHERE ue.auth_user_id = auth.uid()
         AND ue.empleador_id = user_empleadores.empleador_id
         AND ue.rol = 'owner'
    )
    AND user_empleadores.auth_user_id != auth.uid() -- no auto-remoción
  );
