// GET /api/portal/mi-contrato — devuelve el contrato activo del trabajador
// (con campos de firma) + lista de anexos.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles').select('trabajador_id').eq('auth_user_id', user.id).maybeSingle();
  if (!profile?.trabajador_id) return NextResponse.json({ ok: false, error: 'sin_trabajador' }, { status: 403 });

  const { data: contrato } = await supabase
    .from('contratos')
    .select(`
      id, sueldo_base, horas_semanales, cargo, tipo_contrato,
      fecha_inicio, fecha_termino, puertas_adentro, lugar_servicios,
      pdf_url, fecha_firma_empleador, fecha_firma_trabajador, estado
    `)
    .eq('trabajador_id', profile.trabajador_id)
    .eq('estado', 'activo')
    .maybeSingle();

  if (!contrato) return NextResponse.json({ ok: false, error: 'sin_contrato_activo' }, { status: 404 });

  const { data: anexos } = await supabase
    .from('contratos_anexos')
    .select('id, numero_anexo, fecha_anexo, motivo, cambios, pdf_url, fecha_firma_empleador, fecha_firma_trabajador')
    .eq('contrato_id', contrato.id)
    .order('numero_anexo');

  return NextResponse.json({ ok: true, contrato, anexos: anexos ?? [] });
}
