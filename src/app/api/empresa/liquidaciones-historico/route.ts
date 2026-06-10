// GET /api/empresa/liquidaciones-historico
// Reemplazo local de /api/buk/liquidaciones. Agrupa payroll_results por trabajador.
// Shape: { ok, items: [{ trabajadorId, nombre, liquidaciones: [...], resumen }] }

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Trabajadores activos
  const { data: contratos } = await supabase
    .from('contratos')
    .select('trabajador_id, trabajadores(id, nombre, apellido_paterno)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');

  // Resultados últimos 12 meses
  const { data: rows } = await supabase
    .from('payroll_results')
    .select('worker_id, payroll_period, gross_income, net_pay')
    .eq('empleador_id', empleadorId)
    .eq('voided', false)
    .order('payroll_period', { ascending: false });

  const byTrab = new Map<string, any[]>();
  for (const r of rows ?? []) {
    const list = byTrab.get(r.worker_id) ?? [];
    list.push({
      periodo: r.payroll_period,
      totalHaberes: r.gross_income,
      totalDescuentos: (r.gross_income ?? 0) - (r.net_pay ?? 0),
      liquido: r.net_pay,
    });
    byTrab.set(r.worker_id, list);
  }

  const items = (contratos ?? []).map((c: any) => {
    const t = c.trabajadores;
    if (!t) return null;
    const liquidaciones = byTrab.get(t.id) ?? [];
    const ultimoLiquido = liquidaciones[0]?.liquido ?? 0;
    return {
      trabajadorId: t.id,
      nombre: `${t.nombre ?? ''} ${t.apellido_paterno ?? ''}`.trim(),
      liquidaciones,
      resumen: { cantidad: liquidaciones.length, ultimoLiquido },
    };
  }).filter(Boolean);

  return NextResponse.json({ ok: true, items });
}
