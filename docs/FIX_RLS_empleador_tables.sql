-- Defensivo: garantiza que el EMPLEADOR pueda leer/escribir todas sus tablas.
-- Previene la clase de bug "guardé y no pasó nada" (RLS sin policy de insert),
-- como pasó con `trabajadores`. Aditivo: agrega una policy permisiva por tabla con
-- columna `empleador_id`; NO toca policies existentes (ej. acceso de la trabajadora),
-- porque las policies permisivas se combinan con OR. Idempotente. Correr en sczxy.

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_name = 'empleador_id'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS emp_owner_all ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY emp_owner_all ON public.%I FOR ALL TO authenticated '
      || 'USING (empleador_id = public.get_my_empleador_id()) '
      || 'WITH CHECK (empleador_id = public.get_my_empleador_id())', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
