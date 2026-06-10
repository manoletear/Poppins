// GET /api/payroll/contabilidad?period=YYYY-MM
// Centralización contable del período: asientos contables agrupados por cuenta.
// Formato XLSX con 2 hojas:
//   1. "Asientos" — debe/haber por cuenta y total (formato libro mayor)
//   2. "Detalle por trabajador" — desglose de cada concepto por trabajador

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// Mapeo concepto → cuenta contable (estándar Chile, ajustable por empleador)
const CUENTAS: Record<string, { codigo: string; nombre: string; lado: 'debe' | 'haber' }> = {
  // HABERES (gasto empleador → DEBE)
  SUELDO_BASE:                   { codigo: '5101', nombre: 'Sueldos y Salarios',           lado: 'debe' },
  GRATIFICACION:                 { codigo: '5102', nombre: 'Gratificación Legal',          lado: 'debe' },
  HORAS_EXTRA:                   { codigo: '5103', nombre: 'Horas Extra',                  lado: 'debe' },
  BONO:                          { codigo: '5104', nombre: 'Bonos y Asignaciones',         lado: 'debe' },
  ASIGNACION_FAMILIAR:           { codigo: '5105', nombre: 'Asignación Familiar',          lado: 'debe' },
  COLACION:                      { codigo: '5106', nombre: 'Colación',                     lado: 'debe' },
  MOVILIZACION:                  { codigo: '5107', nombre: 'Movilización',                 lado: 'debe' },
  // DESCUENTOS legales (pasivo → HABER)
  AFP_10:                        { codigo: '2101', nombre: 'AFP por Pagar',                lado: 'haber' },
  AFP_COMISION:                  { codigo: '2101', nombre: 'AFP por Pagar',                lado: 'haber' },
  SALUD_7:                       { codigo: '2102', nombre: 'Salud por Pagar (Isapre/Fonasa)', lado: 'haber' },
  AFC_TRABAJADOR:                { codigo: '2103', nombre: 'AFC Trabajador por Pagar',     lado: 'haber' },
  IMPUESTO_UNICO:                { codigo: '2104', nombre: 'Impuesto Único por Pagar',     lado: 'haber' },
  // APORTES EMPLEADOR (gasto → DEBE)
  SIS:                           { codigo: '5108', nombre: 'SIS (gasto empleador)',        lado: 'debe' },
  AFC_EMPLEADOR_TCP_3:           { codigo: '5109', nombre: 'AFC Empleador TCP 3%',         lado: 'debe' },
  CAI_INDEMNIZACION_TODO_EVENTO_1_11: { codigo: '5110', nombre: 'CAI 1.11% Indemn. todo evento', lado: 'debe' },
  MUTUAL_ACCIDENTES_TRABAJO:     { codigo: '5111', nombre: 'Mutual Accidentes Trabajo',    lado: 'debe' },
  CCAF_APORTE_EMPLEADOR:         { codigo: '5112', nombre: 'CCAF Aporte Empleador',        lado: 'debe' },
  // CCAF descuentos trabajador → pasivo
  CCAF_DESC_CREDITO:             { codigo: '2105', nombre: 'CCAF por Pagar (Créditos)',    lado: 'haber' },
  CCAF_DESC_DENTAL:              { codigo: '2105', nombre: 'CCAF por Pagar',               lado: 'haber' },
  CCAF_DESC_LEASING:             { codigo: '2105', nombre: 'CCAF por Pagar',               lado: 'haber' },
  CCAF_DESC_SEGURO_VIDA:         { codigo: '2105', nombre: 'CCAF por Pagar',               lado: 'haber' },
  CCAF_DESC_OTRO:                { codigo: '2105', nombre: 'CCAF por Pagar',               lado: 'haber' },
};

