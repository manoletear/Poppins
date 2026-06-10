// Sync headless de Buk → BD (TODOS los trabajadores con buk_employee_id, sin
// importar qué usuario está logueado). Usa service-role.
//
// Para cada trabajador:
//   1. GET /employees/{bukId} → actualiza sueldo_base, salud_plan_uf, fecha_termino, datos personales
//   2. GET /accounting (último mes cerrado) → guarda haberes variables en payroll_novedades
//
// Uso: npx tsx scripts/sync-buk-headless.ts [YYYY-MM]   ← período opcional (default: mes anterior)

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';
import { cleanRut } from '../src/lib/validators.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const token = process.env.BUK_API_TOKEN!;
const base = process.env.BUK_API_BASE_URL ?? 'https://app.buk.cl/api/v1/chile';
if (!url || !key || !token) { console.error('Faltan envs'); process.exit(1); }

const sb = createClient(url, key);

// Período objetivo: argv o mes anterior
const arg = process.argv[2];
const now = new Date();
const defaultPeriod = (() => {
  const dt = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
})();
const period = arg && /^\d{4}-\d{2}$/.test(arg) ? arg : defaultPeriod;
const [pYear, pMonth] = period.split('-').map(Number);
console.log(`Período objetivo: ${period}`);

const AFP: Array<{ id: number; n: string }> = [
  { id: 1, n: 'capital' }, { id: 2, n: 'cuprum' }, { id: 3, n: 'habitat' }, { id: 4, n: 'modelo' },
  { id: 5, n: 'planvital' }, { id: 6, n: 'provida' }, { id: 7, n: 'uno' },
];
const ISAPRE: Array<{ id: number; n: string }> = [
  { id: 8, n: 'banmédica' }, { id: 8, n: 'banmedica' }, { id: 9, n: 'colmena' }, { id: 10, n: 'consalud' },
  { id: 11, n: 'cruz blanca' }, { id: 12, n: 'nueva masvida' }, { id: 12, n: 'masvida' }, { id: 32, n: 'vida tres' }, { id: 33, n: 'esencial' },
];
const afpId = (name: string) => AFP.find(a => (name || '').toLowerCase().includes(a.n))?.id ?? null;
const saludMap = (name: string) => {
  const s = (name || '').toLowerCase();
  if (!s || s.includes('fonasa')) return { salud_tipo: 'fonasa', salud_id: 13 };
  return { salud_tipo: 'isapre', salud_id: ISAPRE.find(i => s.includes(i.n))?.id ?? null };
};

const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase().slice(0, 40);
// Items que NO deben pasarse como novedad (los calcula el engine o son del empleador)
// Nota: gratificación NO se filtra — el engine no la calcula, viene como item Buk.
const skipRe = /sueldo\s*base|asignaci[oó]n\s*familiar|empleador|mutual|previ|afp|isapre|fonasa|salud|cesant|impuesto|l[ií]quido/i;
// Items que son haber NO imponible (colación, movilización, viático, asignación zona, reembolsos)
const noImponibleRe = /movilizaci[oó]n|colaci[oó]n|vi[aá]tico|reembolso|asignaci[oó]n\s*(de\s*)?zona|asignaci[oó]n\s*(de\s*)?caja|aguinaldo|p[eé]rdida\s*caja/i;
// Items que son aportes del EMPLEADOR (aparecen como debit en Buk pero no son haber del trabajador)
const isEmpCost = (d: string) => /empleador|mutual|seguro\s*invalidez|cotizaci[oó]n\s*expectativa\s*de\s*vida|sis\b|afp\s*previsi[oó]n|prevision\s*empleador/i.test(d);
// Detecta el item "Sueldo Base" en /accounting (debit)
const isSueldoBase = (d: string) => /^sueldo\s*base$/i.test(d.trim());
const str = (v: any) => (typeof v === 'string' ? v : v?.name) || '';

async function bukGetEmployee(id: number): Promise<any> {
  const r = await fetch(`${base}/employees/${id}`, { headers: { auth_token: token, Accept: 'application/json' } });
  if (!r.ok) throw new Error(`buk ${r.status}`);
  const j: any = await r.json();
  // SDK Buk envuelve en {data:{...}} a veces; otras devuelve plano
  return j?.data ?? j;
}

async function bukGetAccounting(month: number, year: number) {
  const groups: Array<{ id: number; items?: Array<{ description: string; amount: number; entry_type: string }> }> = [];
  let page = 1, totalPages = 1;
  do {
    const r = await fetch(`${base}/accounting?month=${month}&year=${year}&page=${page}&page_size=100`,
      { headers: { auth_token: token, Accept: 'application/json' } });
    if (!r.ok) break;
    const j: any = await r.json();
    if (Array.isArray(j?.data)) groups.push(...j.data);
    totalPages = Number(j?.pagination?.total_pages) || 1;
    page++;
  } while (page <= totalPages);
  return groups;
}

