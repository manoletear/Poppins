-- ════════════════════════════════════════════════════════════════════════
-- COMPLETAR ESQUEMA sczxy — tablas y buckets que la app usa pero faltaban.
-- Detectado en QA: 20260408 se aplicó solo a medias (faltan onboarding/documentos/
-- pagos_suscripcion/invitaciones); beneficios_empleador nunca tuvo migración; y
-- faltan buckets de Storage 'comprobantes' y 'documentos'.
-- Correr en sczxy → SQL Editor. Idempotente.
-- ════════════════════════════════════════════════════════════════════════

-- ── Tablas faltantes de 20260408 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID REFERENCES empleadores(id) ON DELETE CASCADE,
  auth_user_id UUID NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_progreso','completado','abandonado')),
  paso_actual INT NOT NULL DEFAULT 1,
  datos_empleador_completos BOOLEAN DEFAULT FALSE,
  datos_trabajadores_completos BOOLEAN DEFAULT FALSE,
  cantidad_trabajadores INT DEFAULT 0,
  contrato_subido BOOLEAN DEFAULT FALSE,
  contrato_url TEXT,
  contrato_generado BOOLEAN DEFAULT FALSE,
  metodo_pago_configurado BOOLEAN DEFAULT FALSE,
  token_empleada TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_empleada_usado BOOLEAN DEFAULT FALSE,
  token_empleada_expira TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  fuente TEXT DEFAULT 'web',
  metadata JSONB DEFAULT '{}',
  completado_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_auth_user ON onboarding(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_empleador ON onboarding(empleador_id);

CREATE TABLE IF NOT EXISTS documentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID REFERENCES empleadores(id) ON DELETE CASCADE,
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE SET NULL,
  contrato_id UUID REFERENCES contratos(id) ON DELETE SET NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato','anexo','finiquito','liquidacion','certificado','licencia_medica','comprobante_pago','otro')),
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  mime_type TEXT,
  tamano_bytes BIGINT,
  estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo','archivado','eliminado')),
  subido_por UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_documentos_empleador ON documentos(empleador_id);
CREATE INDEX IF NOT EXISTS idx_documentos_trabajador ON documentos(trabajador_id);

CREATE TABLE IF NOT EXISTS pagos_suscripcion (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suscripcion_id UUID NOT NULL REFERENCES suscripciones(id) ON DELETE CASCADE,
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  monto INT NOT NULL,
  moneda TEXT DEFAULT 'CLP',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','procesando','pagado','fallido','reembolsado')),
  flow_token TEXT, flow_order_id TEXT, flow_payment_status TEXT,
  periodo_inicio DATE NOT NULL, periodo_fin DATE NOT NULL,
  comprobante_url TEXT, fecha_pago TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pagos_suscripcion_empleador ON pagos_suscripcion(empleador_id);

CREATE TABLE IF NOT EXISTS invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'trabajador' CHECK (tipo IN ('trabajador','contador')),
  email TEXT, telefono TEXT, nombre TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','aceptada','expirada','cancelada')),
  trabajador_id UUID REFERENCES trabajadores(id) ON DELETE SET NULL,
  expira_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days',
  aceptada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invitaciones_empleador ON invitaciones(empleador_id);

-- Columnas que 20260408 agrega (idempotente)
ALTER TABLE empleadores
  ADD COLUMN IF NOT EXISTS apellido TEXT,
  ADD COLUMN IF NOT EXISTS tipo_vivienda TEXT,
  ADD COLUMN IF NOT EXISTS cantidad_trabajadores INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fuente_registro TEXT DEFAULT 'web';
ALTER TABLE trabajadores
  ADD COLUMN IF NOT EXISTS buk_id TEXT,
  ADD COLUMN IF NOT EXISTS buk_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_token TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT FALSE;

-- ── beneficios_empleador (sin migración previa) ─────────────────────────
CREATE TABLE IF NOT EXISTS beneficios_empleador (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  monto INT,
  vigente BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_beneficios_empleador ON beneficios_empleador(empleador_id);

-- ── RLS (idempotente) ───────────────────────────────────────────────────
ALTER TABLE onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_suscripcion ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficios_empleador ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
  -- Política dueño/admin para cada tabla nueva con empleador_id
  FOR r IN SELECT unnest(ARRAY['documentos','pagos_suscripcion','invitaciones','beneficios_empleador']) AS t LOOP
    EXECUTE format('DROP POLICY IF EXISTS owner_%1$s ON public.%1$s', r.t);
    EXECUTE format('CREATE POLICY owner_%1$s ON public.%1$s FOR ALL USING (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid())) WITH CHECK (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid()))', r.t);
    EXECUTE format('DROP POLICY IF EXISTS admin_%1$s ON public.%1$s', r.t);
    EXECUTE format('CREATE POLICY admin_%1$s ON public.%1$s FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = ''admin''))', r.t);
  END LOOP;
END $$;

-- onboarding: por auth_user_id
DROP POLICY IF EXISTS owner_onboarding ON onboarding;
CREATE POLICY owner_onboarding ON onboarding FOR ALL USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
DROP POLICY IF EXISTS admin_onboarding ON onboarding;
CREATE POLICY admin_onboarding ON onboarding FOR ALL USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- beneficios_empleador: lectura del trabajador (ve los de su empleador con contrato activo)
DROP POLICY IF EXISTS trabajador_lee_beneficios ON beneficios_empleador;
CREATE POLICY trabajador_lee_beneficios ON beneficios_empleador FOR SELECT USING (
  empleador_id IN (
    SELECT c.empleador_id FROM contratos c
    WHERE c.trabajador_id = (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid())
  )
);

-- ── Storage buckets faltantes ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprobantes','comprobantes', false), ('documentos','documentos', false)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: authenticated puede operar en estos buckets
DO $$
DECLARE b TEXT;
BEGIN
  FOREACH b IN ARRAY ARRAY['comprobantes','documentos'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS auth_all_%1$s ON storage.objects', b);
    EXECUTE format('CREATE POLICY auth_all_%1$s ON storage.objects FOR ALL TO authenticated USING (bucket_id = %2$L) WITH CHECK (bucket_id = %2$L)', b, b);
  END LOOP;
END $$;

-- ── Grants para las tablas nuevas + reload ──────────────────────────────
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role, authenticated, anon;
NOTIFY pgrst, 'reload schema';
