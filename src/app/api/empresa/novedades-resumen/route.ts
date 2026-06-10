// GET /api/empresa/novedades-resumen?period=YYYY-MM
// Resumen de eventos del período usado en el wizard "Pagar el mes".
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });
  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 422 });

  const [y, m] = period.split('-').map(Number);
  const firstDay = `${period}-01`;
  const lastDay  = new Date(y, m, 0).toISOString().slice(0, 10);

  const [{ data: anticipos }, { data: vacaciones }, { data: licencias }, { data: novedades }] = await Promise.all([
    supabase.from('anticipos')
      .select('id, trabajador_id, monto, estado')
      .eq('empleador_id', empleadorId).eq('periodo', period)
      .in('estado', ['aprobado', 'transferido', 'comprobante_ok']),
    supabase.from('solicitudes_empleado')
      .select('id, trabajador_id, dias, fecha_inicio, fecha_fin')
      .eq('empleador_id', empleadorId).eq('tipo', 'vacaciones').eq('estado', 'aprobada')
      .lte('fecha_inicio', lastDay).gte('fecha_fin', firstDay),
    supabase.from('licencias_medicas')
      .select('id, trabajador_id, fecha_inicio, fecha_fin')
      .eq('empleador_id', empleadorId).eq('periodo', period),
    supabase.from('payroll_novedades')
      .select('id, trabajador_id, concept_code, amount')
      .eq('empleador_id', empleadorId).eq('periodo', period),
  ]);

  return NextResponse.json({
    ok: true,
    data: {
      anticipos:  anticipos  ?? [],
      vacaciones: vacaciones ?? [],
      licencias:  licencias  ?? [],
      novedades:  novedades  ?? [],
    },
  });
}
