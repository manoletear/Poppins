// GET /api/catalogos/cargos-tcp — lista cargos TCP del catálogo.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data } = await supabase
    .from('cat_cargos_tcp')
    .select('codigo, nombre, descripcion, requiere_puertas_adentro')
    .eq('activo', true)
    .order('orden');
  return NextResponse.json({ ok: true, cargos: data ?? [] });
}
