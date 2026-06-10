-- Contratos TCP completos: cláusulas Art. 9-11 + 146-152 CT.
-- + Catálogo de cargos + anexos versionados + firma electrónica.

-- ─── Columnas faltantes en contratos ────────────────────────────────────────
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS puertas_adentro       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lugar_servicios       text,                          -- Dirección específica del hogar
  ADD COLUMN IF NOT EXISTS distribucion_horaria  jsonb,                         -- {lunes: {inicio,fin,colacion_min}, ...}
  ADD COLUMN IF NOT EXISTS beneficios            jsonb,                         -- {colacion_monto, movilizacion_monto, otros[]}
  ADD COLUMN IF NOT EXISTS viajes_familia        boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS descanso_semanal      text NOT NULL DEFAULT 'domingo', -- 'domingo', 'sabado_domingo', 'rotativo'
  ADD COLUMN IF NOT EXISTS pdf_url               text,
  ADD COLUMN IF NOT EXISTS fecha_firma_empleador timestamptz,
  ADD COLUMN IF NOT EXISTS fecha_firma_trabajador timestamptz,
  ADD COLUMN IF NOT EXISTS ip_firma_empleador    inet,
  ADD COLUMN IF NOT EXISTS ip_firma_trabajador   inet,
  ADD COLUMN IF NOT EXISTS metodo_firma          text;   -- 'electronica_simple', 'manuscrita', 'fea'

-- ─── Catálogo de cargos TCP ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cat_cargos_tcp (
  id              serial   PRIMARY KEY,
  codigo          text     UNIQUE NOT NULL,
  nombre          text     NOT NULL,
  descripcion     text,
  requiere_puertas_adentro boolean DEFAULT false,
  activo          boolean  NOT NULL DEFAULT true,
  orden           integer  NOT NULL DEFAULT 99
);

INSERT INTO public.cat_cargos_tcp (codigo, nombre, descripcion, requiere_puertas_adentro, orden) VALUES
  ('nana_puertas_afuera',  'Asesora del hogar (puertas afuera)', 'Aseo, cocina, cuidado niños sin pernoctar', false, 1),
  ('nana_puertas_adentro', 'Asesora del hogar (puertas adentro)','Reside en el hogar empleador', true,  2),
  ('cocinera',             'Cocinera',                           'Preparación de comidas',                         false, 3),
  ('ninera',               'Niñera',                             'Cuidado exclusivo de niños',                     false, 4),
  ('cuidadora_24_7',       'Cuidadora 24/7',                     'Cuidado permanente adulto mayor o paciente',     true,  5),
  ('asistente_adulto_mayor','Asistente adulto mayor',           'Acompañamiento y cuidados',                       false, 6),
  ('chofer',               'Chofer',                             'Conducción de vehículo familiar',                false, 7),
  ('jardinero',            'Jardinero',                          'Mantención de jardín',                           false, 8),
  ('mayordomo',            'Mayordomo',                          'Administración del hogar',                       true,  9),
  ('piscinero',            'Piscinero',                          'Mantención de piscina',                          false, 10),
  ('otro',                 'Otro',                               'Especificar en observaciones',                   false, 99)
ON CONFLICT (codigo) DO NOTHING;

-- ─── Tabla contratos_anexos (versionados) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contratos_anexos (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id     uuid        NOT NULL REFERENCES public.contratos(id) ON DELETE CASCADE,
  empleador_id    uuid        NOT NULL REFERENCES public.empleadores(id),
  trabajador_id   uuid        NOT NULL REFERENCES public.trabajadores(id),
  numero_anexo    integer     NOT NULL,                    -- secuencial por contrato (1, 2, 3...)
  fecha_anexo     date        NOT NULL DEFAULT CURRENT_DATE,
  motivo          text,                                    -- 'cambio_sueldo' | 'cambio_jornada' | 'cambio_cargo' | 'otro'
  cambios         jsonb       NOT NULL DEFAULT '{}',       -- { field: { antes: ..., despues: ... } }
  pdf_url         text,
  firmado         boolean     NOT NULL DEFAULT false,
  fecha_firma_empleador  timestamptz,
  fecha_firma_trabajador timestamptz,
  ip_firma_empleador     inet,
  ip_firma_trabajador    inet,
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contrato_id, numero_anexo)
);

CREATE INDEX IF NOT EXISTS idx_contratos_anexos_contrato
  ON public.contratos_anexos (contrato_id, numero_anexo);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.cat_cargos_tcp  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contratos_anexos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado_lee_cat_cargos"
  ON public.cat_cargos_tcp FOR SELECT TO authenticated USING (true);

CREATE POLICY "empleador_lee_anexos"
  ON public.contratos_anexos FOR SELECT
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_empleadores WHERE auth_user_id = auth.uid()
      UNION
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "empleador_inserta_anexos"
  ON public.contratos_anexos FOR INSERT
  WITH CHECK (
    empleador_id IN (
      SELECT empleador_id FROM public.user_empleadores WHERE auth_user_id = auth.uid()
      UNION
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "trabajador_lee_sus_anexos"
  ON public.contratos_anexos FOR SELECT
  USING (
    trabajador_id = public.get_my_trabajador_id()
  );

-- Update (firma trabajador en su propio anexo)
CREATE POLICY "trabajador_firma_su_anexo"
  ON public.contratos_anexos FOR UPDATE
  USING (trabajador_id = public.get_my_trabajador_id())
  WITH CHECK (trabajador_id = public.get_my_trabajador_id());
