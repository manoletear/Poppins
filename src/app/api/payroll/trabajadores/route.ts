// GET /api/payroll/trabajadores — lista trabajadores activos con datos de contrato
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('user_profiles').select('empleador_id').eq('auth_user_id', user.id).maybeSingle();
  let empleadorId = perfil?.empleador_id as string | undefined;
  if (!empleadorId) {
    const { data: emp } = await supabase
      .from('empleadores').select('id').eq('auth_user_id', user.id).maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const { data, error } = await supabase
    .from('contratos')
    .select('id, sueldo_base, horas_semanales, trabajadores ( id, rut, nombre, apellido_paterno )')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const trabajadores = (data ?? [])
    .map((c: any) => ({
      contrato_id:     c.id,
      sueldo_base:     c.sueldo_base,
      horas_semanales: c.horas_semanales,
      ...(c.trabajadores ?? {}),
    }))
    .filter((t: any) => t.id);

  return NextResponse.json({ ok: true, data: trabajadores });
}
