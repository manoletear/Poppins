-- supabase/migrations/20260325_pagos_redesign.sql
-- Pagos module redesign: cards, plans, bank benefits

-- 1. Client credit cards (BIN-detected)
CREATE TABLE IF NOT EXISTS tarjetas_cliente (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  empleador_id UUID NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  bin VARCHAR(8) NOT NULL,
  ultimos_4 VARCHAR(4) NOT NULL,
  banco VARCHAR(100) NOT NULL,
  tipo_tarjeta VARCHAR(20) NOT NULL DEFAULT 'visa',
  categoria VARCHAR(30) NOT NULL DEFAULT 'classic',
  programa_puntos VARCHAR(100) NOT NULL,
  tasa_puntos NUMERIC(4,2) NOT NULL DEFAULT 0.5,
  activa BOOLEAN NOT NULL DEFAULT true,
  es_principal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tarjetas_empleador ON tarjetas_cliente(empleador_id);

-- 2. Bank benefits catalog (updated periodically)
CREATE TABLE IF NOT EXISTS beneficios_banco (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banco VARCHAR(100) NOT NULL,
  tipo_tarjeta VARCHAR(20) NOT NULL,
  categoria VARCHAR(30) NOT NULL,
  programa_puntos VARCHAR(100) NOT NULL,
  tasa_base NUMERIC(4,2) NOT NULL DEFAULT 1.0,
  tasa_promocional NUMERIC(4,2),
  promo_descripcion TEXT,
  promo_vigente_hasta DATE,
  categorias_bonus TEXT[] DEFAULT '{}',
  valor_punto_clp NUMERIC(6,2) NOT NULL DEFAULT 10.0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_beneficios_banco ON beneficios_banco(banco, tipo_tarjeta);

-- 3. Extend empleadores with plan info
ALTER TABLE empleadores
  ADD COLUMN IF NOT EXISTS plan_tipo VARCHAR(20) NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS plan_inicio TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS plan_renovacion TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onboarding_pagos_completado BOOLEAN NOT NULL DEFAULT false;

-- 4. Extend cuentas_pago with discovery metadata
ALTER TABLE cuentas_pago
  ADD COLUMN IF NOT EXISTS fuente VARCHAR(10) NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS numero_cliente VARCHAR(50),
  ADD COLUMN IF NOT EXISTS numero_medidor VARCHAR(50),
  ADD COLUMN IF NOT EXISTS rut_proveedor VARCHAR(20),
  ADD COLUMN IF NOT EXISTS direccion_servicio TEXT,
  ADD COLUMN IF NOT EXISTS monto_variable BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ultimo_monto NUMERIC(12,0),
  ADD COLUMN IF NOT EXISTS discovery_method VARCHAR(20);

-- 5. Extend pagos_empleador with commission tracking
ALTER TABLE pagos_empleador
  ADD COLUMN IF NOT EXISTS comision_porcentaje NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS comision_monto NUMERIC(12,0),
  ADD COLUMN IF NOT EXISTS tarjeta_id UUID REFERENCES tarjetas_cliente(id),
  ADD COLUMN IF NOT EXISTS puntos_banco_estimados NUMERIC(10,2);

-- 6. RLS policies
ALTER TABLE tarjetas_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE beneficios_banco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own cards" ON tarjetas_cliente
  FOR ALL USING (empleador_id IN (
    SELECT empleador_id FROM user_profiles WHERE auth_user_id = auth.uid()
  ));

CREATE POLICY "Everyone can read bank benefits" ON beneficios_banco
  FOR SELECT USING (true);

-- 7. Seed initial bank benefits
INSERT INTO beneficios_banco (banco, tipo_tarjeta, categoria, programa_puntos, tasa_base, valor_punto_clp) VALUES
  ('Santander', 'visa', 'platinum', 'Latam Pass', 1.0, 12.0),
  ('Santander', 'visa', 'signature', 'Latam Pass', 1.5, 12.0),
  ('Santander', 'mastercard', 'black', 'Latam Pass', 2.0, 12.0),
  ('BCI', 'visa', 'platinum', 'Latam Pass', 1.0, 12.0),
  ('BCI', 'visa', 'signature', 'Dollar', 1.2, 10.0),
  ('Banco de Chile', 'visa', 'platinum', 'Travel Club', 1.0, 11.0),
  ('Banco de Chile', 'visa', 'infinite', 'Travel Club', 1.8, 11.0),
  ('Banco de Chile', 'mastercard', 'black', 'Travel Club', 2.0, 11.0),
  ('Banco Estado', 'visa', 'classic', 'Puntos Estado', 0.5, 8.0),
  ('Banco Estado', 'visa', 'gold', 'Puntos Estado', 0.8, 8.0),
  ('Banco Falabella', 'otra', 'classic', 'CMR Puntos', 1.0, 7.0),
  ('Scotiabank', 'visa', 'platinum', 'Scotia Rewards', 0.8, 9.0),
  ('Itau', 'visa', 'platinum', 'Latam Pass', 1.0, 12.0)
ON CONFLICT DO NOTHING;
