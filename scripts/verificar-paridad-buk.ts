// Verifica paridad de cálculo nuevo (payroll-cl engine) vs. datos cached de Buk.
//
// Para cada trabajador activo:
//   1. Lee datos previsionales (con nuevos campos)
//   2. Valida previsión
//   3. Para el último período que existe en buk_payroll_cache:
//      - Ejecuta el engine con los inputs reales
//      - Compara líquido / haberes / descuentos vs. Buk
//      - Reporta diferencias
//
// Uso: SUPABASE_SERVICE_ROLE_KEY=... NEXT_PUBLIC_SUPABASE_URL=... npx tsx scripts/verificar-paridad-buk.ts

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { calculatePayroll } from '../src/lib/payroll-cl/engine.js';
import { buildSnapshotForPeriod } from '../src/lib/payroll-cl/snapshot-builder.js';
import { validarPrevision } from '../src/lib/payroll-cl/validacion-prevision.js';
import { HealthType, LegalProfileType, WorkScheduleType } from '../src/lib/payroll-cl/types/enums.js';
import type { PayrollEngineInput } from '../src/lib/payroll-cl/types/payroll.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!url || !key) { console.error('Faltan envs'); process.exit(1); }

const sb = createClient(url, key);

const AFP_CODE_NAME: Record<number, string> = {
  1: 'capital', 2: 'cuprum', 3: 'habitat', 4: 'modelo',
  5: 'planvital', 6: 'provida', 7: 'uno',
};

function fmt(n: number) { return new Intl.NumberFormat('es-CL').format(Math.round(n)); }
function diff(a: number, b: number) { const d = a - b; return d === 0 ? '✓' : `Δ ${d > 0 ? '+' : ''}${fmt(d)}`; }

