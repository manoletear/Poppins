import { NextResponse } from 'next/server';

// Indicadores económicos de Chile (UF, UTM, dólar) desde mindicador.cl (API pública, sin key).
// Fallback a valores de respaldo si la API no responde. Cache 6h.

const FALLBACK = { uf: 39841.72, utm: 68923, dolar: 945 };

export const revalidate = 21600; // 6 horas

export async function GET() {
  try {
    const res = await fetch('https://mindicador.cl/api', { next: { revalidate: 21600 } });
    if (!res.ok) throw new Error(`mindicador ${res.status}`);
    const data: any = await res.json();
    return NextResponse.json({
      uf: data?.uf?.valor ?? FALLBACK.uf,
      utm: data?.utm?.valor ?? FALLBACK.utm,
      dolar: data?.dolar?.valor ?? FALLBACK.dolar,
      fecha: data?.uf?.fecha ?? null,
      fuente: 'mindicador.cl',
    });
  } catch {
    return NextResponse.json({ ...FALLBACK, fecha: null, fuente: 'fallback' });
  }
}
