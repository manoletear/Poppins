-- Portal del trabajador: políticas RLS para que el trabajador vea SOLO sus
-- propias liquidaciones (payroll_results) y conceptos (payroll_concept_results).
-- Auto-uso: vista /portal/liquidaciones + descarga PDF desde el endpoint
-- /api/portal/liquidacion-pdf.

-- payroll_results: el trabajador ve los resultados donde worker_id = su trabajador_id
CREATE POLICY "worker_lee_payroll_results"
  ON public.payroll_results FOR SELECT
  USING (
    worker_id = public.get_my_trabajador_id()
  );

-- payroll_concept_results: el trabajador ve los conceptos de sus liquidaciones
CREATE POLICY "worker_lee_payroll_concepts"
  ON public.payroll_concept_results FOR SELECT
  USING (
    payroll_result_id IN (
      SELECT id FROM public.payroll_results
      WHERE worker_id = public.get_my_trabajador_id()
    )
  );

-- contratos: el trabajador ve su propio contrato (necesario para PDF liquidación)
CREATE POLICY "worker_lee_su_contrato"
  ON public.contratos FOR SELECT
  USING (
    trabajador_id = public.get_my_trabajador_id()
  );

-- trabajadores: el trabajador ve su propio registro
CREATE POLICY "worker_lee_su_trabajador"
  ON public.trabajadores FOR SELECT
  USING (
    id = public.get_my_trabajador_id()
  );

-- empleadores: el trabajador ve a su empleador (para encabezado de PDF)
CREATE POLICY "worker_lee_su_empleador"
  ON public.empleadores FOR SELECT
  USING (
    id IN (
      SELECT empleador_id FROM public.contratos
      WHERE trabajador_id = public.get_my_trabajador_id()
    )
  );
