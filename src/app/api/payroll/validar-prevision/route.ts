// GET /api/payroll/validar-prevision
// Devuelve el estado de validación previsional de TODOS los trabajadores activos
// del empleador (sin disparar cálculo). Usado por la UI para mostrar badges y
// para verificar paridad con Buk durante la transición (plan 2026, item #2).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { validarPrevision } from '@/lib/payroll-cl/validacion-prevision';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const url = new URL(request.url);
  const period = url.searchParams.get('period'); // 'YYYY-MM' opcional

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const [{ data: contratos }, { data: catAfps }, { data: catIsapres }] = await Promise.all([
    supabase
      .from('contratos')
      .select(`
        id, trabajador_id, fecha_termino,
        trabajadores (
          id, rut, nombre, apellido_paterno,
          afp_id, salud_id, salud_tipo, salud_plan_uf,
          prevision_verificada_at, prevision_estado
        )
      `)
      .eq('empleador_id', empleadorId)
      .eq('estado', 'activo'),
    supabase.from('cat_afp').select('id, codigo, activa'),
    supabase.from('cat_isapre').select('id, codigo, tipo, activa'),
  ]);

  const catalogo = {
    afps:    (catAfps    ?? []) as Array<{ id: number; codigo: string; activa: boolean }>,
    isapres: (catIsapres ?? []) as Array<{ id: number; codigo: string; tipo: 'fonasa' | 'isapre'; activa: boolean }>,
  };

  let periodoFin: Date | undefined;
  if (period && /^\d{4}-\d{2}$/.test(period)) {
    const [y, m] = period.split('-').map(Number);
    periodoFin = new Date(y, m, 0, 23, 59, 59);
  }

  const items = (contratos ?? []).map((c: any) => {
    const t = c.trabajadores;
    const v = validarPrevision(
      {
        id: t.id, rut: t.rut, nombre: `${t.nombre} ${t.apellido_paterno}`.trim(),
        afp_id: t.afp_id, salud_id: t.salud_id, salud_tipo: t.salud_tipo,
        salud_plan_uf: t.salud_plan_uf,
        prevision_verificada_at: t.prevision_verificada_at,
        prevision_estado: t.prevision_estado,
      },
      catalogo,
      { periodoFin, contratoFechaTermino: c.fecha_termino },
    );
    return {
      contractId: c.id,
      workerId: t.id,
      workerRut: t.rut,
      workerName: `${t.nombre} ${t.apellido_paterno}`.trim(),
      afpId: t.afp_id,
      saludId: t.salud_id,
      saludTipo: t.salud_tipo,
      saludPlanUf: t.salud_plan_uf,
      verificadaAt: t.prevision_verificada_at,
      estadoPersistido: t.prevision_estado,
      validacion: v,
    };
  });

  const resumen = {
    total: items.length,
    vigentes: items.filter(i => i.validacion.estado === 'vigente').length,
    pendientes: items.filter(i => i.validacion.estado === 'pendiente').length,
    invalidas: items.filter(i => i.validacion.estado === 'invalida').length,
  };

  return NextResponse.json({ ok: true, period, resumen, items });
}