const CUENTA_LIQUIDO = { codigo: '2100', nombre: 'Sueldos por Pagar (Líquido)', lado: 'haber' as const };

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period || !/^\d{4}-\d{2}$/.test(period)) {
    return NextResponse.json({ ok: false, error: 'period_requerido (YYYY-MM)' }, { status: 422 });
  }

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const { data: empData } = await supabase
    .from('empleadores').select('nombre, apellido, rut').eq('id', empleadorId).maybeSingle();

  // Resultados + conceptos del período
  const { data: results } = await supabase
    .from('payroll_results')
    .select(`
      id, worker_id, net_pay,
      trabajadores:worker_id (rut, nombre, apellido_paterno, apellido_materno)
    `)
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false);

  if (!results || results.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_resultados' }, { status: 404 });
  }

  const ids = results.map((r: any) => r.id);
  const { data: conceptos } = await supabase
    .from('payroll_concept_results')
    .select('payroll_result_id, concept_code, concept_name, amount')
    .in('payroll_result_id', ids);

  // Agregar por cuenta
  type CuentaRow = { codigo: string; nombre: string; debe: number; haber: number; conceptos: Set<string> };
  const porCuenta: Record<string, CuentaRow> = {};
  const detallePorTrab: Array<{ rut: string; nombre: string; concept_code: string; concept_name: string; amount: number; cuenta: string; lado: string }> = [];

  const resultsById = new Map(results.map((r: any) => [r.id, r]));

  for (const c of conceptos ?? []) {
    const cuenta = CUENTAS[c.concept_code];
    if (!cuenta) continue;
    const key = `${cuenta.codigo}_${cuenta.lado}`;
    if (!porCuenta[key]) porCuenta[key] = { codigo: cuenta.codigo, nombre: cuenta.nombre, debe: 0, haber: 0, conceptos: new Set() };
    porCuenta[key][cuenta.lado] += Number(c.amount);
    porCuenta[key].conceptos.add(c.concept_code);

    const r: any = resultsById.get(c.payroll_result_id);
    const t = r?.trabajadores;
    detallePorTrab.push({
      rut: t?.rut ?? '',
      nombre: `${t?.nombre ?? ''} ${t?.apellido_paterno ?? ''}`.trim(),
      concept_code: c.concept_code,
      concept_name: c.concept_name,
      amount: Number(c.amount),
      cuenta: `${cuenta.codigo} ${cuenta.nombre}`,
      lado: cuenta.lado,
    });
  }

  // Sueldos por pagar (líquido) → suma neta por trabajador
  const totalLiquido = results.reduce((s: number, r: any) => s + Number(r.net_pay), 0);
  porCuenta['liquido'] = { codigo: CUENTA_LIQUIDO.codigo, nombre: CUENTA_LIQUIDO.nombre, debe: 0, haber: totalLiquido, conceptos: new Set(['LIQUIDO']) };

  // ── XLSX ──────────────────────────────────────────────────────────────────
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Poppins'; wb.created = new Date();

  const [y, m] = period.split('-').map(Number);
  const titulo = `${MESES[m - 1]} ${y}`;
  const empName = `${empData?.nombre ?? ''} ${empData?.apellido ?? ''}`.trim() || (empData?.rut ?? '');

  // Hoja 1: Asientos
  const ws1 = wb.addWorksheet('Asientos');
  ws1.columns = [
    { header: 'Código',  key: 'codigo', width: 10 },
    { header: 'Cuenta',  key: 'nombre', width: 42 },
    { header: 'Debe',    key: 'debe',   width: 16, style: { numFmt: '#,##0' } },
    { header: 'Haber',   key: 'haber',  width: 16, style: { numFmt: '#,##0' } },
  ];
  ws1.spliceRows(1, 0, [`Centralización contable — ${empName}`], [`Período: ${titulo}`], []);
  ws1.getRow(1).font = { bold: true, size: 14 };
  ws1.getRow(2).font = { bold: true };
  ws1.getRow(4).font = { bold: true };

  const ordered = Object.values(porCuenta).sort((a, b) => a.codigo.localeCompare(b.codigo));
  for (const c of ordered) {
    ws1.addRow({ codigo: c.codigo, nombre: c.nombre, debe: c.debe || '', haber: c.haber || '' });
  }
  const totalDebe = ordered.reduce((s, c) => s + c.debe, 0);
  const totalHaber = ordered.reduce((s, c) => s + c.haber, 0);
  const totalRow = ws1.addRow({ codigo: '', nombre: 'TOTAL', debe: totalDebe, haber: totalHaber });
  totalRow.font = { bold: true };
  totalRow.eachCell((cell) => { cell.border = { top: { style: 'thin' } }; });

  // Hoja 2: Detalle por trabajador
  const ws2 = wb.addWorksheet('Detalle');
  ws2.columns = [
    { header: 'RUT',         key: 'rut',          width: 14 },
    { header: 'Trabajador',  key: 'nombre',       width: 26 },
    { header: 'Cuenta',      key: 'cuenta',       width: 36 },
    { header: 'Lado',        key: 'lado',         width: 8  },
    { header: 'Concepto',    key: 'concept_name', width: 32 },
    { header: 'Código',      key: 'concept_code', width: 16 },
    { header: 'Monto',       key: 'amount',       width: 14, style: { numFmt: '#,##0' } },
  ];
  ws2.getRow(1).font = { bold: true };
  for (const d of detallePorTrab) ws2.addRow(d);

  const buf = await wb.xlsx.writeBuffer();

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.contabilidad',
    entity: 'payroll_period', entityId: period,
    payload: { totalDebe, totalHaber, cuentas: ordered.length },
    request,
  });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="contabilidad_${period.replace('-', '')}.xlsx"`,
    },
  });
}
