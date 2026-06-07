import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendWhatsAppTemplate } from '@/lib/notificaciones/whatsapp';

export const runtime = 'nodejs';

// Plantilla WhatsApp (debe existir aprobada en Meta). Params: {{1}}=nombre, {{2}}=entrada|salida.
const TEMPLATE = process.env.WHATSAPP_TEMPLATE_MARCAJE || 'recordatorio_marcaje';
const TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || 'es';
const GRACE_MIN = 10;   // esperar N min tras la hora antes de recordar
const MAX_LATE_MIN = 180; // no recordar si ya pasó demasiado (turno viejo)

const toMin = (s?: string | null): number | null => {
  if (!s || !/^\d{1,2}:\d{2}/.test(s)) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

/** Hora local de Chile: { fecha 'YYYY-MM-DD', minutos del día, dia_semana 1=Lun..7=Dom }. */
function ahoraChile() {
  const now = new Date();
  const local = new Date(now.toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  const fecha = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(now); // YYYY-MM-DD
  const minutos = local.getHours() * 60 + local.getMinutes();
  const diaSemana = ((local.getDay() + 6) % 7) + 1; // getDay 0=Dom -> 7 ; 1=Lun -> 1
  return { fecha, minutos, diaSemana };
}

async function handle(request: Request) {
  // Auth: header compartido con el scheduler (pg_cron/pg_net o Cloudflare cron).
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'cron_secret_no_configurado' }, { status: 503 });
  const got = request.headers.get('x-cron-secret') || new URL(request.url).searchParams.get('secret');
  if (got !== secret) return NextResponse.json({ ok: false, error: 'no_autorizado' }, { status: 401 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'supabase_no_configurado' }, { status: 503 });
  const svc = createServiceClient(url, key);

  const { fecha, minutos, diaSemana } = ahoraChile();

  // Turnos activos para hoy.
  const { data: turnos } = await svc.from('turnos_trabajador')
    .select('trabajador_id, hora_entrada, hora_salida')
    .eq('dia_semana', diaSemana).eq('activo', true);
  if (!turnos || turnos.length === 0) return NextResponse.json({ ok: true, fecha, revisados: 0, enviados: 0 });

  const enVentana = (hora?: string | null) => {
    const m = toMin(hora);
    return m !== null && minutos >= m + GRACE_MIN && minutos <= m + MAX_LATE_MIN;
  };

  // Pendientes según ventana horaria.
  type Pend = { trabajador_id: string; tipo: 'entrada' | 'salida' };
  const pend: Pend[] = [];
  for (const t of turnos as any[]) {
    if (enVentana(t.hora_entrada)) pend.push({ trabajador_id: t.trabajador_id, tipo: 'entrada' });
    if (enVentana(t.hora_salida)) pend.push({ trabajador_id: t.trabajador_id, tipo: 'salida' });
  }
  if (pend.length === 0) return NextResponse.json({ ok: true, fecha, revisados: turnos.length, enviados: 0 });

  const ids = [...new Set(pend.map(p => p.trabajador_id))];

  // Marcajes de hoy + recordatorios ya enviados hoy + datos de contacto, en paralelo.
  const [marcRes, recRes, trabRes] = await Promise.all([
    svc.from('marcajes_horario').select('trabajador_id, hora_entrada, hora_salida').eq('fecha', fecha).in('trabajador_id', ids),
    svc.from('recordatorios_marcaje').select('trabajador_id, tipo').eq('fecha', fecha).in('trabajador_id', ids),
    svc.from('trabajadores').select('id, nombre, apellido_paterno, telefono').in('id', ids),
  ]);
  const marc = (marcRes.data || []) as any[];
  const yaRecordado = new Set((recRes.data || []).map((r: any) => `${r.trabajador_id}:${r.tipo}`));
  const trab = new Map((trabRes.data || []).map((t: any) => [t.id, t]));

  const marcoEntrada = (id: string) => marc.some(m => m.trabajador_id === id && m.hora_entrada);
  const marcoSalida = (id: string) => marc.some(m => m.trabajador_id === id && m.hora_salida);

  let enviados = 0, simulados = 0, errores = 0;
  for (const p of pend) {
    if (yaRecordado.has(`${p.trabajador_id}:${p.tipo}`)) continue;       // ya se le avisó hoy
    if (p.tipo === 'entrada' && marcoEntrada(p.trabajador_id)) continue; // ya marcó
    if (p.tipo === 'salida' && marcoSalida(p.trabajador_id)) continue;

    const t = trab.get(p.trabajador_id);
    if (!t) continue;
    const nombre = String(t.nombre || '').split(' ')[0] || 'Hola';
    const res = await sendWhatsAppTemplate({
      to: t.telefono, template: TEMPLATE, lang: TEMPLATE_LANG, params: [nombre, p.tipo],
    });
    const estado = res.simulated ? 'simulado' : res.ok ? 'enviado' : 'error';
    if (estado === 'enviado') enviados++; else if (estado === 'simulado') simulados++; else errores++;
    await svc.from('recordatorios_marcaje').upsert(
      { trabajador_id: p.trabajador_id, fecha, tipo: p.tipo, estado, detalle: res.error || null },
      { onConflict: 'trabajador_id,fecha,tipo' },
    );
  }

  return NextResponse.json({ ok: true, fecha, revisados: turnos.length, pendientes: pend.length, enviados, simulados, errores });
}

export async function POST(request: Request) { return handle(request); }
export async function GET(request: Request) { return handle(request); }
