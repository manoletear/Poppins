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
