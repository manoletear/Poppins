import { NextResponse } from 'next/server';
import { getBenefits } from '@/lib/buk';

export async function GET() {
  try {
    const benefits = await getBenefits();
    return NextResponse.json({ data: benefits });
  } catch (error) {
    console.error('[BUK] Error fetching benefits:', error);
    return NextResponse.json(
      { error: 'Error al obtener beneficios' },
      { status: 500 }
    );
  }
}
