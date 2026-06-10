// GET /api/contratos/[id]/anexos-list — lista anexos del contrato.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: anexos } = await supabase
    .from('contratos_anexos')
    .select('id, numero_anexo, fecha_anexo, motivo, cambios, pdf_url, fecha_firma_empleador, fecha_firma_trabajador')
    .eq('contrato_id', id)
    .order('numero_anexo');

  return NextResponse.json({ ok: true, anexos: anexos ?? [] });
}
