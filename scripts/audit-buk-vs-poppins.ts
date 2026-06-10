// Auditoría exhaustiva: qué nos ofrece Buk vs qué tiene Poppins.
// Llama múltiples endpoints de Buk + dumpea el schema completo del primer trabajador.

import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });

const token = process.env.BUK_API_TOKEN!;
const base = process.env.BUK_API_BASE_URL ?? 'https://app.buk.cl/api/v1/chile';

async function probe(path: string, label?: string): Promise<any> {
  const url = `${base}${path}`;
  try {
    const r = await fetch(url, { headers: { auth_token: token, Accept: 'application/json' } });
    const j = r.ok ? await r.json() : null;
    const ok = r.ok ? '✓' : `✗(${r.status})`;
    console.log(`${ok}  GET ${path}${label ? ` — ${label}` : ''}`);
    if (j?.data) console.log(`     ${Array.isArray(j.data) ? `${j.data.length} items` : 'object'}`);
    return j;
  } catch (e: any) {
    console.log(`✗  GET ${path} — ${e.message}`);
    return null;
  }
}

async function main() {
  console.log('═══ ENDPOINTS BUK DISPONIBLES ═══\n');

  // Empleados
  const emps = await probe('/employees?page=1&page_size=5', 'lista empleados');
  console.log('');

  // Detalle del primer empleado: TODOS los campos
  const firstEmp = emps?.data?.[0];
  if (firstEmp?.id) {
    console.log(`═══ DETALLE EMPLEADO ${firstEmp.id} (${firstEmp.rut ?? '?'}) ═══`);
    const detail = await probe(`/employees/${firstEmp.id}`);
    if (detail?.data) {
      const e = detail.data;
      console.log('\nCampos top-level disponibles:');
      Object.keys(e).sort().forEach(k => {
        const v = e[k];
        const t = v === null ? 'null' : typeof v === 'object' ? (Array.isArray(v) ? `array[${v.length}]` : 'object') : typeof v;
        console.log(`  ${k.padEnd(40)} ${t}`);
      });

      if (e.current_job) {
        console.log('\ncurrent_job:');
        Object.keys(e.current_job).sort().forEach(k => {
          const v = e.current_job[k];
          const t = v === null ? 'null' : typeof v === 'object' ? (Array.isArray(v) ? `array[${v.length}]` : 'object') : typeof v;
          console.log(`  ${k.padEnd(40)} ${t}`);
        });
      }

      if (e.custom_attributes) {
        console.log('\ncustom_attributes:');
        const ca = Array.isArray(e.custom_attributes) ? e.custom_attributes : [e.custom_attributes];
        ca.forEach((c: any) => console.log(`  ${c.name?.padEnd(40)} = ${JSON.stringify(c.value).slice(0, 60)}`));
      }

      if (e.family_responsabilities?.length > 0) {
        console.log('\nfamily_responsabilities[0]:');
        Object.keys(e.family_responsabilities[0]).forEach(k =>
          console.log(`  ${k}`)
        );
      }
    }
  }
  console.log('');

  // Otros endpoints potenciales
  console.log('═══ EXPLORANDO OTROS ENDPOINTS ═══');
  await probe('/companies', 'empresas/empleadores');
  await probe('/branches', 'sucursales');
  await probe('/areas', 'áreas');
  await probe('/cost_centers', 'centros de costo');
  await probe('/locations', 'localidades');
  await probe('/roles', 'cargos/roles');
  await probe('/contracts', 'contratos');
  await probe('/process', 'procesos payroll (cabecera)');
  await probe('/payroll_processes', 'procesos payroll');
  await probe('/payroll_concepts', 'conceptos payroll');
  await probe('/overtime', 'horas extra');
  await probe('/loans', 'préstamos');
  await probe('/advances', 'anticipos');
  await probe('/bonuses', 'bonos');
  await probe('/bonifications', 'bonificaciones');
  await probe('/advances_payments', 'pago anticipos');
  await probe('/payment_methods', 'métodos pago');
  await probe('/banks', 'bancos');
  await probe('/health_plans', 'planes salud');
  await probe('/pension_funds', 'AFP');
  await probe('/wage_assignments', 'embargos/asignaciones');
  await probe('/training', 'capacitaciones SENCE');
  await probe('/evaluations', 'evaluaciones desempeño');
  await probe('/documents', 'documentos por trabajador');
  await probe('/contracts_files', 'archivos de contrato');
  await probe('/family_allowance_levels', 'tramos asignación familiar');
  await probe('/economic_indicators', 'indicadores económicos UF/UTM');
  await probe('/accounting?month=2&year=2026&page=1&page_size=1', 'accounting mes (ya conocido)');
  await probe('/vacations?page=1&page_size=1', 'vacaciones');
  await probe('/absences?page=1&page_size=1', 'ausencias/licencias');
  await probe('/benefits', 'beneficios');
  await probe('/announcements', 'anuncios');
  await probe('/news', 'noticias');
  await probe('/notifications', 'notificaciones');
  await probe('/users', 'usuarios sistema');
  await probe('/permissions', 'permisos');
  await probe('/audit', 'audit log');

  console.log('\n═══ FIN AUDITORÍA ═══');
}

main().catch(e => { console.error(e); process.exit(1); });
