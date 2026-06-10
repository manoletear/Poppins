// Debug: dump items de Buk /accounting para 1 trabajador y compara con novedades.
// Uso: npx tsx scripts/debug-rene.ts [RUT] [periodo]   (default: Fernando 2026-02)

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const token = process.env.BUK_API_TOKEN!;
const base = process.env.BUK_API_BASE_URL ?? 'https://app.buk.cl/api/v1/chile';
const sb = createClient(url, key);

const rutQuery = process.argv[2] ?? '17.973.010-3';
const periodoQuery = process.argv[3] ?? '2026-02';

function fmt(n: number) { return new Intl.NumberFormat('es-CL').format(Math.round(n)); }

async function main() {
  const { data: t } = await sb
    .from('trabajadores')
    .select('id, rut, nombre, apellido_paterno, buk_employee_id')
    .eq('rut', rutQuery)
    .maybeSingle();
  if (!t) { console.log(`No se encontró trabajador con RUT ${rutQuery}`); return; }
  console.log(`Trabajador: ${t.nombre} ${t.apellido_paterno} (id=${t.id}, buk=${t.buk_employee_id})`);

  const [y, m] = periodoQuery.split('-').map(Number);
  const r = await fetch(`${base}/accounting?month=${m}&year=${y}&page=1&page_size=100`,
    { headers: { auth_token: token, Accept: 'application/json' } });
  const j: any = await r.json();
  const g = (j?.data ?? []).find((x: any) => Number(x.id) === Number(t.buk_employee_id));
  if (!g) { console.log(`Sin /accounting para ${rutQuery} en ${periodoQuery}`); return; }

  const items = g.items || [];
  const isEmpCost = (d: string) => /empleador|mutual/i.test(d);
  const debit = items.filter((x: any) => x.entry_type === 'debit');
  const credit = items.filter((x: any) => x.entry_type === 'credit');

  console.log(`\n── /accounting items (${items.length}) ────────────────`);
  console.log(`\nHABERES (entry_type=debit):`);
  for (const it of debit) {
    const emp = isEmpCost(it.description) ? '  [costo empleador]' : '';
    console.log(`  $${fmt(it.amount).padStart(12)}  ${it.description}${emp}`);
  }
  console.log(`\nDESCUENTOS (entry_type=credit):`);
  for (const it of credit) {
    console.log(`  $${fmt(it.amount).padStart(12)}  ${it.description}`);
  }

  const sumHaberes = debit.filter((x: any) => !isEmpCost(x.description)).reduce((a: number, x: any) => a + Number(x.amount || 0), 0);
  const sumHaberesEmp = debit.filter((x: any) => isEmpCost(x.description)).reduce((a: number, x: any) => a + Number(x.amount || 0), 0);
  console.log(`\nTotal haberes trabajador: $${fmt(sumHaberes)}`);
  console.log(`Total haberes empleador (excluidos del bruto): $${fmt(sumHaberesEmp)}`);

  const { data: novs } = await sb
    .from('payroll_novedades')
    .select('concept_code, amount, imponible')
    .eq('trabajador_id', t.id)
    .eq('periodo', periodoQuery);
  console.log(`\n── Novedades en BD (${novs?.length ?? 0}) ──`);
  for (const n of novs ?? []) {
    console.log(`  $${fmt(Number(n.amount)).padStart(12)}  ${n.concept_code}  imp=${n.imponible}`);
  }
  const totalNov = (novs ?? []).reduce((a: number, x: any) => a + Number(x.amount || 0), 0);
  console.log(`Total novedades: $${fmt(totalNov)}`);

  const { data: c } = await sb
    .from('contratos').select('sueldo_base, horas_semanales, tipo_jornada')
    .eq('trabajador_id', t.id).eq('estado', 'activo').maybeSingle();
  console.log(`\nContrato: sueldo_base=$${fmt(c?.sueldo_base ?? 0)} jornada=${c?.tipo_jornada} hrs=${c?.horas_semanales}`);

  const novImp = (novs ?? []).filter((n: any) => n.imponible).reduce((a: number, x: any) => a + Number(x.amount), 0);
  const novNoImp = (novs ?? []).filter((n: any) => !n.imponible).reduce((a: number, x: any) => a + Number(x.amount), 0);
  const brutoEsperado = (c?.sueldo_base ?? 0) + novImp + novNoImp;
  console.log(`\nReconstrucción: sueldo $${fmt(c?.sueldo_base ?? 0)} + nov.imp $${fmt(novImp)} + nov.no-imp $${fmt(novNoImp)} = $${fmt(brutoEsperado)}`);
  console.log(`Bruto Buk:          $${fmt(sumHaberes)}`);
  console.log(`Diferencia:         $${fmt(sumHaberes - brutoEsperado)}`);
}

main().catch(e => { console.error(e); process.exit(1); });
