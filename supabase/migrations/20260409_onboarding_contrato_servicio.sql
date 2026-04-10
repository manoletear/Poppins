-- ============================================
-- Onboarding: Contrato de Servicio + Datos Hogar post-pago
-- Poppins / Tooxs — 2026-04-09
-- ============================================

-- 1. Tabla contratos_servicio: datos legales del contrato de prestación de servicios
CREATE TABLE IF NOT EXISTS contratos_servicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,

  -- Datos del contratante (duplicados para el contrato legal)
  contratante_nombre TEXT NOT NULL,
  contratante_rut TEXT NOT NULL,
  contratante_direccion TEXT NOT NULL,
  contratante_comuna TEXT NOT NULL,
  contratante_ciudad TEXT NOT NULL,
  contratante_email TEXT NOT NULL,
  contratante_telefono TEXT,

  -- Tipo de servicio contratado
  plan TEXT NOT NULL DEFAULT 'poppins' CHECK (plan IN ('poppins','premium','enterprise')),
  tipo_servicio TEXT NOT NULL DEFAULT 'integral'
    CHECK (tipo_servicio IN ('integral','aseo','cocina','cuidado_ninos','cuidado_adultos','jardineria','otro')),
  frecuencia TEXT NOT NULL DEFAULT 'mensual'
    CHECK (frecuencia IN ('diario','semanal','quincenal','mensual')),
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Monto y pago
  monto_mensual INT NOT NULL DEFAULT 24770, -- CLP
  moneda TEXT DEFAULT 'CLP',

  -- Aceptación legal
  acepta_terminos BOOLEAN NOT NULL DEFAULT FALSE,
  acepta_politica_privacidad BOOLEAN NOT NULL DEFAULT FALSE,
  ip_aceptacion TEXT,
  fecha_aceptacion TIMESTAMPTZ,

  -- Pago del primer mes / activación
  pago_activacion_id UUID, -- ref a pagos_suscripcion
  pago_estado TEXT DEFAULT 'pendiente'
    CHECK (pago_estado IN ('pendiente','pagado','fallido','reembolsado')),
  flow_token TEXT,
  flow_order_id TEXT,

  -- Estado del contrato
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','pendiente_pago','activo','suspendido','cancelado')),

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contratos_servicio_empleador ON contratos_servicio(empleador_id);
CREATE INDEX IF NOT EXISTS idx_contratos_servicio_estado ON contratos_servicio(estado);

-- 2. Tabla datos_hogar: se llena post-pago via link en email de bienvenida
CREATE TABLE IF NOT EXISTS datos_hogar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,

  tipo_vivienda TEXT CHECK (tipo_vivienda IN ('casa','departamento','parcela','')),
  direccion TEXT,
  comuna TEXT,
  ciudad TEXT,
  metros_construidos INT,
  pisos INT DEFAULT 1,
  dormitorios INT,
  banos INT,
  tiene_piscina BOOLEAN DEFAULT FALSE,
  tiene_jardin BOOLEAN DEFAULT FALSE,
  estacionamientos INT DEFAULT 0,
  observaciones TEXT,

  completado BOOLEAN DEFAULT FALSE,
  completado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_datos_hogar_empleador ON datos_hogar(empleador_id);

-- 3. Agregar campos de dirección al empleador
ALTER TABLE empleadores
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS comuna TEXT,
  ADD COLUMN IF NOT EXISTS ciudad TEXT;

-- 4. RLS
ALTER TABLE contratos_servicio ENABLE ROW LEVEL SECURITY;
ALTER TABLE datos_hogar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "empleador_contratos_servicio" ON contratos_servicio
  FOR ALL USING (
    empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "admin_contratos_servicio" ON contratos_servicio
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "empleador_datos_hogar" ON datos_hogar
  FOR ALL USING (
    empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "admin_datos_hogar" ON datos_hogar
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  );
