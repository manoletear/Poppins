import { NextResponse } from 'next/server';
import { getEmployees, getEmployee, getPayrollItems, getVacations } from '@/lib/buk';
import { cleanRut } from '@/lib/validators';

export const runtime = 'nodejs';

/** Normaliza un RUT para comparación: sin puntos/espacios/guiones, dv en minúscula. */
function normalizeRut(rut: string): string {
  return cleanRut(rut).toLowerCase();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rut = searchParams.get('rut');

  if (!rut || !rut.trim()) {
    return NextResponse.json({ error: 'rut_required' }, { status: 400 });
  }

  const target = normalizeRut(rut);

  try {
    const empleados = await getEmployees();
    const match = empleados.find((e: { rut?: string }) => normalizeRut(e.rut || '') === target);

    if (!match) {
      return NextResponse.json({ found: false });
    }

    const empleado = await getEmployee(match.id);

    let liquidaciones: unknown[] = [];
    try {
      liquidaciones = await getPayrollItems(match.id);
    } catch {
      liquidaciones = [];
    }

    let vacaciones: unknown[] = [];
    try { vacaciones = await getVacations(match.id); } catch { vacaciones = []; }
    return NextResponse.json({ found: true, empleado, liquidaciones, vacaciones });
  } catch {
    // BUK puede estar caído: no propagamos 500 ni filtramos tokens/stack.
    return NextResponse.json({ found: false, error: 'buk_unavailable' });
  }
}
