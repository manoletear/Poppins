-- ============================================
-- Onboarding & Lifecycle del Cliente
-- Poppins / Tooxs — 2026-04-08
-- ============================================

-- 1. Tabla onboarding: tracking del proceso paso a paso
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID REFERENCES empleadores(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL,

  -- Estado general
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','en_progreso','completado','abandonado')),
  paso_actual INT NOT NULL DEFAULT 1,

  -- Paso 1: Datos del empleador
  datos_empleador_completos BOOLEAN DEFAULT FALSE,

  -- Paso 2: Datos de trabajadores
  datos_trabajadores_completos BOOLEAN DEFAULT FALSE,
  cantidad_trabajadores INT DEFAULT 0,

  -- Paso 3: Contrato (PDF o generado)
  contrato_subido BOOLEAN DEFAULT FALSE,
  contrato_url TEXT,
  contrato_generado BOOLEAN DEFAULT FALSE,

  -- Paso 4: Método de pago
  metodo_pago_configurado BOOLEAN DEFAULT FALSE,

  -- Link de onboarding para empleada
  token_empleada TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_empleada_usado BOOLEAN DEFAULT FALSE,
  token_empleada_expira TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',

  -- Metadata
  fuente TEXT DEFAULT 'web', -- web, google, referido
  metadata JSONB DEFAULT '{}',
  completado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_onboarding_auth_user ON onboarding(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_empleador ON onboarding(empleador_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_token ON onboarding(token_empleada) WHERE token_empleada_usado = FALSE;

-- 2. Documentos del onboarding (contratos PDF, anexos, etc.)
CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID REFERENCES empleadores(id) ON DELETE CASCADE,
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,

  tipo TEXT NOT NULL CHECK (tipo IN (
    'contrato','anexo','finiquito','liquidacion','certificado',
    'licencia_medica','comprobante_pago','otro'
  )),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  tamano_bytes BIGINT,

  -- Estado
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo','archivado','eliminado')),

  -- Quien subió
  subido_por UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documentos_empleador ON documentos(empleador_id);
CREATE INDEX IF NOT EXISTS idx_documentos_trabajador ON documentos(trabajador_id);
CREATE INDEX IF NOT EXISTS idx_documentos_contrato ON documentos(contrato_id);

-- 3. Suscripciones: ciclo de vida del cliente
CREATE TABLE IF NOT EXISTS suscripciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,

  plan TEXT NOT NULL DEFAULT 'poppins' CHECK (plan IN ('poppins','premium','enterprise')),
  estado TEXT NOT NULL DEFAULT 'trial'
    CHECK (estado IN ('trial','activa','suspendida','cancelada','vencida')),

  -- Fechas
  fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_fin DATE, -- NULL = indefinida
  trial_hasta DATE DEFAULT CURRENT_DATE + 14, -- 14 días trial

  -- Facturación
  monto_mensual INT NOT NULL DEFAULT 24770, -- CLP
  moneda TEXT DEFAULT 'CLP',
  dia_cobro INT DEFAULT 1 CHECK (dia_cobro BETWEEN 1 AND 28),

  -- Trabajadores incluidos
  num_trabajadores INT DEFAULT 1,

  -- Cancelación
  cancelada_at TIMESTAMPTZ,
  motivo_cancelacion TEXT,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suscripciones_empleador ON suscripciones(empleador_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_suscripciones_activa ON suscripciones(empleador_id)
  WHERE estado IN ('trial','activa');

-- 4. Historial de pagos del cliente a Poppins/Tooxs
-- (pagos_empleador ya existe para pagos de sueldos via Flow,
--  esta tabla es para pagos de suscripción al servicio)
CREATE TABLE IF NOT EXISTS pagos_suscripcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suscripcion_id UUID NOT NULL REFERENCES suscripciones(id) ON DELETE CASCADE,
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,

  monto INT NOT NULL,
  moneda TEXT DEFAULT 'CLP',
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','procesando','pagado','fallido','reembolsado')),

  -- Flow integration
  flow_token TEXT,
  flow_order_id TEXT,
  flow_payment_status TEXT,

  -- Periodo que cubre
  periodo_inicio DATE NOT NULL,
  periodo_fin DATE NOT NULL,

  -- Comprobante
  comprobante_url TEXT,
  fecha_pago TIMESTAMPTZ,

  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_empleador ON pagos_suscripcion(empleador_id);
CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_estado ON pagos_suscripcion(estado);

-- 5. Invitaciones: link para onboarding de empleadas
CREATE TABLE IF NOT EXISTS invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,

  tipo TEXT NOT NULL DEFAULT 'trabajador' CHECK (tipo IN ('trabajador','contador')),
  email TEXT,
  telefono TEXT,
  nombre TEXT,

  -- Token único para el link
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),

  -- Estado
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada','expirada','cancelada')),

  -- Si fue aceptada, referencia al trabajador creado
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE SET NULL,

  expira_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  aceptada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitaciones_token ON invitaciones(token) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_invitaciones_empleador ON invitaciones(empleador_id);

-- 6. Agregar campos faltantes a empleadores
ALTER TABLE empleadores
  ADD COLUMN IF NOT EXISTS apellido TEXT,
  ADD COLUMN IF NOT EXISTS tipo_vivienda TEXT, -- casa, departamento, parcela
  ADD COLUMN IF NOT EXISTS cantidad_trabajadores INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fuente_registro TEXT DEFAULT 'web'; -- web, google, referido, chatbot

-- 7. Agregar campo buk_id a trabajadores (sync con BUK)
ALTER TABLE trabajadores
  ADD COLUMN IF NOT EXISTS buk_id TEXT,
  ADD COLUMN IF NOT EXISTS buk_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_token TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT FALSE;

-- 8. RLS Policies
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE suscripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitaciones ENABLE ROW LEVEL SECURITY;

-- Empleador ve solo sus datos
CREATE POLICY "empleador_onboarding" ON onboarding
  FOR ALL USING (auth_user_id = auth.uid());

CREATE POLICY "empleador_documentos" ON documentos
  FOR ALL USING (
    empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "empleador_suscripciones" ON suscripciones
  FOR ALL USING (
    empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "empleador_pagos_sub" ON pagos_suscripcion
  FOR ALL USING (
    empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "empleador_invitaciones" ON invitaciones
  FOR ALL USING (
    empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())
  );

-- Admin ve todo
CREATE POLICY "admin_onboarding" ON onboarding
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_documentos" ON documentos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_suscripciones" ON suscripciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_pagos_sub" ON pagos_suscripcion
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "admin_invitaciones" ON invitaciones
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin')
  );

-- 9. Función para crear suscripción automática al completar onboarding
CREATE OR REPLACE FUNCTION fn_crear_suscripcion_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'completado' AND OLD.estado != 'completado' THEN
    INSERT INTO suscripciones (empleador_id, num_trabajadores)
    VALUES (NEW.empleador_id, NEW.cantidad_trabajadores)
    ON CONFLICT DO NOTHING;

    -- Marcar empleador como onboarding completado
    UPDATE empleadores SET onboarding_completado = TRUE WHERE id = NEW.empleador_id;
    UPDATE user_profiles SET onboarding_completado = TRUE WHERE auth_user_id = NEW.auth_user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_onboarding_completado
  AFTER UPDATE ON onboarding
  FOR EACH ROW
  EXECUTE FUNCTION fn_crear_suscripcion_onboarding();