async function main() {
  // 1) Todos los trabajadores con buk_employee_id (y su contrato activo)
  const { data: contratos, error } = await sb
    .from('contratos')
    .select('id, trabajador_id, empleador_id, sueldo_base, horas_semanales, trabajadores(id, rut, nombre, apellido_paterno, buk_employee_id)')
    .eq('estado', 'activo');
  if (error) { console.error(error); process.exit(1); }

  const candidatos = (contratos ?? []).filter((c: any) => c.trabajadores?.buk_employee_id);
  console.log(`${candidatos.length} contratos con buk_employee_id\n`);

  // 2) Sync por trabajador
  let actualizados = 0;
  const bukIdsValidos: Array<{ contrato: any; bukId: number }> = [];
  for (const c of candidatos as any[]) {
    const t = c.trabajadores;
    process.stdout.write(`  ${t.rut} ${t.nombre} ${t.apellido_paterno}`);
    let emp: any;
    try { emp = await bukGetEmployee(t.buk_employee_id); }
    catch (e: any) { console.log(`  ❌ Buk: ${e.message}`); continue; }

    const cj = emp.current_job ?? {};
    const sueldoBase = Number(cj.base_wage ?? cj.assignable_salary ?? cj.liquid_wage ?? cj.salary ?? cj.base_salary ?? emp.base_salary ?? 0);
    const horasSem = Number(cj.weekly_hours ?? 0);
    const fechaTermino = cj.end_date || cj.contract_finishing_date_1 || null;
    const afp = str(emp.pension_fund) || str(emp.afp);
    const salud = str(emp.health_company) || str(emp.health_plan) || 'Fonasa';
    const planUf = Number(emp.health_plan_uf ?? emp.health_plan?.uf ?? 0) || 0;
    const { salud_tipo, salud_id } = saludMap(salud);
    const _afpId = afpId(afp);
    const previsionOk = _afpId != null && salud_id != null && (salud_tipo === 'fonasa' || planUf > 0);

    const trabUpd: any = {
      afp_id: _afpId, salud_id, salud_tipo,
      salud_plan_uf: salud_tipo === 'isapre' && planUf > 0 ? planUf : null,
      prevision_verificada_at: new Date().toISOString(),
      prevision_estado: previsionOk ? 'vigente' : 'pendiente',
    };
    const contratoUpd: any = { fecha_termino: fechaTermino };
    // base_wage de Buk es a veces $1 placeholder — solo confiar si > 100.000.
    // Si es menor, el paso 3a corregirá desde /accounting (fuente confiable).
    if (sueldoBase >= 100000) contratoUpd.sueldo_base = sueldoBase;
    if (horasSem > 0) contratoUpd.horas_semanales = horasSem;

    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      sb.from('trabajadores').update(trabUpd).eq('id', t.id),
      sb.from('contratos').update(contratoUpd).eq('id', c.id),
    ]);
    if (e1 || e2) { console.log(`  ❌ DB: ${e1?.message || e2?.message}`); continue; }
    console.log(`  ✓ sueldo=$${sueldoBase.toLocaleString('es-CL')} ${salud_tipo}${planUf ? ` planUF=${planUf}` : ''}`);
    actualizados++;
    bukIdsValidos.push({ contrato: c, bukId: t.buk_employee_id });
  }
  console.log(`\nSync personal: ${actualizados}/${candidatos.length} OK\n`);

  // 3) Bajar /accounting del período y poblar payroll_novedades + corregir sueldo
  console.log(`Bajando /accounting ${period}…`);
  const groups = await bukGetAccounting(pMonth, pYear);
  console.log(`  ${groups.length} grupos en Buk\n`);

  // 3a) Corregir sueldo_base usando el item "Sueldo Base" de /accounting cuando
  // current_job.base_wage sea un placeholder ($1 u otro valor sospechosamente bajo).
  for (const { contrato, bukId } of bukIdsValidos) {
    const g = groups.find(x => Number(x.id) === Number(bukId));
    if (!g) continue;
    const sb_item = (g.items ?? []).find(it => it.entry_type === 'debit' && isSueldoBase(it.description));
    if (!sb_item) continue;
    const real = Number(sb_item.amount) || 0;
    const dbVal = Number(contrato.sueldo_base) || 0;
    if (real > 0 && real !== dbVal) {
      await sb.from('contratos').update({ sueldo_base: real }).eq('id', contrato.id);
      console.log(`  ${contrato.trabajadores.rut}: sueldo_base ${dbVal} → ${real} (desde /accounting)`);
    }
  }

  // Borrar y recargar novedades del período para los trabajadores sincronizados
  const trabIds = bukIdsValidos.map(b => b.contrato.trabajador_id);
  const empIds = [...new Set(bukIdsValidos.map(b => b.contrato.empleador_id))];
  if (trabIds.length > 0) {
    for (const empId of empIds) {
      await sb.from('payroll_novedades')
        .delete()
        .eq('empleador_id', empId)
        .eq('periodo', period)
        .in('trabajador_id', trabIds);
    }
  }

  const novedades: Array<{ empleador_id: string; trabajador_id: string; periodo: string; concept_code: string; amount: number; imponible: boolean }> = [];
  for (const { contrato, bukId } of bukIdsValidos) {
    const g = groups.find(x => Number(x.id) === Number(bukId));
    if (!g) { console.log(`  ${contrato.trabajadores.rut}: sin /accounting`); continue; }
    let imp = 0, nimp = 0;
    for (const it of g.items ?? []) {
      if (it.entry_type !== 'debit') continue;
      if (isEmpCost(it.description)) continue;
      if (skipRe.test(it.description)) continue;
      const amt = Number(it.amount) || 0;
      if (amt <= 0) continue;
      const imponible = !noImponibleRe.test(it.description);
      novedades.push({
        empleador_id: contrato.empleador_id,
        trabajador_id: contrato.trabajador_id,
        periodo: period,
        concept_code: slug(it.description),
        amount: amt,
        imponible,
      });
      if (imponible) imp++; else nimp++;
    }
    console.log(`  ${contrato.trabajadores.rut}: ${imp} imp + ${nimp} no-imp = ${imp + nimp} novedades`);
  }
  if (novedades.length > 0) {
    const { error } = await sb.from('payroll_novedades').insert(novedades);
    if (error) console.log(`  ❌ Insert: ${error.message}`);
    else console.log(`\nInsertadas ${novedades.length} novedades en ${period}.`);
  }
  console.log('\nFin sync.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
