import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const contratoId = request.nextUrl.searchParams.get('contrato_id');

  if (!contratoId) {
    return NextResponse.json({ error: 'contrato_id requerido' }, { status: 400 });
  }

  const { data } = await supabase
    .from('contratos_servicio')
    .select('estado, pago_estado')
    .eq('id', contratoId)
    .single();

  if (!data) {
    return NextResponse.json({ paid: false, error: 'Contrato no encontrado' });
  }

  return NextResponse.json({
    paid: data.pago_estado === 'pagado',
    estado: data.estado,
  });
}
