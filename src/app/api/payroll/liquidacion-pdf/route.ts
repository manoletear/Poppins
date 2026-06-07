// GET /api/payroll/liquidacion-pdf?period=YYYY-MM&workerId=uuid
// Genera y descarga PDF de liquidación para un trabajador específico.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { LiquidacionDocument } from '@/lib/payroll-cl/liquidacion-pdf';

export const runtime = 'nodejs';

const AFP_NOMBRES: Record<number, string> = {
  1: 'AFP Capital', 2: 'AFP Cuprum', 3: 'AFP Hábitat',
  4: 'AFP Modelo', 5: 'AFP PlanVital', 6: 'AFP Provida', 7: 'AFP Uno',
};

const SALUD_NOMBRES: Record<number, string> = {
  7: 'FONASA', 1: 'Banmédica', 2: 'Colmena', 3: 'Consalud',
  4: 'Cruz Blanca', 5: 'Nueva MásVida', 8: 'Vida Tres',
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const url = new URL(request.url);
  const period   = url.searchParams.get('period');
  const workerId = url.searchParams.get('workerId');
  if (!period || !workerId) {
    return NextResponse.json({ ok: false, error: 'period_and_workerId_required' }, { status: 400 });
  }

  // Resolver empleador
  let empleadorId: string | undefined;
  const { data: profile } = await supabase
    .from('user_profiles').select('empleador_id').eq('auth_user_id', user.id).maybeSingle();
  empleadorId = profile?.empleador_id;
  if (!empleadorId) {
    const { data: emp } = await supabase
      .from('empleadores').select('id').eq('auth_user_id', user.id).maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  // Obtener datos del empleador
  const { data: empData } = await supabase
    .from('empleadores')
    .select('nombre, apellido, rut')
    .eq('id', empleadorId)
    .single();

  // Obtener resultado de nómina
  const { data: result, error } = await supabase
    .from('payroll_results')
    .select(`
      gross_income, taxable_income, pension_base,
      deduction_afp10, deduction_afp_commission, deduction_health7,
      deduction_income_tax, deduction_advances, deduction_other,
      net_pay, calculation_trace,
      trabajadores ( rut, nombre, apellido_paterno, apellido_materno, cargo, afp_id, salud_id, salud_tipo ),
      contratos ( sueldo_base, fecha_inicio )
    `)
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('worker_id', workerId)
    .eq('voided', false)
    .single();

  if (error || !result) {
    return NextResponse.json({ ok: false, error: 'resultado_no_encontrado' }, { status: 404 });
  }

  const trab = (result as any).trabajadores ?? {};
  const contrato = (result as any).contratos ?? {};
  const trace = (result as any).calculation_trace ?? {};

  const [y, m] = period.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const paidDays = trace['SUELDO_BASE']?.inputs?.paidDays ?? daysInMonth;
  const horasExtraValor = trace['HORAS_EXTRA']?.result ?? 0;
  const gratificacion = trace['GRATIFICACION']?.result ?? 0;
  const deductionHealthDiff = trace['ISAPRE_DIFERENCIA_PLAN']?.result ?? 0;
  const sueldoBase = contrato.sueldo_base ?? 0;
  const otrosHaberes = Math.max(
    0,
    (result.gross_income ?? 0) - sueldoBase - horasExtraValor - gratificacion
  );

  const data = {
    period,
    empleadorNombre: empData ? `${empData.nombre} ${empData.apellido}` : 'Empleador',
    empleadorRut: empData?.rut ?? '',
    trabajadorNombre: [trab.nombre, trab.apellido_paterno, trab.apellido_materno].filter(Boolean).join(' '),
    trabajadorRut: trab.rut ?? '',
    cargo: trab.cargo ?? undefined,
    sueldoBase,
    fechaIngreso: contrato.fecha_inicio
      ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CL')
      : '',
    grossIncome: result.gross_income ?? 0,
    horasExtraValor,
    gratificacion,
    otrosHaberes,
    deductionAfp10: result.deduction_afp10 ?? 0,
    deductionAfpCommission: result.deduction_afp_commission ?? 0,
    deductionHealth7: result.deduction_health7 ?? 0,
    deductionHealthDiff,
    deductionIncomeTax: result.deduction_income_tax ?? 0,
    deductionAdvances: result.deduction_advances ?? 0,
    deductionOther: result.deduction_other ?? 0,
    netPay: result.net_pay ?? 0,
    paidDays,
    daysInMonth,
    afpNombre: AFP_NOMBRES[trab.afp_id] ?? `AFP ${trab.afp_id}`,
    saludNombre: trab.salud_tipo === 'isapre'
      ? (SALUD_NOMBRES[trab.salud_id] ?? 'Isapre')
      : 'FONASA',
  };

  const buffer = await renderToBuffer(
    React.createElement(LiquidacionDocument, { data }) as any
  );

  const rut = trab.rut?.replace(/\./g, '').replace('-', '') ?? 'trab';
  const filename = `liquidacion_${period.replace('-', '')}_${rut}.pdf`;

  return new Response(buffer.buffer as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
