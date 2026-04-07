-- =============================================================
-- Admin Portal: tablas faltantes para CRM-ERP vendible
-- =============================================================

-- 1. LEADS (CRM Pipeline)
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text,
  apellido text,
  email text NOT NULL,
  telefono text,
  empresa text,
  fuente text DEFAULT 'formulario' CHECK (fuente IN ('formulario','whatsapp','email','referido')),
  estado text DEFAULT 'nuevo' CHECK (estado IN ('nuevo','contactado','demo_agendada','propuesta_enviada','cerrado_ganado','cerrado_perdido')),
  notas text,
  next_action date,
  valor_estimado integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_full_leads" ON leads FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- 2. VISITAS SERVICIO (para piscineros/jardineros)
CREATE TABLE IF NOT EXISTS visitas_servicio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid REFERENCES trabajadores(id) ON DELETE CASCADE,
  empleador_id uuid REFERENCES empleadores(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  estado text DEFAULT 'programada' CHECK (estado IN ('programada','completada','aprobada','no_realizada')),
  costo_visita integer DEFAULT 0,
  completada_por_empleado boolean DEFAULT false,
  completada_at timestamptz,
  aprobada_por_empleador boolean DEFAULT false,
  aprobada_at timestamptz,
  notas text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visitas_servicio ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employer_visitas" ON visitas_servicio FOR ALL TO authenticated
  USING (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
    OR trabajador_id IN (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND trabajador_id IS NOT NULL)
    OR EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- 3. MATERIALES VISITA
CREATE TABLE IF NOT EXISTS materiales_visita (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id uuid REFERENCES visitas_servicio(id) ON DELETE CASCADE,
  nombre text NOT NULL,
  cantidad integer DEFAULT 1,
  costo integer DEFAULT 0,
  aprobado boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE materiales_visita ENABLE ROW LEVEL SECURITY;
CREATE POLICY "materiales_via_visita" ON materiales_visita FOR ALL TO authenticated
  USING (visita_id IN (
    SELECT id FROM visitas_servicio WHERE
      empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
      OR trabajador_id IN (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND trabajador_id IS NOT NULL)
      OR EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  ));

-- 4. FACTURAS POPPINS (billing de la plataforma)
CREATE TABLE IF NOT EXISTS facturas_poppins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id uuid REFERENCES empleadores(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  monto integer DEFAULT 0,
  plan text,
  estado text DEFAULT 'emitida' CHECK (estado IN ('emitida','pagada','vencida','anulada')),
  fecha_pago timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE facturas_poppins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_facturas" ON facturas_poppins FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));
CREATE POLICY "employer_own_facturas" ON facturas_poppins FOR SELECT TO authenticated
  USING (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid()));

-- 5. AUDIT LOG (trazabilidad de acciones admin)
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  details jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit" ON audit_log FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- 6. CICLO CIERRE MES (ya puede existir, solo IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS ciclo_cierre_mes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id uuid REFERENCES empleadores(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  paso text NOT NULL,
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_progreso','completado','error')),
  completado_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(empleador_id, periodo, paso)
);

ALTER TABLE ciclo_cierre_mes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_ciclo" ON ciclo_cierre_mes;
CREATE POLICY "admin_ciclo" ON ciclo_cierre_mes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- 7. Agregar columnas faltantes a recordatorios (si no existen)
DO $$ BEGIN
  ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS cumplido boolean DEFAULT false;
  ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS fecha_cumplimiento timestamptz;
  ALTER TABLE recordatorios ADD COLUMN IF NOT EXISTS nota_empleado text;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- 8. Indexes para performance
CREATE INDEX IF NOT EXISTS idx_leads_estado ON leads(estado);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visitas_trabajador ON visitas_servicio(trabajador_id, fecha);
CREATE INDEX IF NOT EXISTS idx_visitas_empleador ON visitas_servicio(empleador_id, fecha);
CREATE INDEX IF NOT EXISTS idx_ciclo_periodo ON ciclo_cierre_mes(periodo, empleador_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_periodo ON facturas_poppins(periodo, empleador_id);
