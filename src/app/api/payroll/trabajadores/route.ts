// GET /api/payroll/trabajadores — lista trabajadores activos del empleador
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: empleador } = await supabase
    .from('empleadores')
    .select('id')
    .eq('auth_user_id', user.id)
    .single();

  if (!empleador) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const { data, error } = await supabase
    .from('contratos')
    .select('trabajadores ( id, rut, nombre, apellido_paterno )')
    .eq('empleador_id', empleador.id)
    .eq('estado', 'activo');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const trabajadores = (data ?? [])
    .map((c: any) => c.trabajadores)
    .filter(Boolean);

  return NextResponse.json({ ok: true, data: trabajadores });
}
