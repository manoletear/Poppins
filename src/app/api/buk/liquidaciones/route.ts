import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getPayrollItems } from '@/lib/buk';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: perfil } = await supabase.from('user_profiles').select('empleador_id').eq('auth_user_id', user.id).maybeSingle();
  let empleadorId = perfil?.empleador_id as string | undefined;
  if (!empleadorId) {
    const { data: emp } = await supabase.from('empleadores').select('id').eq('auth_user_id', user.id).maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const { data: contratos } = await supabase
    .from('contratos')
    .select('trabajadores(id, nombre, apellido_paterno, buk_employee_id)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');

  const trabajadores = (contratos || [])
    .map((c: any) => c.trabajadores)
    .filter((t: any) => t && t.buk_employee_id);

  // Un solo barrido de /accounting (12 meses, todos los empleados) y agrupar por empleadoId.
  let all: any[] = [];
  try { all = await getPayrollItems(); } catch { all = []; }
  const porEmpleado = new Map<number, any[]>();
  for (const l of all) {
    const k = Number(l.empleadoId);
    if (!porEmpleado.has(k)) porEmpleado.set(k, []);
    porEmpleado.get(k)!.push(l);
  }

  const items = trabajadores.map((t: any) => {
    const liqs = (porEmpleado.get(Number(t.buk_employee_id)) || [])
      .sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)));
    const ult = liqs[0];
    return {
      trabajadorId: t.id,
      nombre: `${t.nombre || ''} ${t.apellido_paterno || ''}`.trim(),
      liquidaciones: liqs,
      resumen: {
        cantidad: liqs.length,
        ultimoPeriodo: ult?.periodo || null,
        ultimoLiquido: ult?.liquido || 0,
        promedioLiquido: liqs.length ? Math.round(liqs.reduce((a, l) => a + (Number(l.liquido) || 0), 0) / liqs.length) : 0,
      },
    };
  });

  return NextResponse.json({ ok: true, items });
}
