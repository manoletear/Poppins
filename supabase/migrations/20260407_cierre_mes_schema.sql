-- =====================================================
-- CIERRE DE MES: Schema completo para proceso batch
-- Flujo: Empleador autoriza (día 27) → Admin cierra → Batch genera docs
-- =====================================================

-- 1. Agregar empleador_id a liquidaciones
ALTER TABLE liquidaciones ADD COLUMN IF NOT EXISTS empleador_id uuid REFERENCES empleadores(id);
UPDATE liquidaciones l SET empleador_id = c.empleador_id
FROM contratos c WHERE l.trabajador_id = c.trabajador_id AND l.empleador_id IS NULL AND c.estado = 'activo';
CREATE INDEX IF NOT EXISTS idx_liquidaciones_empleador ON liquidaciones(empleador_id, periodo);

-- 2. CIERRE_MES: Registro maestro por periodo
CREATE TABLE IF NOT EXISTS cierre_mes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periodo text NOT NULL UNIQUE,
  estado text DEFAULT 'abierto' CHECK (estado IN ('abierto','procesando','cerrado')),
  fecha_cierre timestamptz,
  fecha_deadline date,
  total_empleadores integer DEFAULT 0,
  total_trabajadores integer DEFAULT 0,
  total_liquido numeric DEFAULT 0,
  total_cotizaciones numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cierre_mes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_cierre_mes" ON cierre_mes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- 3. CIERRE_MES_EMPLEADOR: Autorización por empleador
CREATE TABLE IF NOT EXISTS cierre_mes_empleador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_mes_id uuid REFERENCES cierre_mes(id) ON DELETE CASCADE,
  empleador_id uuid REFERENCES empleadores(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  autorizado boolean DEFAULT false,
  fecha_autorizacion timestamptz,
  metodo_pago text CHECK (metodo_pago IN ('transferencia','tc_pat','pendiente')),
  estado text DEFAULT 'pendiente' CHECK (estado IN ('pendiente','autorizado','procesado','pagado','error')),
  monto_liquido numeric DEFAULT 0,
  monto_cotizaciones numeric DEFAULT 0,
  cantidad_trabajadores integer DEFAULT 0,
  notas text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(cierre_mes_id, empleador_id)
);
ALTER TABLE cierre_mes_empleador ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_cierre_emp" ON cierre_mes_empleador FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));
CREATE POLICY "employer_own_cierre" ON cierre_mes_empleador FOR SELECT TO authenticated
  USING (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid()));

-- 4. CIERRE_MES_DOCUMENTO: Archivos generados por empleador+trabajador
CREATE TABLE IF NOT EXISTS cierre_mes_documento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cierre_mes_id uuid REFERENCES cierre_mes(id) ON DELETE CASCADE,
  empleador_id uuid REFERENCES empleadores(id) ON DELETE CASCADE,
  trabajador_id uuid REFERENCES trabajadores(id) ON DELETE SET NULL,
  tipo text NOT NULL CHECK (tipo IN (
    'liquidacion_pdf','previred_csv','lre_txt','f29_pdf',
    'libro_remuneraciones','contabilidad_csv','anticipo_pdf',
    'certificado_sueldo','comprobante_pago'
  )),
  periodo text NOT NULL,
  archivo_url text,
  nombre_archivo text,
  estado text DEFAULT 'generado' CHECK (estado IN ('generado','firmado','enviado','error')),
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cierre_mes_documento ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_cierre_doc" ON cierre_mes_documento FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));
CREATE POLICY "employer_own_docs" ON cierre_mes_documento FOR SELECT TO authenticated
  USING (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid()));
CREATE POLICY "worker_own_docs" ON cierre_mes_documento FOR SELECT TO authenticated
  USING (trabajador_id IN (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND trabajador_id IS NOT NULL));

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_cierre_mes_periodo ON cierre_mes(periodo);
CREATE INDEX IF NOT EXISTS idx_cierre_emp_periodo ON cierre_mes_empleador(periodo, empleador_id);
CREATE INDEX IF NOT EXISTS idx_cierre_doc_periodo ON cierre_mes_documento(periodo, empleador_id);
CREATE INDEX IF NOT EXISTS idx_cierre_doc_tipo ON cierre_mes_documento(tipo, periodo);
CREATE INDEX IF NOT EXISTS idx_cierre_doc_trabajador ON cierre_mes_documento(trabajador_id, periodo);
