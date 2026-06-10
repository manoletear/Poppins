// GET /api/payroll/libro-remuneraciones?period=YYYY-MM
// Genera el Libro de Remuneraciones Electrónico (LRE) en formato TXT
// para upload al portal lre.dt.gob.cl (Dirección del Trabajo, Chile).
//
// Estructura según especificación DT versión vigente:
//   Registro tipo 1 → encabezado empresa (1 por archivo)
//   Registro tipo 2 → una línea por trabajador
//
// Separador: ';'  Encoding: UTF-8 (el portal acepta UTF-8 desde 2022)
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

// Códigos AFP DT
const AFP_COD: Record<number, string> = {
  1: '01', 2: '02', 3: '03', 4: '08', 5: '04', 6: '05', 7: '09',
};
// Códigos Salud DT
const SALUD_COD: Record<number, string> = {
  7: '00',  // FONASA
  1: '11', 2: '12', 3: '13', 4: '14', 5: '15', 8: '16',
};

function rutSinPuntos(rut: string | null | undefined): string {
  if (!rut) return '';
  return rut.replace(/\./g, '');
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 400 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const { data: empData } = await supabase
    .from('empleadores').select('nombre, apellido, rut').eq('id', empleadorId).single();

  const { data: rows, error } = await supabase
    .from('payroll_results')
    .select(`
      gross_income, taxable_income, pension_base, health_base,
      deduction_afp10, deduction_afp_commission, deduction_health7,
      deduction_income_tax, deduction_advances, deduction_other,
      contribution_sis, contribution_afc_employer, contribution_mutual,
      net_pay, total_employer_cost, calculation_trace,
      trabajadores ( rut, nombre, apellido_paterno, apellido_materno, afp_id, salud_id, salud_tipo ),
      contratos ( sueldo_base, fecha_inicio, fecha_termino, horas_semanales, tipo_contrato )
    `)
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false)
    .order('created_at');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const [y, m] = period.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  // ── Registro tipo 1 — Empresa ──────────────────────────────────────────────
  // Campos: Tipo;RUT_Empresa;Nombre_Empresa;Periodo;Num_Trabajadores
  const rutEmp = rutSinPuntos(empData?.rut);
  const nombreEmp = `${empData?.nombre ?? ''} ${empData?.apellido ?? ''}`.trim();
  const numTrab = (rows ?? []).length;

  const tipo1 = [
    '1',
    rutEmp,
    nombreEmp,
    period.replace('-', ''),   // YYYYMM
    numTrab,
  ].join(';');

  // ── Registros tipo 2 — Trabajadores ───────────────────────────────────────
  // Campos (según especificación LRE DT):
  //  1  Tipo registro           → '2'
  //  2  RUT Empresa             → sin puntos con guión
  //  3  RUT Trabajador          → sin puntos con guión
  //  4  Apellido Paterno
  //  5  Apellido Materno
  //  6  Nombres
  //  7  Fecha Inicio Contrato   → YYYY-MM-DD
  //  8  Fecha Término Contrato  → YYYY-MM-DD o vacío
  //  9  Tipo Contrato           → 1=indefinido, 2=plazo fijo
  // 10  Días Trabajados
  // 11  Horas Semanales Contrato
  // 12  Sueldo Base
  // 13  Horas Extra (cantidad)
  // 14  Horas Extra (monto)
  // 15  Semana Corrida
  // 16  Gratificación
  // 17  Bono / Haberes Imponibles adicionales
  // 18  Total Haber Imponible
  // 19  Haberes No Imponibles
  // 20  Total Haberes
  // 21  Código AFP
  // 22  Cotización AFP 10%
  // 23  Comisión AFP
  // 24  SIS (seguro invalidez y sobrevivencia)
  // 25  AFC Trabajador
  // 26  Código Salud            → '00'=FONASA, '11'-'16'=isapres
  // 27  Cotización Salud 7%
  // 28  Diferencia Plan Salud (Isapre)
  // 29  Impuesto Único 2ª Categoría
  // 30  Otros Descuentos
  // 31  Total Descuentos
  // 32  Líquido a Pagar
  // 33  SIS Empleador
  // 34  AFC Empleador
  // 35  Mutual

  const tipo2Lines = (rows ?? []).map((r: any) => {
    const t  = r.trabajadores ?? {};
    const c  = r.contratos ?? {};
    const tr = r.calculation_trace ?? {};

    const paidDays   = tr['SUELDO_BASE']?.inputs?.paidDays ?? daysInMonth;
    const sueldoBase = c.sueldo_base ?? 0;
    const hextraHrs  = tr['HORAS_EXTRA']?.inputs?.extraHours ?? 0;
    const hextraVal  = tr['HORAS_EXTRA']?.result ?? 0;
    const gratVal    = tr['GRATIFICACION']?.result ?? 0;
    const semanaCorrida = tr['SEMANA_CORRIDA']?.result ?? 0;

    // Haberes imponibles adicionales (bonos, etc.) = bruto - base - hextra - grat - semana corrida
    const otrosImponibles = Math.max(
      0,
      (r.gross_income ?? 0) - sueldoBase - hextraVal - gratVal - semanaCorrida
    );

    // Haberes no imponibles (asig. familiar, colación, etc.)
    const asigFam    = tr['ASIGNACION_FAMILIAR']?.result ?? 0;
    const noImponib  = asigFam; // extender si hay más

    const totalHaberes = (r.gross_income ?? 0) + noImponib;

    const totalDesc = (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0) +
                      (r.deduction_health7 ?? 0) + (r.deduction_income_tax ?? 0) +
                      (r.deduction_advances ?? 0) + (r.deduction_other ?? 0);

    const afcTrab     = tr['AFC_TRABAJADOR']?.result ?? 0;
    const diffIsapre  = tr['ISAPRE_DIFERENCIA_PLAN']?.result ?? 0;

    const tipoContrato = c.tipo_contrato === 'plazo_fijo' ? '2' : '1';

    return [
      '2',
      rutEmp,
      rutSinPuntos(t.rut),
      t.apellido_paterno ?? '',
      t.apellido_materno ?? '',
      t.nombre ?? '',
      c.fecha_inicio ?? '',
      c.fecha_termino ?? '',
      tipoContrato,
      paidDays,
      c.horas_semanales ?? 45,
      sueldoBase,
      hextraHrs,
      hextraVal,
      semanaCorrida,
      gratVal,
      otrosImponibles,
      r.gross_income ?? 0,
      noImponib,
      totalHaberes,
      AFP_COD[t.afp_id] ?? '01',
      r.deduction_afp10 ?? 0,
      r.deduction_afp_commission ?? 0,
      r.contribution_sis ?? 0,
      afcTrab,
      t.salud_tipo === 'isapre' ? (SALUD_COD[t.salud_id] ?? '11') : '00',
      r.deduction_health7 ?? 0,
      diffIsapre,
      r.deduction_income_tax ?? 0,
      r.deduction_other ?? 0,
      totalDesc,
      r.net_pay ?? 0,
      r.contribution_sis ?? 0,
      r.contribution_afc_employer ?? 0,
      r.contribution_mutual ?? 0,
    ].join(';');
  });

  const content = [tipo1, ...tipo2Lines].join('\r\n') + '\r\n';

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.lre',
    entity: 'payroll_period', entityId: period,
    payload: { rows: tipo2Lines.length },
    request,
  });

  return new Response(content, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="LRE_${rutEmp.replace('-','')}_${period.replace('-','')}.txt"`,
    },
  });
}
