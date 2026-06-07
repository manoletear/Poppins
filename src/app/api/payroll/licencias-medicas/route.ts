// GET  /api/payroll/licencias-medicas?period=YYYY-MM
// POST /api/payroll/licencias-medicas        { trabajador_id, periodo, tipo, fecha_inicio, fecha_fin, observacion }
// DELETE /api/payroll/licencias-medicas?id=uuid

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

async function getEmpleadorId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('empleadores')
    .select('id')
    .eq('auth_user_id', userId)
    .single();
  return data?.id as string | undefined;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await getEmpleadorId(supabase, user.id);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 400 });

  const { data, error } = await supabase
    .from('licencias_medicas')
    .select(`
      id, trabajador_id, periodo, tipo, fecha_inicio, fecha_fin, observacion,
      trabajadores ( nombre, apellido_paterno, rut )
    `)
    .eq('empleador_id', empleadorId)
    .eq('periodo', period)
    .order('fecha_inicio');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Calcular días en JS ya que la columna es nullable
  const enriched = (data ?? []).map((lic: any) => ({
    ...lic,
    dias: lic.fecha_inicio && lic.fecha_fin
      ? Math.round((new Date(lic.fecha_fin).getTime() - new Date(lic.fecha_inicio).getTime()) / 86400000) + 1
      : null,
  }));

  return NextResponse.json({ ok: true, data: enriched });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await getEmpleadorId(supabase, user.id);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const body = await request.json();
  const { trabajador_id, periodo, tipo, fecha_inicio, fecha_fin, observacion } = body;

  if (!trabajador_id || !periodo || !fecha_inicio || !fecha_fin) {
    return NextResponse.json({ ok: false, error: 'campos_requeridos' }, { status: 400 });
  }

  const dias = Math.round((new Date(fecha_fin).getTime() - new Date(fecha_inicio).getTime()) / 86400000) + 1;

  const { data, error } = await supabase
    .from('licencias_medicas')
    .insert({
      empleador_id: empleadorId,
      trabajador_id,
      periodo,
      tipo: tipo ?? 'MEDICA',
      fecha_inicio,
      fecha_fin,
      // also fill legacy columns so existing code stays compatible
      fecha_desde: fecha_inicio,
      fecha_hasta: fecha_fin,
      dias_totales: dias,
      observacion,
    })
    .select('id, fecha_inicio, fecha_fin')
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: { ...data, dias } });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await getEmpleadorId(supabase, user.id);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });

  const { error } = await supabase
    .from('licencias_medicas')
    .delete()
    .eq('id', id)
    .eq('empleador_id', empleadorId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
