-- Seed de validación de planes (Pro / Pro+ / solo-lectura).
-- NOTA: STARTER no necesita seed — cualquier cuenta recién registrada se trata
-- como Starter en trial (ver /api/suscripcion/estado). Este seed es para validar
-- los estados Pro / Pro+ / solo-lectura.
--
-- USO:
--   1) Registrá (o creá en Auth → Add user, auto-confirm) estos 3 emails con una
--      contraseña conocida:
--        pro@poppins.test · proplus@poppins.test · vencido@poppins.test
--   2) Corré este SQL en el SQL Editor de Supabase (proyecto del FRONT).
--      Vincula cada usuario a un empleador + suscripción según el caso.
--
-- Si tu tabla `empleadores` tiene columnas NOT NULL adicionales del schema base,
-- agregálas al INSERT (acá usamos el set mínimo: auth_user_id, nombre, email, plan_tipo).

do $$
declare
  r record;
  v_emp uuid;
  cfg jsonb := '[
    {"email":"pro@poppins.test",     "plan":"pro",      "estado":"activa",  "trial_off": 5},
    {"email":"proplus@poppins.test", "plan":"pro_plus", "estado":"activa",  "trial_off": 5},
    {"email":"vencido@poppins.test", "plan":"starter",  "estado":"pausada", "trial_off": 40}
  ]'::jsonb;
  item jsonb;
begin
  for item in select * from jsonb_array_elements(cfg)
  loop
    -- usuario auth + perfil (deben existir; los crea el registro/Dashboard)
    select up.auth_user_id, up.empleador_id into r
    from user_profiles up
    where up.email = (item->>'email')
    limit 1;

    if r.auth_user_id is null then
      raise notice 'Sin usuario para %, salteado (registralo primero).', item->>'email';
      continue;
    end if;

    -- empleador (crea si no existe) y lo deja como empleador del perfil
    v_emp := r.empleador_id;
    if v_emp is null then
      insert into empleadores (auth_user_id, nombre, email, plan_tipo)
      values (r.auth_user_id, split_part(item->>'email','@',1), item->>'email', item->>'plan')
      returning id into v_emp;
      update user_profiles set empleador_id = v_emp, rol = 'empleador'
      where auth_user_id = r.auth_user_id;
    else
      update empleadores set plan_tipo = item->>'plan' where id = v_emp;
    end if;

    -- "envejecemos" el alta para simular trial vigente/vencido
    update empleadores set created_at = now() - ((item->>'trial_off')::int || ' days')::interval
    where id = v_emp;

    -- suscripción (activa para pro/pro_plus; pausada para el vencido)
    insert into suscripciones (empleador_id, plan, plan_tipo, ciclo, estado, monto_mensual,
                               trial_inicio, trial_fin, fecha_primer_cobro, fecha_proximo_cobro,
                               camino, cobros_realizados)
    values (v_emp, 'poppins', item->>'plan', 'mensual', item->>'estado',
            case item->>'plan' when 'pro' then 19990 when 'pro_plus' then 24990 else 0 end,
            (now() - ((item->>'trial_off')::int || ' days')::interval)::date,
            (now() - ((item->>'trial_off')::int || ' days')::interval + interval '30 days')::date,
            (current_date + 30), (current_date + 30), 'B_post_trial', 0)
    on conflict (empleador_id) do update
      set plan_tipo = excluded.plan_tipo, estado = excluded.estado,
          monto_mensual = excluded.monto_mensual;
  end loop;
end $$;
