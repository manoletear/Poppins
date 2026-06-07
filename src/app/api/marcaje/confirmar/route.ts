import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppTemplate } from '@/lib/notificaciones/whatsapp';

export const runtime = 'nodejs';

const TEMPLATE = process.env.WHATSAPP_TEMPLATE_CONFIRMACION_MARCAJE || 'confirmacion_marcaje';
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'es';

const TIPO_LABELS: Record<string, string> = {
  entrada:          'Entrada registrada',
  salida_colacion:  'Salida a colación',
  regreso_colacion: 'Regreso de colación',
  salida:           'Salida registrada',
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { trabajadorId, hora, tipo } = body ?? {};
  if (!trabajadorId || !hora || !tipo) {
    return NextResponse.json({ ok: false, error: 'campos_requeridos_faltantes' }, { status: 422 });
  }

  // Leer nombre y teléfono del trabajador
  const { data: trab } = await supabase
    .from('trabajadores')
    .select('nombre, apellido_paterno, telefono')
    .eq('id', trabajadorId)
    .maybeSingle();

  if (!trab) return NextResponse.json({ ok: false, error: 'trabajador_no_encontrado' }, { status: 404 });

  const nombre = [trab.nombre, trab.apellido_paterno].filter(Boolean).join(' ');
  const accion = TIPO_LABELS[tipo] ?? tipo;

  // params: {{1}}=nombre, {{2}}=acción, {{3}}=hora
  const result = await sendWhatsAppTemplate({
    to: trab.telefono,
    template: TEMPLATE,
    lang: TEMPLATE_LANG,
    params: [nombre, accion, hora],
  });

  return NextResponse.json({ ok: result.ok, simulated: result.simulated ?? false });
}
