-- Novedades variables del período: haberes, descuentos y eventos por trabajador
create table if not exists payroll_novedades (
  id            uuid primary key default gen_random_uuid(),
  empleador_id  uuid not null references empleadores(id) on delete cascade,
  periodo       text not null,   -- YYYY-MM
  trabajador_id uuid not null references trabajadores(id) on delete cascade,
  concept_code  text not null,   -- HaberCode | DescuentoCode | _DIAS_TRABAJADOS | _HORAS_EXTRA | _DIAS_AUSENCIA | _DIAS_VACACIONES
  amount        numeric(14,2) not null default 0,
  description   text,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id)
);

create index if not exists idx_payroll_novedades_periodo
  on payroll_novedades(empleador_id, periodo);

create index if not exists idx_payroll_novedades_trabajador
  on payroll_novedades(empleador_id, periodo, trabajador_id);

-- Un solo registro por combinación empleador+periodo+trabajador+concept
create unique index if not exists idx_payroll_novedades_unique
  on payroll_novedades(empleador_id, periodo, trabajador_id, concept_code);
