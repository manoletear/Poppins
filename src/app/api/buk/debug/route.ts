import { NextResponse } from 'next/server';

// DEBUG temporal: respuesta cruda del sistema externo para mapear bien sueldo/liquidaciones/vacaciones.
export const runtime = 'nodejs';

export async function GET() {
  const token = process.env.BUK_API_TOKEN || '';
  const base = (process.env.BUK_API_BASE_URL || '').replace(/\/$/, '');
  const out: any = {};
  async function probe(label: string, path: string) {
    try {
      const r = await fetch(`${base}${path}`, { headers: { auth_token: token, Accept: 'application/json' } });
      const t = await r.text();
      out[label] = { status: r.status, body: t.slice(0, 1200) };
    } catch (e: any) { out[label] = { error: String(e?.message || e) }; }
  }
  await probe('employee_1_full', '/employees/1');
  await probe('payroll_1', '/employees/1/payroll_items');
  await probe('settlements_1', '/employees/1/settlements');
  await probe('vacations_1', '/employees/1/vacations');
  return NextResponse.json(out);
}
