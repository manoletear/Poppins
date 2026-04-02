-- =============================================================================
-- Poppins ERP: Enable RLS on ALL public tables
-- Migration: 20260402_enable_rls_all_tables.sql
--
-- Categories:
--   A. Employer-scoped (direct empleador_id)
--   B. Worker-scoped (direct trabajador_id, employer access via contratos)
--   C. Indirect FK (access through parent table)
--   D. Reference/catalog (public read-only)
--   E. User profiles & auth
--   F. Legacy/unused (locked down, no access)
-- =============================================================================

-- Helper: reusable function to get current user's empleador_id
CREATE OR REPLACE FUNCTION public.get_my_empleador_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empleador_id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Helper: reusable function to get current user's trabajador_id
CREATE OR REPLACE FUNCTION public.get_my_trabajador_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() LIMIT 1;
$$;

-- Helper: reusable function to get current user's cliente_id (via empleadores)
CREATE OR REPLACE FUNCTION public.get_my_cliente_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.cliente_id FROM empleadores e
  JOIN user_profiles up ON up.empleador_id = e.id
  WHERE up.auth_user_id = auth.uid() LIMIT 1;
$$;

-- =============================================================================
-- A. EMPLOYER-SCOPED TABLES (direct empleador_id column)
-- =============================================================================

-- empleadores: owner sees own record
ALTER TABLE empleadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_access" ON empleadores
  FOR ALL USING (auth_user_id = auth.uid());

-- cuentas_pago
ALTER TABLE cuentas_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON cuentas_pago
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- pagos_empleador
ALTER TABLE pagos_empleador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON pagos_empleador
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- listas_compras
ALTER TABLE listas_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON listas_compras
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- plantillas_lista_compras
ALTER TABLE plantillas_lista_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON plantillas_lista_compras
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- familiares_empleador
ALTER TABLE familiares_empleador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON familiares_empleador
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- mascotas_empleador
ALTER TABLE mascotas_empleador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON mascotas_empleador
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- viviendas_empleador
ALTER TABLE viviendas_empleador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON viviendas_empleador
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- preferencias_trabajo
ALTER TABLE preferencias_trabajo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON preferencias_trabajo
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- cuentas_empleador
ALTER TABLE cuentas_empleador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON cuentas_empleador
  FOR ALL USING (empleador_id = public.get_my_empleador_id());

-- tarjetas_cliente: already has RLS, skip ENABLE but add worker read policy
-- (RLS already enabled, policy "Users can manage own cards" already exists)

-- =============================================================================
-- B. DUAL-SCOPE TABLES (empleador_id + trabajador_id)
-- Employers see all their workers' data. Workers see only their own.
-- =============================================================================

-- contratos
ALTER TABLE contratos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON contratos
  FOR ALL USING (empleador_id = public.get_my_empleador_id());
CREATE POLICY "worker_own_access" ON contratos
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- tareas
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON tareas
  FOR ALL USING (empleador_id = public.get_my_empleador_id());
CREATE POLICY "worker_own_access" ON tareas
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());
CREATE POLICY "worker_update_own" ON tareas
  FOR UPDATE USING (trabajador_id = public.get_my_trabajador_id());

-- marcajes_horario
ALTER TABLE marcajes_horario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON marcajes_horario
  FOR ALL USING (empleador_id = public.get_my_empleador_id());
CREATE POLICY "worker_own_access" ON marcajes_horario
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());
CREATE POLICY "worker_insert_own" ON marcajes_horario
  FOR INSERT WITH CHECK (trabajador_id = public.get_my_trabajador_id());
CREATE POLICY "worker_update_own" ON marcajes_horario
  FOR UPDATE USING (trabajador_id = public.get_my_trabajador_id());

-- solicitudes_empleado
ALTER TABLE solicitudes_empleado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON solicitudes_empleado
  FOR ALL USING (empleador_id = public.get_my_empleador_id());
CREATE POLICY "worker_own_access" ON solicitudes_empleado
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());
CREATE POLICY "worker_insert_own" ON solicitudes_empleado
  FOR INSERT WITH CHECK (trabajador_id = public.get_my_trabajador_id());

-- recordatorios
ALTER TABLE recordatorios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_access" ON recordatorios
  FOR ALL USING (empleador_id = public.get_my_empleador_id());
