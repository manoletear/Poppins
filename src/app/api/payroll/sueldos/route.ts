// GET /api/payroll/sueldos?period=YYYY-MM
// Descarga XLSX estructurado de nómina del período.
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import ExcelJS from 'exceljs';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const COLOR_HEADER  = '1A2E6E';  // azul Poppins
const COLOR_SECTION = 'E8EEF8';  // azul claro para subtítulos
const COLOR_TOTAL   = 'F1F5F9';
const COLOR_NET     = 'DCFCE7';  // verde claro para líquido

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
      trabajadores ( rut, nombre, apellido_paterno, apellido_materno, cargo, afp_id, salud_id, salud_tipo ),
      contratos ( sueldo_base, fecha_inicio )
    `)
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', period)
    .eq('voided', false)
    .order('created_at');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  const [y, m] = period.split('-').map(Number);
  const periodoLabel = `${MESES[m - 1]} ${y}`;
  const daysInMonth = new Date(y, m, 0).getDate();

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Poppins';
  wb.created = new Date();

  const ws = wb.addWorksheet('Nómina', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const headerFont  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  const sectionFont = { bold: true, color: { argb: 'FF1A2E6E' }, size: 9 };
  const normalFont  = { size: 9 };
  const totalFont   = { bold: true, size: 9 };

  const border: Partial<ExcelJS.Borders> = {
    top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
    bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
    left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
    right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
  };

  const clp: Partial<ExcelJS.Style> = {
    numFmt: '#,##0',
    border,
  };

  const addRow = (values: (string | number | null)[], style?: Partial<ExcelJS.Style>) => {
    const row = ws.addRow(values);
    if (style) {
      row.eachCell(cell => Object.assign(cell, style));
    }
    return row;
  };

  // ── Cabecera documento ─────────────────────────────────────────────────────
  ws.mergeCells('A1:T1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `NÓMINA DE REMUNERACIONES — ${periodoLabel.toUpperCase()}`;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1A2E6E' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:T2');
  const empCell = ws.getCell('A2');
  const empNombre = empData ? `${empData.nombre} ${empData.apellido}` : '';
  empCell.value = `Empleador: ${empNombre}  |  RUT: ${empData?.rut ?? ''}  |  Generado: ${new Date().toLocaleDateString('es-CL')}`;
  empCell.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
  empCell.alignment = { horizontal: 'center' };

  ws.addRow([]); // espacio

  // ── Definición de columnas ─────────────────────────────────────────────────
  const COLS = [
    // Identificación
    { header: 'RUT',               key: 'rut',           width: 12 },
    { header: 'Apellido Paterno',  key: 'ap',            width: 16 },
    { header: 'Apellido Materno',  key: 'am',            width: 16 },
    { header: 'Nombres',           key: 'nombre',        width: 16 },
    { header: 'Cargo',             key: 'cargo',         width: 16 },
    { header: 'Ingreso',           key: 'ingreso',       width: 11 },
    { header: 'Días Trab.',        key: 'dias',          width: 9  },
    // Haberes
    { header: 'Sueldo Base',       key: 'base',          width: 13 },
    { header: 'Hrs. Extra',        key: 'hextra',        width: 11 },
    { header: 'Gratificación',     key: 'grat',          width: 13 },
    { header: 'Otros Haberes',     key: 'otrosH',        width: 13 },
    { header: 'Total Haberes',     key: 'bruto',         width: 13 },
    // Descuentos trabajador
    { header: 'AFP 10%',           key: 'afp10',         width: 11 },
    { header: 'Com. AFP',          key: 'afpCom',        width: 10 },
    { header: 'Salud 7%',          key: 'salud7',        width: 10 },
    { header: 'Imp. Único',        key: 'iut',           width: 10 },
    { header: 'Anticipos',         key: 'ant',           width: 10 },
    { header: 'Otros Desc.',       key: 'otrosD',        width: 10 },
    { header: 'Total Desc.',       key: 'totalDesc',     width: 11 },
    // Resultado
    { header: 'Líquido a Pagar',   key: 'neto',          width: 14 },
    // Costo empleador
    { header: 'SIS',               key: 'sis',           width: 10 },
    { header: 'AFC Empl.',         key: 'afc',           width: 10 },
    { header: 'Mutual',            key: 'mutual',        width: 10 },
    { header: 'Costo Total',       key: 'costo',         width: 13 },
  ];

  COLS.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width;
  });

  // ── Fila de grupos ─────────────────────────────────────────────────────────
  const ROW4 = ws.addRow([]);
  ws.getRow(4).height = 16;

  const setGroupHeader = (startCol: number, endCol: number, label: string) => {
    const start = String.fromCharCode(64 + startCol);
    const end   = String.fromCharCode(64 + endCol);
    ws.mergeCells(`${start}4:${end}4`);
    const cell = ws.getCell(`${start}4`);
    cell.value = label;
    cell.font = sectionFont;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_SECTION}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = border;
  };

  setGroupHeader(1,  7,  'IDENTIFICACIÓN');
  setGroupHeader(8,  12, 'HABERES');
  setGroupHeader(13, 19, 'DESCUENTOS TRABAJADOR');
  setGroupHeader(20, 20, 'NETO');
  setGroupHeader(21, 24, 'COSTO EMPLEADOR');

  // ── Fila de cabecera de columnas ───────────────────────────────────────────
  const headerRow = ws.addRow(COLS.map(c => c.header));
  headerRow.height = 20;
  headerRow.eachCell((cell, col) => {
    cell.font = headerFont;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_HEADER}` } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border;
  });

  // ── Datos ──────────────────────────────────────────────────────────────────
  const list = (rows ?? []) as any[];
  let totals = Array(COLS.length).fill(0);

  list.forEach(r => {
    const t   = r.trabajadores ?? {};
    const c   = r.contratos ?? {};
    const tr  = r.calculation_trace ?? {};

    const paidDays    = tr['SUELDO_BASE']?.inputs?.paidDays ?? daysInMonth;
    const sueldoBase  = c.sueldo_base ?? 0;
    const hextraVal   = tr['HORAS_EXTRA']?.result ?? 0;
    const gratVal     = tr['GRATIFICACION']?.result ?? 0;
    const otrosH      = Math.max(0, (r.gross_income ?? 0) - sueldoBase - hextraVal - gratVal);
    const totalDesc   = (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0) +
                        (r.deduction_health7 ?? 0) + (r.deduction_income_tax ?? 0) +
                        (r.deduction_advances ?? 0) + (r.deduction_other ?? 0);
    const ingreso = c.fecha_inicio ? new Date(c.fecha_inicio).toLocaleDateString('es-CL') : '';

    const vals = [
      t.rut ?? '',
      t.apellido_paterno ?? '',
      t.apellido_materno ?? '',
      t.nombre ?? '',
      t.cargo ?? '',
      ingreso,
      paidDays,
      sueldoBase,
      hextraVal,
      gratVal,
      otrosH,
      r.gross_income ?? 0,
      r.deduction_afp10 ?? 0,
      r.deduction_afp_commission ?? 0,
      r.deduction_health7 ?? 0,
      r.deduction_income_tax ?? 0,
      r.deduction_advances ?? 0,
      r.deduction_other ?? 0,
      totalDesc,
      r.net_pay ?? 0,
      r.contribution_sis ?? 0,
      r.contribution_afc_employer ?? 0,
      r.contribution_mutual ?? 0,
      r.total_employer_cost ?? 0,
    ];

    const dataRow = ws.addRow(vals);
    dataRow.eachCell((cell, colIdx) => {
      cell.font = normalFont;
      cell.border = border;
      if (colIdx >= 8) {
        cell.numFmt = '#,##0';
        cell.alignment = { horizontal: 'right' };
      }
      if (colIdx === 20) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_NET}` } };
        cell.font = { ...totalFont, color: { argb: 'FF166534' } };
      }
    });

    // Sumar totales (solo columnas numéricas 7-24 → índices 6-23)
    for (let i = 6; i < vals.length; i++) {
      if (typeof vals[i] === 'number') totals[i] = (totals[i] as number) + (vals[i] as number);
    }
  });

  // ── Fila de totales ────────────────────────────────────────────────────────
  ws.addRow([]);
  const totalVals: (string | number)[] = ['', '', '', '', '', '', 'TOTALES', ...totals.slice(6)];
  const totalRow = ws.addRow(totalVals);
  totalRow.height = 18;
  totalRow.eachCell((cell, colIdx) => {
    cell.font = totalFont;
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_TOTAL}` } };
    cell.border = border;
    if (colIdx >= 7) {
      cell.numFmt = '#,##0';
      cell.alignment = { horizontal: 'right' };
    }
    if (colIdx === 7) cell.alignment = { horizontal: 'right' };
    if (colIdx === 20) {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF86EFAC' } };
      cell.font = { ...totalFont, color: { argb: 'FF166534' } };
    }
  });

  // ── Freeze pane ───────────────────────────────────────────────────────────
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 5 }];

  // ── Generar buffer ────────────────────────────────────────────────────────
  const buf = await wb.xlsx.writeBuffer();

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'download.sueldos_xlsx',
    entity: 'payroll_period', entityId: period,
    request,
  });

  return new Response(buf, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="nomina_${period.replace('-', '')}.xlsx"`,
    },
  });
}
