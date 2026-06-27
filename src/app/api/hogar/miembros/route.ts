import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

function makeSupabase(request: NextRequest, cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cs) => cs.forEach((c) => cookiesToSet.push(c as typeof cookiesToSet[number])),
      },
    }
  );
}

// GET /api/hogar/miembros — lista de miembros del hogar activo
export async function GET(request: NextRequest) {
  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const supabase = makeSupabase(request, cookiesToSet);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ error: 'Sin hogar activo' }, { status: 403 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: miembros, error } = await svc
    .from('user_empleadores')
    .select('auth_user_id, empleador_id, rol, etiqueta, apodo, permisos, estado, invitacion_email, created_at')
    .eq('empleador_id', empleadorId)
    .order('created_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich with user_profiles (no FK exists, so we join manually)
  const rows = miembros ?? [];
  const userIds = rows.map((m) => m.auth_user_id);
  const { data: profiles } = userIds.length
    ? await svc.from('user_profiles').select('auth_user_id, nombre, apellido, email, avatar_url').in('auth_user_id', userIds)
    : { data: [] as { auth_user_id: string; nombre?: string; apellido?: string; email?: string; avatar_url?: string }[] };

  const profileMap: Record<string, unknown> = Object.fromEntries(
    (profiles ?? []).map((p) => [p.auth_user_id, p])
  );

  const enriched = rows.map((m) => ({ ...m, user_profiles: profileMap[m.auth_user_id] ?? null }));

  const currentUserRol = rows.find((m) => m.auth_user_id === user.id)?.rol ?? null;

  const res = NextResponse.json({ miembros: enriched, currentUserRol });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}

// DELETE /api/hogar/miembros?auth_user_id=xxx — remover miembro (owner only)
export async function DELETE(request: NextRequest) {
  const targetUserId = new URL(request.url).searchParams.get('auth_user_id');
  if (!targetUserId) return NextResponse.json({ error: 'auth_user_id requerido' }, { status: 400 });

  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const supabase = makeSupabase(request, cookiesToSet);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ error: 'Sin hogar activo' }, { status: 403 });

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: membership } = await svc
    .from('user_empleadores')
    .select('rol')
    .eq('auth_user_id', user.id)
    .eq('empleador_id', empleadorId)
    .maybeSingle();

  if (membership?.rol !== 'owner') {
    return NextResponse.json({ error: 'Solo el owner puede remover miembros' }, { status: 403 });
  }
  if (targetUserId === user.id) {
    return NextResponse.json({ error: 'No puedes removerte a ti mismo' }, { status: 400 });
  }

  const { error } = await svc
    .from('user_empleadores')
    .delete()
    .eq('auth_user_id', targetUserId)
    .eq('empleador_id', empleadorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}

// PATCH /api/hogar/miembros — actualizar etiqueta/permisos (owner) o apodo (propio)
export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body?.auth_user_id) return NextResponse.json({ error: 'auth_user_id requerido' }, { status: 400 });

  const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = [];
  const supabase = makeSupabase(request, cookiesToSet);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ error: 'Sin hogar activo' }, { status: 403 });

  const { data: myMembership } = await supabase
    .from('user_empleadores')
    .select('rol')
    .eq('auth_user_id', user.id)
    .eq('empleador_id', empleadorId)
    .maybeSingle();

  const isOwner = myMembership?.rol === 'owner';
  const isSelf = body.auth_user_id === user.id;

  if (!isOwner && !isSelf) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
  }

  const updates: Record<string, unknown> = {};

  // Owner puede cambiar etiqueta y permisos
  if (isOwner) {
    if (body.etiqueta !== undefined) updates.etiqueta = body.etiqueta;
    if (body.permisos !== undefined) updates.permisos = body.permisos;
  }

  // Cada uno puede cambiar su propio apodo
  if (isSelf && body.apodo !== undefined) {
    updates.apodo = body.apodo;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 });
  }

  const svc = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await svc
    .from('user_empleadores')
    .update(updates)
    .eq('auth_user_id', body.auth_user_id)
    .eq('empleador_id', empleadorId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
  return res;
}
