// GET /api/payroll/catalogos
// Catálogos previsionales para selects en UI (AFP, Isapre, CCAF).
// Lectura pública para usuarios autenticados.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const [{ data: afps }, { data: isapres }, { data: ccafs }] = await Promise.all([
    supabase.from('cat_afp').select('id, codigo, activa').order('codigo'),
    supabase.from('cat_isapre').select('id, codigo, tipo, activa').order('codigo'),
    supabase.from('cat_ccaf').select('id, codigo, nombre, codigo_previred, activa').order('id'),
  ]);

  return NextResponse.json({
    ok: true,
    afps:    afps ?? [],
    isapres: isapres ?? [],
    ccafs:   ccafs ?? [],
  });
}
