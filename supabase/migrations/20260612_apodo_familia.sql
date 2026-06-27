-- Apodo opcional para familiares y mascotas.
-- Si está set, tiene prioridad sobre nombre en UI y comunicaciones.
ALTER TABLE public.familiares_empleador
  ADD COLUMN IF NOT EXISTS apodo text;

ALTER TABLE public.mascotas_empleador
  ADD COLUMN IF NOT EXISTS apodo text;
