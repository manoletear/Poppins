-- Extiende user_empleadores para soportar invitaciones familiares con permisos por sección.
--
-- etiqueta: relación familiar que el owner asigna (ej. "Cónyuge", "Hijo")
-- apodo:    nombre que el propio miembro elige para mostrarse dentro del hogar
-- permisos: JSON con secciones habilitadas { inicio, vivienda, familia, ... }
-- estado:   'pendiente' mientras el invite no fue aceptado, 'activo' al activar
-- invitacion_email: email al que se envió la invitación (puede diferir del email final)

ALTER TABLE public.user_empleadores
  ADD COLUMN IF NOT EXISTS etiqueta         text,
  ADD COLUMN IF NOT EXISTS apodo            text,
  ADD COLUMN IF NOT EXISTS permisos         jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estado           text NOT NULL DEFAULT 'activo'
    CHECK (estado IN ('pendiente', 'activo')),
  ADD COLUMN IF NOT EXISTS invitacion_email text;

-- Marcar owners existentes como activos (ya lo son, solo por consistencia)
UPDATE public.user_empleadores SET estado = 'activo' WHERE estado = 'activo';

-- Índice para buscar invitaciones pendientes por email
CREATE INDEX IF NOT EXISTS idx_user_empleadores_inv_email
  ON public.user_empleadores (invitacion_email)
  WHERE estado = 'pendiente';

-- Policy: miembro puede actualizar su propio apodo en sus filas
CREATE POLICY "miembro_actualiza_apodo"
  ON public.user_empleadores FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

-- Policy: owner puede actualizar etiqueta, permisos, estado de sus miembros
CREATE POLICY "owner_actualiza_miembros"
  ON public.user_empleadores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_empleadores ue
       WHERE ue.auth_user_id = auth.uid()
         AND ue.empleador_id = user_empleadores.empleador_id
         AND ue.rol = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_empleadores ue
       WHERE ue.auth_user_id = auth.uid()
         AND ue.empleador_id = user_empleadores.empleador_id
         AND ue.rol = 'owner'
    )
  );
