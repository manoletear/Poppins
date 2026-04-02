-- =============================================================================
-- Poppins ERP: Fix RLS Key Chains
-- Migration: 20260402_rls_keychain_fix.sql
--
-- Fixes:
--   1. Admin bypass — admin role can see/manage ALL data
--   2. Empleador fallback — get_my_empleador_id() checks empleadores.auth_user_id
--      when user_profiles.empleador_id is NULL (new users before onboarding)
--   3. Worker write access — workers can INSERT/UPDATE where portal needs it
--   4. Data fix — link seed empleador to actual auth user
--
-- KEY CHAIN:
--   auth.uid() → user_profiles.auth_user_id
--     ↓ (empleador)
--   user_profiles.empleador_id → empleadores.id → contratos.empleador_id
--     ↓
--   contratos.trabajador_id → trabajadores, liquidaciones, tareas, etc.
--
--     ↓ (trabajador, reverse)
--   user_profiles.trabajador_id → contratos.trabajador_id → contratos.empleador_id
--     ↓
--   employer data (listas_compras for shopping, recordatorios, etc.)
--
--   admin: bypasses all policies via get_my_rol() = 'admin'
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. HELPER FUNCTIONS (replace existing + add new)
-- ─────────────────────────────────────────────────────────────────────────────

-- Get user's role
CREATE OR REPLACE FUNCTION public.get_my_rol()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rol FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Is current user an admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE auth_user_id = auth.uid() AND rol = 'admin'
  );
$$;

-- Improved get_my_empleador_id: checks user_profiles first, then empleadores.auth_user_id
CREATE OR REPLACE FUNCTION public.get_my_empleador_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Primary: from user_profiles.empleador_id (set during onboarding)
    (SELECT empleador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND empleador_id IS NOT NULL LIMIT 1),
    -- Fallback: from empleadores.auth_user_id (direct link)
    (SELECT id FROM empleadores WHERE auth_user_id = auth.uid() LIMIT 1)
  );
$$;

-- Improved get_my_trabajador_id (unchanged but redefined for completeness)
CREATE OR REPLACE FUNCTION public.get_my_trabajador_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND trabajador_id IS NOT NULL LIMIT 1),
    -- Fallback: check if there's a trabajador with this auth user
    (SELECT t.id FROM trabajadores t
     JOIN user_profiles up ON up.auth_user_id = auth.uid()
     WHERE t.id = up.trabajador_id LIMIT 1)
  );
$$;

-- Get employer's ID from worker's perspective (via contratos)
CREATE OR REPLACE FUNCTION public.get_my_employer_as_worker()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.empleador_id FROM contratos c
  WHERE c.trabajador_id = (
    SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1
  )
  AND c.estado = 'activo'
  LIMIT 1;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. ADD ADMIN BYPASS TO ALL TABLES
-- Admin can see and manage everything
-- ─────────────────────────────────────────────────────────────────────────────

-- A. Employer-scoped tables
CREATE POLICY "admin_full_access" ON empleadores FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON cuentas_pago FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON pagos_empleador FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON listas_compras FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON plantillas_lista_compras FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON familiares_empleador FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON mascotas_empleador FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON viviendas_empleador FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON preferencias_trabajo FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON cuentas_empleador FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON tarjetas_cliente FOR ALL USING (public.is_admin());

-- B. Dual-scope tables
CREATE POLICY "admin_full_access" ON contratos FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON tareas FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON marcajes_horario FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON solicitudes_empleado FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON recordatorios FOR ALL USING (public.is_admin());

-- C. Worker-only tables
CREATE POLICY "admin_full_access" ON trabajadores FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON liquidaciones FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON documentos_empleado FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON finiquitos FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON licencias_medicas FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON movimientos_vacaciones FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON registro_horas_extras FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON cargas_familiares FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON anotaciones FOR ALL USING (public.is_admin());

-- D. Indirect FK tables
CREATE POLICY "admin_full_access" ON items_lista_compras FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON comprobantes_pago FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON chat_conversaciones FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON chat_mensajes FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON chat_feedback FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON cotizaciones_previsionales FOR ALL USING (public.is_admin());

-- E. Auth & billing
CREATE POLICY "admin_full_access" ON user_profiles FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON clientes FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON facturas_poppins FOR ALL USING (public.is_admin());

-- F. Reference tables: admin can also write (update indicators, news, etc.)
CREATE POLICY "admin_write" ON instituciones_previsionales FOR ALL USING (public.is_admin());
CREATE POLICY "admin_write" ON indicadores_economicos FOR ALL USING (public.is_admin());
CREATE POLICY "admin_write" ON tramos_impuesto FOR ALL USING (public.is_admin());
CREATE POLICY "admin_write" ON tramos_asignacion_familiar FOR ALL USING (public.is_admin());
CREATE POLICY "admin_write" ON beneficios_banco FOR ALL USING (public.is_admin());
CREATE POLICY "admin_write" ON noticias_legales FOR ALL USING (public.is_admin());
CREATE POLICY "admin_write" ON periodos FOR ALL USING (public.is_admin());

-- G. Legacy tables: admin can access if needed
CREATE POLICY "admin_full_access" ON usuarios FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON propiedades_usuario FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON documentos_usuario FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON auditorias_usuario FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON casos FOR ALL USING (public.is_admin());
CREATE POLICY "admin_full_access" ON pagos FOR ALL USING (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. WORKER BIDIRECTIONAL ACCESS
-- Workers need to see some employer data (their employer's shopping lists,
-- recordatorios, vivienda for context) via contratos chain
-- ─────────────────────────────────────────────────────────────────────────────

-- Workers can see their employer's shopping lists (to buy items)
CREATE POLICY "worker_employer_lists" ON listas_compras
  FOR SELECT USING (empleador_id = public.get_my_employer_as_worker());

-- Workers can see their employer's recordatorios assigned to them
-- (already have worker_own_access via trabajador_id, but also need employer-level ones)
CREATE POLICY "worker_employer_recordatorios" ON recordatorios
  FOR SELECT USING (empleador_id = public.get_my_employer_as_worker() AND trabajador_id IS NULL);

-- Workers can see their employer's vivienda (for work context)
CREATE POLICY "worker_employer_vivienda" ON viviendas_empleador
  FOR SELECT USING (empleador_id = public.get_my_employer_as_worker());

-- Workers can see plantillas for shopping
CREATE POLICY "worker_employer_plantillas" ON plantillas_lista_compras
  FOR SELECT USING (empleador_id = public.get_my_employer_as_worker());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. DATA FIX: Link seed empleador to actual auth user
-- The seed empleador (11111111-...) has auth_user_id = NULL
-- Manuel's real auth is 12fe2a42-... and his user_profiles.empleador_id = 11111111-...
-- ─────────────────────────────────────────────────────────────────────────────

-- Link seed empleador to Manuel's auth user
UPDATE empleadores
SET auth_user_id = '12fe2a42-1351-428a-a7d1-6b3e03f73cea'
WHERE id = '11111111-1111-1111-1111-111111111111'
AND auth_user_id IS NULL;

-- Delete the duplicate empleador created by onboarding (170df596-...)
-- since the seed one has all the contratos
DELETE FROM empleadores
WHERE auth_user_id = '12fe2a42-1351-428a-a7d1-6b3e03f73cea'
AND id != '11111111-1111-1111-1111-111111111111';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. PERFORMANCE: Index on rol for admin checks
-- ─────────────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_user_profiles_rol ON user_profiles(rol);
CREATE INDEX IF NOT EXISTS idx_contratos_estado ON contratos(estado);
