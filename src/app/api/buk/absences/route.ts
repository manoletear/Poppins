import { NextRequest, NextResponse } from 'next/server';
import { getAbsences, createAbsence } from '@/lib/buk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const absences = await getAbsences(employeeId ? Number(employeeId) : undefined);
    return NextResponse.json({ data: absences });
  } catch (error) {
    console.error('[BUK] Error fetching absences:', error);
    return NextResponse.json(
      { error: 'Error al obtener ausencias' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await createAbsence(body);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('[BUK] Error creating absence:', error);
    return NextResponse.json(
      { error: 'Error al crear solicitud de ausencia' },
      { status: 500 }
    );
  }
}
