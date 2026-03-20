import { NextRequest, NextResponse } from 'next/server';
import { getPayrollItems } from '@/lib/buk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const items = await getPayrollItems(employeeId ? Number(employeeId) : undefined);
    return NextResponse.json({ data: items });
  } catch (error) {
    console.error('[BUK] Error fetching payroll:', error);
    return NextResponse.json(
      { error: 'Error al obtener liquidaciones' },
      { status: 500 }
    );
  }
}
