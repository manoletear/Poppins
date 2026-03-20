import { NextResponse } from 'next/server';
import { getEmployees } from '@/lib/buk';

export async function GET() {
  try {
    const employees = await getEmployees();
    return NextResponse.json({ data: employees });
  } catch (error) {
    console.error('[BUK] Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Error al obtener colaboradoras' },
      { status: 500 }
    );
  }
}
