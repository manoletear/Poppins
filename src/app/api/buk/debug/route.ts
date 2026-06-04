import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const token = process.env.BUK_API_TOKEN || '';
  const base = (process.env.BUK_API_BASE_URL || '').replace(/\/$/, '');
  const out: any = {};
  async function probe(label: string, path: string, max = 600) {
    try {
      const r = await fetch(`${base}${path}`, { headers: { auth_token: token, Accept: 'application/json' } });
      const t = await r.text();
      // si es JSON, mostramos las KEYS del primer objeto + un recorte
      let keys: string[] | undefined;
      try { const j = JSON.parse(t); const obj = j?.data?.[0] || j?.data || j; keys = obj && typeof obj === 'object' ? Object.keys(obj) : undefined; } catch { /* html */ }
      out[label] = { status: r.status, keys, body: t.slice(0, max) };
    } catch (e: any) { out[label] = { error: String(e?.message || e) }; }
  }
  await probe('employee_1', '/employees/1', 2500);
  await probe('settlements_q', '/settlements?employee_id=1');
  await probe('liquidaciones_q', '/liquidaciones?employee_id=1');
  await probe('vacations_q', '/vacations?employee_id=1');
  await probe('absences_q', '/absences?employee_id=1');
  await probe('jobs', '/jobs?employee_id=1');
  return NextResponse.json(out);
}
