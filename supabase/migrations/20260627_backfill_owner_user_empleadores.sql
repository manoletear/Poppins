-- Backfill: crear fila owner en user_empleadores para dueños legacy.
-- Los dueños legacy son propietarios de un registro en `empleadores` via auth_user_id
-- pero no tienen fila correspondiente en user_empleadores.
INSERT INTO public.user_empleadores (auth_user_id, empleador_id, rol, estado)
SELECT
  e.auth_user_id,
  e.id AS empleador_id,
  'owner'  AS rol,
  'activo' AS estado
FROM public.empleadores e
JOIN auth.users au ON au.id = e.auth_user_id
WHERE e.auth_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.user_empleadores ue
    WHERE ue.auth_user_id = e.auth_user_id
      AND ue.empleador_id = e.id
  )
ON CONFLICT (auth_user_id, empleador_id) DO NOTHING;
