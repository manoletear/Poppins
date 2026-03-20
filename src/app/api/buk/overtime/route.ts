import { NextRequest, NextResponse } from 'next/server';
import { getBukSDK } from '@/lib/buk-sdk';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const sdk = getBukSDK();

    const filters: Record<string, unknown> = {};
    if (employeeId) filters.employee_id = Number(employeeId);
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;

    const overtime = await sdk.overtime.listAll(
      Object.keys(filters).length > 0 ? filters : undefined
    );
    return NextResponse.json({ data: overtime });
  } catch (error) {
    console.error('[BUK] Error fetching overtime:', error);
    return NextResponse.json(
      { error: 'Error al obtener horas extras' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sdk = getBukSDK();
    const result = await sdk.overtime.create(body as never);
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    console.error('[BUK] Error creating overtime:', error);
    return NextResponse.json(
      { error: 'Error al crear registro de horas extras' },
      { status: 500 }
    );
  }
}
