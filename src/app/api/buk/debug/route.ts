import { NextResponse } from 'next/server';

// DEBUG temporal: muestra la respuesta cruda de BUK para diagnosticar por qué no trae employees.
export const runtime = 'nodejs';

export async function GET() {
  const token = process.env.BUK_API_TOKEN || '';
  const base = (process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile').replace(/\/$/, '');
  const out: any = { base, tokenLen: token.length };
  const paths = [
    '/employees',
    '/employees?page_size=5',
    '/employees?status=activo',
    '/employees?status=active',
    '/employees?person_rut=10891877-2',
    '/employees?rut=10891877-2',
  ];
  for (const p of paths) {
    try {
      const r = await fetch(`${base}${p}`, { headers: { auth_token: token, Accept: 'application/json' } });
      const t = await r.text();
      out[p] = { status: r.status, body: t.slice(0, 400) };
    } catch (e: any) {
      out[p] = { error: String(e?.message || e) };
    }
  }
  return NextResponse.json(out);
}
