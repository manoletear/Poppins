-- Horario esperado por trabajador (base para recordatorios de marcaje vía WhatsApp).
--
-- Un registro por (trabajador, día de semana) con la hora de entrada/salida esperada.
-- El cron de recordatorios compara la hora actual contra estos turnos para saber a
-- quién avisar que debe marcar. Lo edita el empleador en la ficha del trabajador.

CREATE TABLE IF NOT EXISTS public.turnos_trabajador (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  empleador_id  uuid NOT NULL REFERENCES empleadores(id) ON DELETE CASCADE,
  trabajador_id uuid NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  dia_semana    smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7), -- 1=lunes .. 7=domingo
  hora_entrada  time,
  hora_salida   time,
  activo        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trabajador_id, dia_semana)
);

CREATE INDEX IF NOT EXISTS idx_turnos_trabajador_empleador ON public.turnos_trabajador(empleador_id);
CREATE INDEX IF NOT EXISTS idx_turnos_trabajador_trabajador ON public.turnos_trabajador(trabajador_id);

ALTER TABLE public.turnos_trabajador ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_turnos" ON public.turnos_trabajador FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_profiles WHERE auth_user_id = auth.uid() AND rol = 'admin'));
CREATE POLICY "employer_turnos" ON public.turnos_trabajador FOR ALL TO authenticated
  USING (empleador_id IN (SELECT id FROM empleadores WHERE auth_user_id = auth.uid()));
CREATE POLICY "worker_turnos_select" ON public.turnos_trabajador FOR SELECT TO authenticated
  USING (trabajador_id IN (SELECT trabajador_id FROM user_profiles WHERE auth_user_id = auth.uid() AND trabajador_id IS NOT NULL));
