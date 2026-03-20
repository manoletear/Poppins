import { NextRequest, NextResponse } from 'next/server';
import { getBukSDK } from '@/lib/buk-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId required' },
        { status: 400 }
      );
    }

    const sdk = getBukSDK();
    const vacations = await sdk.absences.listAllVacations(Number(employeeId));
    return NextResponse.json({ data: vacations });
  } catch (error) {
    console.error('[BUK] Error fetching vacations:', error);
    return NextResponse.json(
      { error: 'Error al obtener vacaciones' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sdk = getBukSDK();
    const result = await sdk.absences.createVacation(body as never);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('[BUK] Error creating vacation:', error);
    return NextResponse.json(
      { error: 'Error al crear solicitud de vacación' },
      { status: 500 }
    );
  }
}