async function main() {
  // 1) Catálogos
  const [{ data: catAfps }, { data: catIsapres }] = await Promise.all([
    sb.from('cat_afp').select('id, codigo, activa'),
    sb.from('cat_isapre').select('id, codigo, tipo, activa'),
  ]);
  const catalogo = {
    afps: (catAfps ?? []) as any[],
    isapres: (catIsapres ?? []) as any[],
  };
  console.log(`Catálogos: ${catalogo.afps.length} AFP, ${catalogo.isapres.length} salud`);

  // 2) Trabajadores activos
  const { data: contratos } = await sb
    .from('contratos')
    .select(`
      id, trabajador_id, sueldo_base, fecha_inicio, fecha_termino,
      horas_semanales, tipo_jornada, empleador_id,
      trabajadores (
        id, rut, nombre, apellido_paterno, apellido_materno,
        afp_id, salud_id, salud_tipo, salud_plan_uf,
        prevision_verificada_at, prevision_estado,
        cargas_simples, es_pensionado, buk_employee_id
      )
    `)
    .eq('estado', 'activo');

  if (!contratos || contratos.length === 0) {
    console.log('Sin contratos activos.');
    return;
  }
  console.log(`\n${contratos.length} contratos activos encontrados.\n`);

  // 3) Para cada trabajador: validar previsión + buscar último período Buk + ejecutar engine
  for (const c of contratos as any[]) {
    const t = c.trabajadores;
    const nombreCompleto = `${t.nombre} ${t.apellido_paterno}`.trim();
    console.log(`\n══════ ${t.rut}  ${nombreCompleto}  (empleador ${c.empleador_id.slice(0,8)}…) ══════`);

    // Validación previsión
    const v = validarPrevision(
      {
        id: t.id, rut: t.rut, nombre: nombreCompleto,
        afp_id: t.afp_id, salud_id: t.salud_id, salud_tipo: t.salud_tipo,
        salud_plan_uf: t.salud_plan_uf,
        prevision_verificada_at: t.prevision_verificada_at,
        prevision_estado: t.prevision_estado,
      },
      catalogo,
    );
    console.log(`  Previsión:    ${v.estado}  ${v.ok ? 'OK' : '❌'}  ${v.errores.join('; ')}`);
    if (v.warnings.length) console.log(`  Warnings:     ${v.warnings.join('; ')}`);
    console.log(`  AFP id=${t.afp_id} | Salud id=${t.salud_id}/${t.salud_tipo} | Plan UF=${t.salud_plan_uf ?? '–'} | Verificada=${t.prevision_verificada_at ?? '–'}`);

    // Buscar último período en Buk cache para este trabajador
    if (!t.buk_employee_id) { console.log('  (sin buk_employee_id, skip paridad)'); continue; }

    let cacheRows: any[] | null = null;
    {
      const { data } = await sb
        .from('buk_payroll_cache')
        .select('periodo, data')
        .eq('employee_id', t.buk_employee_id)
        .order('periodo', { ascending: false })
        .limit(1);
      cacheRows = data;
    }

    // Si cache vacía, intentar bajarla directamente desde Buk API (último mes del año actual)
    if (!cacheRows || cacheRows.length === 0) {
      console.log('  (cache vacía, consultando Buk directo…)');
      const token = process.env.BUK_API_TOKEN!;
      const base  = process.env.BUK_API_BASE_URL ?? 'https://app.buk.cl/api/v1/chile';
      const now = new Date();
      let found: any = null;
      for (let m = 0; m < 6 && !found; m++) {
        const dt = new Date(now.getFullYear(), now.getMonth() - m, 1);
        const month = dt.getMonth() + 1, year = dt.getFullYear();
        try {
          const r = await fetch(`${base}/accounting?month=${month}&year=${year}&page=1&page_size=100`,
            { headers: { auth_token: token, Accept: 'application/json' } });
          if (!r.ok) continue;
          const j: any = await r.json();
          const g = (j?.data ?? []).find((x: any) => Number(x.id) === Number(t.buk_employee_id));
          if (!g) continue;
          const items = g.items || [];
          const isEmpCost = (d: string) => /empleador|mutual/i.test(d);
          const sumPos = (re: RegExp) => items.filter((x: any) => x.entry_type === 'debit' && re.test(x.description) && !isEmpCost(x.description)).reduce((a: number, x: any) => a + (Number(x.amount) || 0), 0);
          const sumNeg = (re: RegExp) => items.filter((x: any) => x.entry_type === 'credit' && re.test(x.description) && !isEmpCost(x.description)).reduce((a: number, x: any) => a + (Number(x.amount) || 0), 0);
          const liqItem = items.find((x: any) => /l[ií]quido/i.test(x.description));
          const haberes = items.filter((x: any) => x.entry_type === 'debit' && !isEmpCost(x.description));
          const descuentos = items.filter((x: any) => x.entry_type === 'credit' && !/l[ií]quido/i.test(x.description) && !isEmpCost(x.description));
          const total = haberes.reduce((a: number, x: any) => a + (Number(x.amount) || 0), 0);
          found = {
            periodo: `${year}-${String(month).padStart(2, '0')}`,
            data: {
              sueldoBruto: total,
              descAfp: sumNeg(/previsi|afp/i),
              descSalud: sumNeg(/isapre|fonasa|salud/i),
              descCesantia: sumNeg(/cesant/i),
              impuestoUnico: sumNeg(/impuesto/i),
              liquido: liqItem ? Number(liqItem.amount) || 0 : total - descuentos.reduce((a: number, x: any) => a + (Number(x.amount) || 0), 0),
            },
          };
        } catch { /* continue */ }
      }
      if (!found) { console.log('  (Buk no devolvió liquidaciones para ningún mes reciente, skip)'); continue; }
      cacheRows = [found];
    }
    const buk = cacheRows[0];
    const periodo = buk.periodo;
    const buk_d = buk.data as any;
    console.log(`  Último Buk:   periodo=${periodo} liquido=$${fmt(buk_d.liquido)} bruto=$${fmt(buk_d.sueldoBruto)}`);

    // Snapshot del período
    let snapshot;
    try { snapshot = await buildSnapshotForPeriod(periodo); }
    catch (e: any) { console.log(`  ❌ Snapshot no disponible: ${e.message}`); continue; }

    const healthType = t.salud_tipo === 'isapre' ? HealthType.ISAPRE : HealthType.FONASA;
    const afpCode = AFP_CODE_NAME[t.afp_id] ?? 'capital';

    // Cargar novedades sync'eadas del período (si las hay)
    const { data: novs } = await sb
      .from('payroll_novedades')
      .select('concept_code, amount, imponible')
      .eq('empleador_id', c.empleador_id)
      .eq('periodo', periodo)
      .eq('trabajador_id', c.trabajador_id);
    const variableItems = (novs ?? [])
      .filter((n: any) => !n.concept_code.startsWith('_'))
      .map((n: any) => ({ conceptCode: n.concept_code, amount: Number(n.amount), imponible: n.imponible !== false }));
    const novImp = variableItems.filter(v => v.imponible).reduce((a, x) => a + x.amount, 0);
    const novNoImp = variableItems.filter(v => !v.imponible).reduce((a, x) => a + x.amount, 0);
    if (variableItems.length > 0) console.log(`  Novedades:    ${variableItems.length} items (imp=$${fmt(novImp)} no-imp=$${fmt(novNoImp)})`);

    const [py, pm] = periodo.split('-').map(Number);
    const daysInMonth = new Date(py, pm, 0).getDate();
    const input: PayrollEngineInput = {
      payrollPeriod: periodo,
      country: 'CL',
      contract: {
        contractId: c.id, workerId: c.trabajador_id,
        legalProfileType: LegalProfileType.TCP_PUERTAS_AFUERA,
        startDate: c.fecha_inicio,
        baseSalary: c.sueldo_base,
        weeklyHours: c.horas_semanales ?? 45,
        workScheduleType: WorkScheduleType.PUERTAS_AFUERA,
      },
      worker: {
        rut: t.rut, afpCode, healthType,
        isPensioner: t.es_pensionado ?? false,
        workerTypePrevired: '31',
        familyAllowanceCount: t.cargas_simples ?? 0,
        ...(healthType === HealthType.ISAPRE && t.salud_plan_uf ? { isaprePlanUf: Number(t.salud_plan_uf) } : {}),
      },
      periodEvents: { workedDays: daysInMonth },
      variableItems,
      snapshot,
      mode: 'preview',
    };

    try {
      const r = calculatePayroll(input);
      const dAfp = (buk_d.descAfp ?? 0) as number;
      const dSalud = (buk_d.descSalud ?? 0) as number;
      const dCes = (buk_d.descCesantia ?? 0) as number;
      const dIut = (buk_d.impuestoUnico ?? 0) as number;
      console.log(`  Engine vs Buk (deltas):`);
      console.log(`    Bruto/Haberes:  engine=${fmt(r.grossIncome)}  buk=${fmt(buk_d.sueldoBruto)}  ${diff(r.grossIncome, buk_d.sueldoBruto)}`);
      console.log(`    AFP 10%:        engine=${fmt(r.employeeDeductions.afp10 + r.employeeDeductions.afpCommission)}  buk=${fmt(dAfp)}  ${diff(r.employeeDeductions.afp10 + r.employeeDeductions.afpCommission, dAfp)}`);
      console.log(`    Salud 7%:       engine=${fmt(r.employeeDeductions.health7)}  buk=${fmt(dSalud)}  ${diff(r.employeeDeductions.health7, dSalud)}`);
      console.log(`    Cesantía AFC:   engine=${fmt(r.employeeDeductions.other)}  buk=${fmt(dCes)}  (other incluye AFC+isapre dif+ausencia)`);
      console.log(`    Imp. Único:     engine=${fmt(r.employeeDeductions.incomeTax)}  buk=${fmt(dIut)}  ${diff(r.employeeDeductions.incomeTax, dIut)}`);
      console.log(`    LÍQUIDO:        engine=${fmt(r.netPay)}  buk=${fmt(buk_d.liquido)}  ${diff(r.netPay, buk_d.liquido)}`);
      if (r.warnings.length) console.log(`    Warnings engine: ${r.warnings.join('; ')}`);
    } catch (e: any) {
      console.log(`  ❌ Engine error: ${e.message}`);
    }
  }

  console.log('\nFin verificación.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
