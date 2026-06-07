-- Extiende la tabla licencias_medicas existente (importada desde Buk)
-- con campos necesarios para el módulo de remuneraciones.
alter table licencias_medicas
  add column if not exists empleador_id  uuid references empleadores(id) on delete cascade,
  add column if not exists periodo       char(7),
  add column if not exists fecha_inicio  date,
  add column if not exists fecha_fin     date,
  add column if not exists observacion   text;

-- Índice para consultas por empleador + período
create index if not exists licencias_medicas_empleador_periodo
  on licencias_medicas(empleador_id, periodo)
  where empleador_id is not null;

-- RLS: política para que empleadores vean solo sus propias licencias
-- (solo si no existe ya una política con este nombre)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'licencias_medicas'
      and policyname = 'empleador_own_licencias'
  ) then
    execute $pol$
      create policy "empleador_own_licencias" on licencias_medicas
        for all
        using (
          empleador_id in (
            select id from empleadores where auth_user_id = auth.uid()
          )
        )
    $pol$;
  end if;
end;
$$;

-- Asegurar RLS habilitado
alter table licencias_medicas enable row level security;