CREATE POLICY "worker_own_access" ON recordatorios
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- =============================================================================
-- C. WORKER-ONLY TABLES (trabajador_id, employer access via contratos join)
-- =============================================================================

-- trabajadores: employer sees workers linked via contratos
ALTER TABLE trabajadores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON trabajadores
  FOR ALL USING (
    id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON trabajadores
  FOR SELECT USING (id = public.get_my_trabajador_id());
CREATE POLICY "worker_update_own" ON trabajadores
  FOR UPDATE USING (id = public.get_my_trabajador_id());

-- liquidaciones: employer via trabajador → contratos
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON liquidaciones
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON liquidaciones
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());
CREATE POLICY "worker_update_own" ON liquidaciones
  FOR UPDATE USING (trabajador_id = public.get_my_trabajador_id());

-- documentos_empleado
ALTER TABLE documentos_empleado ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON documentos_empleado
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON documentos_empleado
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- finiquitos
ALTER TABLE finiquitos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON finiquitos
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON finiquitos
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- licencias_medicas
ALTER TABLE licencias_medicas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON licencias_medicas
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON licencias_medicas
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- movimientos_vacaciones
ALTER TABLE movimientos_vacaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON movimientos_vacaciones
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON movimientos_vacaciones
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- registro_horas_extras
ALTER TABLE registro_horas_extras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON registro_horas_extras
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON registro_horas_extras
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- cargas_familiares
ALTER TABLE cargas_familiares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON cargas_familiares
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON cargas_familiares
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- anotaciones
ALTER TABLE anotaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_contratos" ON anotaciones
  FOR ALL USING (
    trabajador_id IN (SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_own_access" ON anotaciones
  FOR SELECT USING (trabajador_id = public.get_my_trabajador_id());

-- chat_conversaciones
ALTER TABLE chat_conversaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_own_access" ON chat_conversaciones
  FOR ALL USING (trabajador_id = public.get_my_trabajador_id());

-- chat_feedback
ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_own_access" ON chat_feedback
  FOR ALL USING (trabajador_id = public.get_my_trabajador_id());

-- =============================================================================
-- D. INDIRECT FK TABLES (access through parent)
-- =============================================================================

-- items_lista_compras → lista_id → listas_compras.empleador_id
ALTER TABLE items_lista_compras ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_lista" ON items_lista_compras
  FOR ALL USING (
    lista_id IN (SELECT id FROM listas_compras WHERE empleador_id = public.get_my_empleador_id())
  );
CREATE POLICY "worker_via_lista" ON items_lista_compras
  FOR SELECT USING (
    lista_id IN (
      SELECT id FROM listas_compras WHERE empleador_id IN (
        SELECT empleador_id FROM contratos WHERE trabajador_id = public.get_my_trabajador_id()
      )
    )
  );
CREATE POLICY "worker_insert_items" ON items_lista_compras
  FOR INSERT WITH CHECK (
    lista_id IN (
      SELECT id FROM listas_compras WHERE empleador_id IN (
        SELECT empleador_id FROM contratos WHERE trabajador_id = public.get_my_trabajador_id()
      )
    )
  );
CREATE POLICY "worker_update_items" ON items_lista_compras
  FOR UPDATE USING (
    lista_id IN (
      SELECT id FROM listas_compras WHERE empleador_id IN (
        SELECT empleador_id FROM contratos WHERE trabajador_id = public.get_my_trabajador_id()
      )
    )
  );

-- comprobantes_pago → pago_id → pagos_empleador.empleador_id
ALTER TABLE comprobantes_pago ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_pago" ON comprobantes_pago
  FOR ALL USING (
    pago_id IN (SELECT id FROM pagos_empleador WHERE empleador_id = public.get_my_empleador_id())
  );

-- chat_mensajes → conversacion_id → chat_conversaciones.trabajador_id
ALTER TABLE chat_mensajes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "worker_via_conversacion" ON chat_mensajes
  FOR ALL USING (
    conversacion_id IN (SELECT id FROM chat_conversaciones WHERE trabajador_id = public.get_my_trabajador_id())
  );

-- cotizaciones_previsionales → liquidacion_id → liquidaciones
ALTER TABLE cotizaciones_previsionales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_liquidacion" ON cotizaciones_previsionales
  FOR ALL USING (
    liquidacion_id IN (
      SELECT id FROM liquidaciones WHERE trabajador_id IN (
        SELECT trabajador_id FROM contratos WHERE empleador_id = public.get_my_empleador_id()
      )
    )
  );
CREATE POLICY "worker_via_liquidacion" ON cotizaciones_previsionales
  FOR SELECT USING (
    liquidacion_id IN (
      SELECT id FROM liquidaciones WHERE trabajador_id = public.get_my_trabajador_id()
    )
  );

-- =============================================================================
-- E. REFERENCE / CATALOG TABLES (public read-only)
-- =============================================================================

ALTER TABLE instituciones_previsionales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON instituciones_previsionales FOR SELECT USING (true);

ALTER TABLE indicadores_economicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON indicadores_economicos FOR SELECT USING (true);

ALTER TABLE tramos_impuesto ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON tramos_impuesto FOR SELECT USING (true);

ALTER TABLE tramos_asignacion_familiar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON tramos_asignacion_familiar FOR SELECT USING (true);

-- beneficios_banco: already has RLS + "Everyone can read bank benefits" policy
-- (skip)

ALTER TABLE noticias_legales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON noticias_legales FOR SELECT USING (true);

ALTER TABLE periodos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON periodos FOR SELECT USING (true);

-- =============================================================================
-- F. USER PROFILES & AUTH
-- =============================================================================

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_profile_read" ON user_profiles
  FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY "own_profile_update" ON user_profiles
  FOR UPDATE USING (auth_user_id = auth.uid());
CREATE POLICY "own_profile_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- clientes: employer sees own client record
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_empleador" ON clientes
  FOR ALL USING (id = public.get_my_cliente_id());

-- facturas_poppins: employer sees own invoices
ALTER TABLE facturas_poppins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_via_cliente" ON facturas_poppins
  FOR SELECT USING (cliente_id = public.get_my_cliente_id());

-- =============================================================================
-- G. LEGACY / UNUSED TABLES (lock down completely)
-- =============================================================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- No policies = no access (locked)

ALTER TABLE propiedades_usuario ENABLE ROW LEVEL SECURITY;
-- No policies = no access

ALTER TABLE documentos_usuario ENABLE ROW LEVEL SECURITY;
-- No policies = no access

ALTER TABLE auditorias_usuario ENABLE ROW LEVEL SECURITY;
-- No policies = no access

ALTER TABLE casos ENABLE ROW LEVEL SECURITY;
-- No policies = no access

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
-- No policies = no access

-- =============================================================================
-- INDEXES for RLS performance
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user ON user_profiles(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_empleador ON user_profiles(empleador_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_trabajador ON user_profiles(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_contratos_empleador ON contratos(empleador_id);
CREATE INDEX IF NOT EXISTS idx_contratos_trabajador ON contratos(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_liquidaciones_trabajador ON liquidaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_tareas_empleador ON tareas(empleador_id);
CREATE INDEX IF NOT EXISTS idx_tareas_trabajador ON tareas(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_marcajes_empleador ON marcajes_horario(empleador_id);
CREATE INDEX IF NOT EXISTS idx_marcajes_trabajador ON marcajes_horario(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_empleador ON solicitudes_empleado(empleador_id);
CREATE INDEX IF NOT EXISTS idx_solicitudes_trabajador ON solicitudes_empleado(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_recordatorios_empleador ON recordatorios(empleador_id);
CREATE INDEX IF NOT EXISTS idx_listas_compras_empleador ON listas_compras(empleador_id);
CREATE INDEX IF NOT EXISTS idx_items_lista ON items_lista_compras(lista_id);
CREATE INDEX IF NOT EXISTS idx_pagos_empleador_eid ON pagos_empleador(empleador_id);
CREATE INDEX IF NOT EXISTS idx_comprobantes_pago ON comprobantes_pago(pago_id);
CREATE INDEX IF NOT EXISTS idx_chat_conv_trabajador ON chat_conversaciones(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv ON chat_mensajes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_empleadores_auth ON empleadores(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_empleadores_cliente ON empleadores(cliente_id);
