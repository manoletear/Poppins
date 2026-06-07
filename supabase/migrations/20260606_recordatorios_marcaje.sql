-- Log anti-duplicado de recordatorios de marcaje (Fase 2).
--
-- El cron (/api/cron/recordatorio-marcaje) inserta una fila por (trabajador, fecha,
-- tipo) la primera vez que avisa ese día → el UNIQUE evita reenviar. Acceso solo
-- service-role (RLS habilitado sin políticas); el servidor escribe vía createServiceClient.

CREATE TABLE IF NOT EXISTS public.recordatorios_marcaje (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trabajador_id uuid NOT NULL REFERENCES trabajadores(id) ON DELETE CASCADE,
  fecha         date NOT NULL,
  tipo          text NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  estado        text NOT NULL DEFAULT 'enviado', -- enviado | simulado | error
  detalle       text,
  enviado_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (trabajador_id, fecha, tipo)
);

CREATE INDEX IF NOT EXISTS idx_recordatorios_marcaje_fecha ON public.recordatorios_marcaje(fecha);

ALTER TABLE public.recordatorios_marcaje ENABLE ROW LEVEL SECURITY;
-- Sin políticas: solo el service role accede.
