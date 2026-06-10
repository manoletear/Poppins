// Genera un PDF de liquidación de prueba con datos reales de BD.
// Si no hay payroll_results aún, los calcula on-the-fly para 1 trabajador.
//
// Uso: npx tsx scripts/test-pdf-liquidacion.ts [rut] [YYYY-MM]
// Output: liquidacion-test.pdf en la raíz del proyecto.

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import fs from 'node:fs/promises';
import path from 'node:path';
import { LiquidacionDocument, type LiquidacionData, type LiquidacionLineItem } from '../src/lib/payroll-cl/liquidacion-pdf.js';
import { calculatePayroll } from '../src/lib/payroll-cl/engine.js';
import { buildSnapshotForPeriod } from '../src/lib/payroll-cl/snapshot-builder.js';
import { HealthType, LegalProfileType, WorkScheduleType } from '../src/lib/payroll-cl/types/enums.js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const rutArg = process.argv[2] ?? '17.973.010-3';        // Fernando Astete por defecto
const periodArg = process.argv[3] ?? '2026-02';

const AFP_NOMBRES: Record<number, string> = {
  1: 'AFP Capital', 2: 'AFP Cuprum', 3: 'AFP Hábitat',
  4: 'AFP Modelo', 5: 'AFP PlanVital', 6: 'AFP Provida', 7: 'AFP Uno',
};
const SALUD_NOMBRES: Record<number, string> = {
  7: 'FONASA', 13: 'FONASA', 1: 'Banmédica', 2: 'Colmena', 3: 'Consalud',
  4: 'Cruz Blanca', 5: 'Nueva MásVida', 8: 'Banmédica', 9: 'Colmena',
  10: 'Consalud', 11: 'Cruz Blanca', 12: 'Nueva MásVida', 32: 'Vida Tres',
};
const AFP_CODE_NAME: Record<number, string> = {
  1: 'capital', 2: 'cuprum', 3: 'habitat', 4: 'modelo',
  5: 'planvital', 6: 'provida', 7: 'uno',
};

function dedupeWords(s: string): string {
  const parts = (s || '').trim().split(/\s+/);
  for (let len = Math.floor(parts.length / 2); len > 0; len--) {
    const a = parts.slice(parts.length - 2 * len, parts.length - len).join(' ').toLowerCase();
    const b = parts.slice(parts.length - len).join(' ').toLowerCase();
    if (a && a === b) return parts.slice(0, parts.length - len).join(' ');
  }
  return parts.join(' ');
}

function formatRut(rut: string | null | undefined): string {
  if (!rut) return '';
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return rut;
  const dv = clean.slice(-1);
  const num = clean.slice(0, -1);
  return `${num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  const dd = String(d.getDate()).padStart(2, '0');
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${dd} ${meses[d.getMonth()]} ${d.getFullYear()}`;
}

