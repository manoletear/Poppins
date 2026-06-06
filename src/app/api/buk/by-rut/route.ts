import { NextResponse } from 'next/server';
import { getEmployees, getEmployee, getPayrollItems, getVacations, getMedicalLicenses } from '@/lib/buk';
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

    // Empleado + liquidaciones + vacaciones + licencias en paralelo (cada una tolera su propio error).
    const [empleado, liquidaciones, vacaciones, licencias] = await Promise.all([
      getEmployee(match.id),
      getPayrollItems(match.id).catch(() => []),
      getVacations(match.id).catch(() => []),
      getMedicalLicenses(match.id).catch(() => []),
    ]);
    return NextResponse.json(
      { found: true, empleado, liquidaciones, vacaciones, licencias },
      // Cache por-usuario 10 min: reaperturas de la ficha son instantáneas; revalida 5 min más en background.
      { headers: { 'Cache-Control': 'private, max-age=600, stale-while-revalidate=300' } },
    );
  } catch {
    // BUK puede estar caído: no propagamos 500 ni filtramos tokens/stack.
    return NextResponse.json({ found: false, error: 'buk_unavailable' });
  }
}
