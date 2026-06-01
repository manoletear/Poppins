-- ════════════════════════════════════════════════════════════════════════
-- FIX CRÍTICO: GRANTs faltantes en sczxy para los roles de la API de Supabase.
-- Síntoma: service_role daba "42501 permission denied" en las tablas de `public`
-- (y anon en algunas como regiones_chile). El backend (APIs/webhooks/cron) no podía
-- leer/escribir. Esto restaura los grants estándar de un proyecto Supabase.
-- Correr en: Supabase de sczxy → SQL Editor → Run. Idempotente.
-- La seguridad sigue dependiendo de RLS (ya habilitado); estos grants son el
-- nivel de privilegio de tabla que RLS luego filtra. service_role bypassa RLS.
-- ════════════════════════════════════════════════════════════════════════

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- service_role: backend, acceso total (bypassa RLS)
GRANT ALL PRIVILEGES ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- authenticated (usuarios logueados): CRUD; RLS filtra por fila
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- anon (público): lectura; RLS filtra. (Estándar Supabase; ajustar si se desea menos)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Tablas/secuencias/funciones FUTURAS también quedan grantadas
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL PRIVILEGES ON FUNCTIONS TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, anon;

-- Refrescar el cache de PostgREST
NOTIFY pgrst, 'reload schema';