async function main() {
  // 1) Buscar trabajador
  const { data: trab } = await sb
    .from('trabajadores')
    .select('id, rut, nombre, apellido_paterno, apellido_materno, cargo, afp_id, salud_id, salud_tipo, salud_plan_uf, cargas_simples, es_pensionado')
    .eq('rut', rutArg)
    .maybeSingle();
  if (!trab) { console.error('Trabajador no encontrado:', rutArg); process.exit(1); }

  const { data: contrato } = await sb
    .from('contratos')
    .select('id, empleador_id, sueldo_base, fecha_inicio, fecha_termino, tipo_contrato, horas_semanales')
    .eq('trabajador_id', trab.id)
    .eq('estado', 'activo')
    .maybeSingle();
  if (!contrato) { console.error('Contrato activo no encontrado'); process.exit(1); }

  const { data: empData } = await sb
    .from('empleadores').select('nombre, apellido, rut')
    .eq('id', contrato.empleador_id).single();

  // 2) Calcular liquidación on-the-fly (sin persistir, mode=preview)
  const snapshot = await buildSnapshotForPeriod(periodArg);
  const [py, pm] = periodArg.split('-').map(Number);
  const daysInMonth = new Date(py, pm, 0).getDate();

  // Novedades del período
  const { data: novs } = await sb
    .from('payroll_novedades')
    .select('concept_code, amount, imponible')
    .eq('empleador_id', contrato.empleador_id)
    .eq('periodo', periodArg)
    .eq('trabajador_id', trab.id);
  const variableItems = (novs ?? [])
    .filter((n: any) => !n.concept_code.startsWith('_'))
    .map((n: any) => ({ conceptCode: n.concept_code, amount: Number(n.amount), imponible: n.imponible !== false }));

  const healthType = trab.salud_tipo === 'isapre' ? HealthType.ISAPRE : HealthType.FONASA;
  const result = calculatePayroll({
    payrollPeriod: periodArg,
    country: 'CL',
    contract: {
      contractId: contrato.id, workerId: trab.id,
      legalProfileType: LegalProfileType.TCP_PUERTAS_AFUERA,
      startDate: contrato.fecha_inicio,
      baseSalary: contrato.sueldo_base,
      weeklyHours: contrato.horas_semanales ?? 45,
      workScheduleType: WorkScheduleType.PUERTAS_AFUERA,
    },
    worker: {
      rut: trab.rut, afpCode: AFP_CODE_NAME[trab.afp_id] ?? 'capital',
      healthType, isPensioner: trab.es_pensionado ?? false,
      workerTypePrevired: '31',
      familyAllowanceCount: trab.cargas_simples ?? 0,
      ...(healthType === HealthType.ISAPRE && trab.salud_plan_uf ? { isaprePlanUf: Number(trab.salud_plan_uf) } : {}),
    },
    periodEvents: { workedDays: daysInMonth },
    variableItems,
    snapshot,
    mode: 'preview',
  });

  // 3) Construir LiquidacionData
  const haberesImp: LiquidacionLineItem[] = [];
  const haberesNoImp: LiquidacionLineItem[] = [];
  const descLegales: LiquidacionLineItem[] = [];
  const descOtros: LiquidacionLineItem[] = [];
  for (const c of result.concepts) {
    if (!c.visibleInPayslip) continue;
    const item = { label: c.conceptName, amount: c.amount };
    if (c.conceptType === 'HABER') {
      if (c.imponible) haberesImp.push(item); else haberesNoImp.push(item);
    } else if (c.conceptType === 'DESCUENTO') {
      if (c.legal) descLegales.push(item); else descOtros.push(item);
    }
  }
  const sum = (xs: LiquidacionLineItem[]) => xs.reduce((a, x) => a + x.amount, 0);

  const afpRow = snapshot.afpRates.find((r: any) => r.afpCode === AFP_CODE_NAME[trab.afp_id]);
  const afpTasa = afpRow ? `${(afpRow.totalWorkerRate * 100).toFixed(2)}%` : '11.00%';
  const saludNombre = trab.salud_tipo === 'isapre' ? (SALUD_NOMBRES[trab.salud_id] ?? 'Isapre') : 'FONASA';
  const saludDetalle = trab.salud_tipo === 'isapre' && trab.salud_plan_uf
    ? `${saludNombre} ${Number(trab.salud_plan_uf).toLocaleString('es-CL')} UF`
    : saludNombre;
  const horasExtraCount = (result.calculationTrace.find((t: any) => t.code === 'HORAS_EXTRA')?.inputs as any)?.extraHours ?? 0;

  const empleadorNombre = dedupeWords(`${empData?.nombre ?? ''} ${empData?.apellido ?? ''}`.trim()) || 'Empleador';
  const trabajadorNombre = [trab.nombre, trab.apellido_paterno, trab.apellido_materno].filter(Boolean).join(' ');

  const data: LiquidacionData = {
    period: periodArg,
    empleadorNombre, empleadorRut: formatRut(empData?.rut),
    trabajadorNombre, trabajadorRut: formatRut(trab.rut),
    cargo: trab.cargo ?? undefined,
    tipoContrato: contrato.tipo_contrato === 'plazo_fijo' ? 'Plazo fijo' : 'Indefinido',
    fechaIngreso: fmtFecha(contrato.fecha_inicio),
    diasTrabajados: daysInMonth,
    horasExtras: horasExtraCount || undefined,
    sueldoBase: contrato.sueldo_base,
    afpNombre: AFP_NOMBRES[trab.afp_id] ?? `AFP ${trab.afp_id}`,
    afpTasa,
    saludNombre, saludDetalle,
    ufValor: snapshot.ufPeriodEndValue,
    haberesImponibles: haberesImp,
    haberesNoImponibles: haberesNoImp,
    descuentosLegales: descLegales,
    otrosDescuentos: descOtros,
    totalHaberesImponibles: sum(haberesImp),
    totalHaberesNoImponibles: sum(haberesNoImp),
    totalDescuentosLegales: sum(descLegales),
    totalOtrosDescuentos: sum(descOtros),
    totalHaberes: sum(haberesImp) + sum(haberesNoImp),
    totalDescuentos: sum(descLegales) + sum(descOtros),
    impPrevSalud: result.pensionBase,
    impCesantia: result.afcBase,
    baseTributable: result.incomeTaxBase,
    netPay: result.netPay,
  };

  console.log('Generando PDF…');
  console.log(`  Empleador: ${empleadorNombre} (${empData?.rut})`);
  console.log(`  Trabajador: ${trabajadorNombre} (${trab.rut})`);
  console.log(`  Período: ${periodArg}`);
  console.log(`  Líquido: $${result.netPay.toLocaleString('es-CL')}`);
  console.log(`  Conceptos: ${haberesImp.length} hab.imp + ${haberesNoImp.length} hab.no-imp + ${descLegales.length} desc.leg + ${descOtros.length} desc.otr`);

  const buffer = await renderToBuffer(React.createElement(LiquidacionDocument, { data }) as any);
  const outPath = path.resolve('liquidacion-test.pdf');
  await fs.writeFile(outPath, buffer);
  console.log(`\n✓ Generado: ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
