-- Validación AFP/Isapre vigente (plan remuneraciones 2026, item #2)
--
-- Objetivo: bloquear el cálculo de liquidaciones si los datos previsionales
-- del trabajador son inválidos (institución de-listada, plan UF faltante en
-- Isapre, sincronización Buk vencida).

-- ─── Catálogo AFP ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cat_afp (
  id              integer     PRIMARY KEY,
  codigo          text        UNIQUE NOT NULL,
  nombre          text        NOT NULL,
  activa          boolean     NOT NULL DEFAULT true,
  vigente_desde   date        NOT NULL DEFAULT '2009-01-01',
  vigente_hasta   date,
  comision_pct    numeric(5,2),
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.cat_afp (id, codigo, nombre, comision_pct) VALUES
  (1, 'capital',   'AFP Capital',   1.44),
  (2, 'cuprum',    'AFP Cuprum',    1.44),
  (3, 'habitat',   'AFP Habitat',   1.27),
  (4, 'modelo',    'AFP Modelo',    0.58),
  (5, 'planvital', 'AFP PlanVital', 1.16),
  (6, 'provida',   'AFP Provida',   1.45),
  (7, 'uno',       'AFP Uno',       0.49)
ON CONFLICT (id) DO UPDATE
  SET nombre       = EXCLUDED.nombre,
      comision_pct = EXCLUDED.comision_pct,
      activa       = true;

-- ─── Catálogo Salud (Isapre + Fonasa) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cat_isapre (
  id              integer     PRIMARY KEY,
  codigo          text        UNIQUE NOT NULL,
  nombre          text        NOT NULL,
  tipo            text        NOT NULL CHECK (tipo IN ('fonasa','isapre')),
  activa          boolean     NOT NULL DEFAULT true,
  vigente_desde   date        NOT NULL DEFAULT '2009-01-01',
  vigente_hasta   date,
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.cat_isapre (id, codigo, nombre, tipo) VALUES
  (8,  'banmedica',     'Banmédica',      'isapre'),
  (9,  'colmena',       'Colmena',        'isapre'),
  (10, 'consalud',      'Consalud',       'isapre'),
  (11, 'cruzblanca',    'Cruz Blanca',    'isapre'),
  (12, 'nuevamasvida',  'Nueva Masvida',  'isapre'),
  (13, 'fonasa',        'Fonasa',         'fonasa'),
  (32, 'vidatres',      'Vida Tres',      'isapre'),
  (33, 'esencial',      'Esencial',       'isapre')
ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre,
      tipo   = EXCLUDED.tipo,
      activa = true;

-- ─── Columnas previsionales en trabajadores ──────────────────────────────────
ALTER TABLE public.trabajadores
  ADD COLUMN IF NOT EXISTS salud_plan_uf            numeric(6,2),
  ADD COLUMN IF NOT EXISTS prevision_verificada_at  timestamptz,
  ADD COLUMN IF NOT EXISTS prevision_estado         text NOT NULL DEFAULT 'pendiente'
    CHECK (prevision_estado IN ('vigente','pendiente','invalida'));

-- ─── Fecha de término de contrato (necesaria para bloquear liquidación post-término)
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS fecha_termino date;

CREATE INDEX IF NOT EXISTS idx_trabajadores_prevision_estado
  ON public.trabajadores (prevision_estado);

-- ─── FKs blandas a catálogos (no enforced para no romper data existente) ─────
-- Validación se hace en la app vía src/lib/payroll-cl/validacion-prevision.ts

-- ─── RLS catálogos: lectura pública (autenticado) ────────────────────────────
ALTER TABLE public.cat_afp    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cat_isapre ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado_lee_cat_afp"
  ON public.cat_afp FOR SELECT TO authenticated USING (true);

CREATE POLICY "autenticado_lee_cat_isapre"
  ON public.cat_isapre FOR SELECT TO authenticated USING (true);
-- CCAF (Caja de Compensación) — plan remuneraciones 2026, item #3
--
-- Ley 18.833: empleador puede afiliarse voluntariamente a una CCAF.
-- Aporte empleador: 0.6% del imponible mensual (adicional al 7% salud).
-- Descuentos trabajador: créditos sociales y beneficios voluntarios (dental,
-- leasing, seguro de vida, otros) que el empleador retiene de la liquidación.

-- ─── Catálogo CCAF activas ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.cat_ccaf (
  id              integer     PRIMARY KEY,
  codigo_previred text        UNIQUE NOT NULL,   -- '01','02','03'
  codigo          text        UNIQUE NOT NULL,
  nombre          text        NOT NULL,
  activa          boolean     NOT NULL DEFAULT true,
  aporte_pct      numeric(5,4) NOT NULL DEFAULT 0.006,  -- 0.6%
  created_at      timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.cat_ccaf (id, codigo_previred, codigo, nombre) VALUES
  (1, '01', 'losandes',   'Los Andes'),
  (2, '02', 'laaraucana', 'La Araucana'),
  (3, '03', 'losheroes',  'Los Héroes')
ON CONFLICT (id) DO UPDATE
  SET nombre = EXCLUDED.nombre, activa = true;

-- ─── Afiliación del empleador a CCAF ────────────────────────────────────────
ALTER TABLE public.empleadores
  ADD COLUMN IF NOT EXISTS ccaf_id              integer REFERENCES public.cat_ccaf(id),
  ADD COLUMN IF NOT EXISTS ccaf_afiliado_desde  date;

-- ─── Descuentos CCAF por trabajador y período ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.descuentos_ccaf (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id    uuid        NOT NULL REFERENCES public.empleadores(id),
  trabajador_id   uuid        NOT NULL REFERENCES public.trabajadores(id),
  periodo         text        NOT NULL CHECK (periodo ~ '^\d{4}-\d{2}$'),
  tipo            text        NOT NULL CHECK (tipo IN ('credito','dental','leasing','seguro_vida','otro')),
  monto           integer     NOT NULL CHECK (monto >= 0),
  descripcion     text,
  created_by      uuid        REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_descuentos_ccaf_periodo
  ON public.descuentos_ccaf (empleador_id, periodo);

-- ─── RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.cat_ccaf         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.descuentos_ccaf  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "autenticado_lee_cat_ccaf"
  ON public.cat_ccaf FOR SELECT TO authenticated USING (true);

CREATE POLICY "empleador_lee_descuentos_ccaf"
  ON public.descuentos_ccaf FOR SELECT
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "empleador_inserta_descuentos_ccaf"
  ON public.descuentos_ccaf FOR INSERT
  WITH CHECK (
    empleador_id IN (
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "empleador_borra_descuentos_ccaf"
  ON public.descuentos_ccaf FOR DELETE
  USING (
    empleador_id IN (
      SELECT empleador_id FROM public.user_profiles WHERE auth_user_id = auth.uid()
      UNION
      SELECT id FROM public.empleadores WHERE auth_user_id = auth.uid()
    )
  );

-- ─── Columnas CCAF en payroll_results (para Previred y reportes) ────────────
ALTER TABLE public.payroll_results
  ADD COLUMN IF NOT EXISTS contribution_ccaf      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS deduction_ccaf         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ccaf_codigo_previred   text;
