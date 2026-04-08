-- ANTICIPOS: flujo solicitud empleado → aprobación empleador → comprobante → liquidación
CREATE TABLE IF NOT EXISTS anticipos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  empleador_id uuid NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  periodo text NOT NULL,
  monto integer NOT NULL CHECK (monto > 0),
  motivo text,
  fecha_solicitud timestamptz DEFAULT now(),
  estado text DEFAULT 'pendiente' CHECK (estado IN (
    'pendiente','aprobado','rechazado','transferido','comprobante_ok','procesado'
  )),
  fecha_aprobacion timestamptz,
  aprobado_por uuid,
  motivo_rechazo text,
  fecha_transferencia date,
  comprobante_url text,
  comprobante_nombre text,
  metodo_transferencia text CHECK (metodo_transferencia IN ('transferencia','efectivo','cheque')),
  liquidacion_id uuid REFERENCES liquidaciones(id),
  procesado_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE anticipos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_anticipos" ON anticipos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));
CREATE POLICY "employer_anticipos" ON anticipos FOR ALL TO authenticated
  USING (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid()));
CREATE POLICY "worker_anticipos_select" ON anticipos FOR SELECT TO authenticated
  USING (trabajador_id IN (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND trabajador_id IS NOT NULL));
CREATE POLICY "worker_anticipos_insert" ON anticipos FOR INSERT TO authenticated
  WITH CHECK (trabajador_id IN (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND trabajador_id IS NOT NULL));
CREATE INDEX IF NOT EXISTS idx_anticipos_trabajador ON anticipos(trabajador_id, periodo);
CREATE INDEX IF NOT EXISTS idx_anticipos_empleador ON anticipos(empleador_id, periodo);
CREATE INDEX IF NOT EXISTS idx_anticipos_estado ON anticipos(estado, periodo);
