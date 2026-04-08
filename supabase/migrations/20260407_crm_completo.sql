-- =============================================
-- CRM Completo: Temperatura, Score, Actividades, Deals
-- Poppins Admin - 2026-04-07
-- =============================================

-- 1. Enriquecer tabla leads con temperatura y score
ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperatura text DEFAULT 'frio' CHECK (temperatura IN ('frio', 'tibio', 'caliente'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS score integer DEFAULT 0 CHECK (score >= 0 AND score <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS cargo_interes text; -- asesora_hogar, jardinero, piscinero, multiple
ALTER TABLE leads ADD COLUMN IF NOT EXISTS num_trabajadores integer DEFAULT 1;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS plan_interes text CHECK (plan_interes IN ('free', 'starter', 'premium', 'enterprise'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS ultimo_contacto timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id);

-- 2. Actividades CRM (log de interacciones)
CREATE TABLE IF NOT EXISTS crm_actividades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES leads(id) ON DELETE CASCADE,
  deal_id uuid, -- FK se agrega después de crear crm_deals
  tipo text NOT NULL CHECK (tipo IN ('llamada', 'email', 'whatsapp', 'reunion', 'demo', 'nota', 'seguimiento')),
  descripcion text,
  resultado text, -- conectado, no_contesta, interesado, rechazado, reagendar
  scheduled_at timestamptz,
  completed_at timestamptz,
  duracion_min integer,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- 3. Pipeline de deals (etapas configurables)
CREATE TABLE IF NOT EXISTS crm_pipeline_etapas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  orden integer NOT NULL DEFAULT 0,
  color text DEFAULT '#6366f1',
  es_ganado boolean DEFAULT false,
  es_perdido boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Insertar etapas default para Poppins
INSERT INTO crm_pipeline_etapas (nombre, orden, color, es_ganado, es_perdido) VALUES
  ('Prospecto', 1, '#94a3b8', false, false),
  ('Contactado', 2, '#3b82f6', false, false),
  ('Demo Agendada', 3, '#8b5cf6', false, false),
  ('Propuesta', 4, '#f59e0b', false, false),
  ('Negociacion', 5, '#f97316', false, false),
  ('Ganado', 6, '#10b981', true, false),
  ('Perdido', 7, '#ef4444', false, true)
ON CONFLICT DO NOTHING;

-- 4. Deals (oportunidades de suscripción)
CREATE TABLE IF NOT EXISTS crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,
  etapa_id uuid NOT NULL REFERENCES crm_pipeline_etapas(id),
  valor_mensual integer DEFAULT 0, -- CLP mensual (MRR)
  plan_tipo text CHECK (plan_tipo IN ('free', 'starter', 'premium', 'enterprise')),
  probabilidad integer DEFAULT 50 CHECK (probabilidad >= 0 AND probabilidad <= 100),
  num_trabajadores integer DEFAULT 1,
  fecha_cierre_esperada date,
  motivo_perdida text,
  notas text,
  assigned_to uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Agregar FK de actividades a deals
ALTER TABLE crm_actividades ADD CONSTRAINT crm_actividades_deal_fk
  FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL;

-- 5. Índices
CREATE INDEX IF NOT EXISTS idx_crm_actividades_lead ON crm_actividades(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_actividades_deal ON crm_actividades(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_actividades_scheduled ON crm_actividades(scheduled_at) WHERE completed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_crm_deals_etapa ON crm_deals(etapa_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_lead ON crm_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_leads_temperatura ON leads(temperatura);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads(score DESC);

-- 6. RLS
ALTER TABLE crm_actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_pipeline_etapas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access crm_actividades" ON crm_actividades FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access crm_deals" ON crm_deals FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

CREATE POLICY "Admin full access crm_pipeline_etapas" ON crm_pipeline_etapas FOR ALL
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));

-- Lectura pública de etapas (para dropdowns)
CREATE POLICY "Public read crm_pipeline_etapas" ON crm_pipeline_etapas FOR SELECT USING (true);
