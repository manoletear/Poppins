// GET /api/empresa/vacaciones-historico
// Reemplazo local de /api/buk/vacaciones. Agrupa vacaciones de
// `solicitudes_empleado.tipo='vacaciones'` por trabajador con resumen.
// Shape: { ok, items: [{ trabajadorId, nombre, vacaciones: [...], resumen }] }

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

const mapEstado = (st: string | null): 'solicitada' | 'aprobada' | 'rechazada' | 'tomada' => {
  if (st === 'aprobada') {
    // En Poppins, aprobada y posterior a la fecha de fin = tomada
    return 'aprobada';
  }
  if (st === 'rechazada' || st === 'cancelada') return 'rechazada';
  return 'solicitada';
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Trabajadores activos del empleador
  const { data: contratos } = await supabase
    .from('contratos')
    .select('trabajador_id, trabajadores(id, nombre, apellido_paterno)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');

  // Vacaciones del empleador
  const { data: vacs } = await supabase
    .from('solicitudes_empleado')
    .select('trabajador_id, fecha_inicio, fecha_fin, dias, estado, tipo')
    .eq('empleador_id', empleadorId)
    .eq('tipo', 'vacaciones')
    .order('fecha_inicio', { ascending: false });

  const today = new Date().toISOString().slice(0, 10);
  const byTrab = new Map<string, any[]>();
  for (const v of vacs ?? []) {
    let estado = mapEstado(v.estado);
    if (estado === 'aprobada' && v.fecha_fin && v.fecha_fin < today) estado = 'tomada';
    const list = byTrab.get(v.trabajador_id) ?? [];
    list.push({
      estado,
      dias: Number(v.dias) || 0,
      desde: v.fecha_inicio,
      hasta: v.fecha_fin,
      tipo: 'vacaciones',
    });
    byTrab.set(v.trabajador_id, list);
  }

  const items = (contratos ?? []).map((c: any) => {
    const t = c.trabajadores;
    if (!t) return null;
    const vacaciones = byTrab.get(t.id) ?? [];
    const resumen = {
      solicitadas: vacaciones.filter((v) => v.estado === 'solicitada').length,
      aprobadas:   vacaciones.filter((v) => v.estado === 'aprobada').length,
      rechazadas:  vacaciones.filter((v) => v.estado === 'rechazada').length,
      tomadas:     vacaciones.filter((v) => v.estado === 'tomada').length,
      diasTomados: vacaciones.filter((v) => v.estado === 'tomada').reduce((a, v) => a + v.dias, 0),
    };
    return {
      trabajadorId: t.id,
      nombre: `${t.nombre ?? ''} ${t.apellido_paterno ?? ''}`.trim(),
      vacaciones,
      resumen,
    };
  }).filter(Boolean);

  return NextResponse.json({ ok: true, items });
}
