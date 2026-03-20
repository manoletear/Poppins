import { NextRequest, NextResponse } from 'next/server';
import { getEmployee } from '@/lib/buk';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await getEmployee(Number(id));
    return NextResponse.json({ data: employee });
  } catch (error) {
    console.error('[BUK] Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Error al obtener colaborador' },
      { status: 500 }
    );
  }
}
