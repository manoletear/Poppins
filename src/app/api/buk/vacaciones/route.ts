import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVacations } from '@/lib/buk';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

type Estado = 'solicitada' | 'aprobada' | 'rechazada' | 'tomada';

function mapEstado(v: any): Estado {
  const st = String(v.estado || '').toLowerCase();
  const fin = v.fin ? new Date(v.fin + 'T00:00:00') : null;
  if (st.includes('reject') || st.includes('rechaz') || st.includes('cancel') || st.includes('denied')) return 'rechazada';
  if (st.includes('approv') || st.includes('aprob') || st.includes('acept')) {
    return fin && fin < new Date() ? 'tomada' : 'aprobada';
  }
  return 'solicitada';
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const { data: contratos } = await supabase
    .from('contratos')
    .select('trabajadores(id, nombre, apellido_paterno, buk_employee_id)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');

  const trabajadores = (contratos || [])
    .map((c: any) => c.trabajadores)
    .filter((t: any) => t && t.buk_employee_id);

  const items = [] as any[];
  for (const t of trabajadores) {
    let vacs: any[] = [];
    try { vacs = await getVacations(t.buk_employee_id); } catch { vacs = []; }
    const mapped = vacs.map((v) => ({
      estado: mapEstado(v),
      dias: Number(v.dias) || 0,
      desde: v.inicio || null,
      hasta: v.fin || null,
      tipo: v.tipo || null,
    }));
    const resumen = {
      solicitadas: mapped.filter((m) => m.estado === 'solicitada').length,
      aprobadas: mapped.filter((m) => m.estado === 'aprobada').length,
      rechazadas: mapped.filter((m) => m.estado === 'rechazada').length,
      tomadas: mapped.filter((m) => m.estado === 'tomada').length,
      diasTomados: mapped.filter((m) => m.estado === 'tomada').reduce((a, m) => a + m.dias, 0),
    };
    items.push({
      trabajadorId: t.id,
      nombre: `${t.nombre || ''} ${t.apellido_paterno || ''}`.trim(),
      vacaciones: mapped,
      resumen,
    });
  }

  return NextResponse.json({ ok: true, items });
}
