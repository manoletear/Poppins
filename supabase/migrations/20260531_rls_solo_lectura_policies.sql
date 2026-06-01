-- Fase 3 (cont.) — Policies RLS de solo-lectura (defensa en profundidad).
--
-- Bloquea INSERT/UPDATE/DELETE del cliente cuando el empleador está en solo-lectura
-- (trial vencido sin suscripción / pausada), usando public.empleador_solo_lectura()
-- (definida en 20260530_solo_lectura_helper.sql — aplicar esa ANTES).
--
-- Seguro: NO toca SELECT (las lecturas siguen igual). NO habilita RLS (asume que ya
-- está habilitado por la migración de RLS del repo). Sólo aplica a tablas que
-- existen Y tienen columna `empleador_id`; el resto se saltea sin error. Idempotente.
-- Nota: service_role bypassa RLS, así que la API server-side sigue funcionando.

DO $$
DECLARE
  t text;
  tablas text[] := ARRAY[
    'contratos','pagos_empleador','solicitudes_empleado','trabajadores',
    'marcajes_horario','cuentas_pago','tareas','tareas_recurrentes',
    'mascotas_empleador','familiares_empleador','items_lista_compras',
    'listas_compras','recordatorios','anticipos','viviendas_empleador',
    'preferencias_trabajo','dias_libre_disposicion','beneficios_empleador',
    'comprobantes_pago'
  ];
BEGIN
  FOREACH t IN ARRAY tablas LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'empleador_id'
    ) THEN
      EXECUTE format('DROP POLICY IF EXISTS ro_block_insert ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS ro_block_update ON public.%I', t);
      EXECUTE format('DROP POLICY IF EXISTS ro_block_delete ON public.%I', t);
      EXECUTE format('CREATE POLICY ro_block_insert ON public.%I AS RESTRICTIVE FOR INSERT WITH CHECK (NOT public.empleador_solo_lectura(empleador_id))', t);
      EXECUTE format('CREATE POLICY ro_block_update ON public.%I AS RESTRICTIVE FOR UPDATE USING (NOT public.empleador_solo_lectura(empleador_id))', t);
      EXECUTE format('CREATE POLICY ro_block_delete ON public.%I AS RESTRICTIVE FOR DELETE USING (NOT public.empleador_solo_lectura(empleador_id))', t);
      RAISE NOTICE 'RLS solo-lectura aplicada a %', t;
    ELSE
      RAISE NOTICE 'Saltada % (no existe o sin empleador_id)', t;
    END IF;
  END LOOP;
END $$;
