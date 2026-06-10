// Verifica que el embed payroll_results → trabajadores funcione tras aplicar FKs.
import { config as dotenvConfig } from 'dotenv';
dotenvConfig({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
  const empleadorId = '73bd67ec-9e93-4e39-90c6-daa672393f56';
  const { data, error } = await sb
    .from('payroll_results')
    .select('worker_id, net_pay, trabajadores ( rut, nombre, apellido_paterno )')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', '2026-02')
    .eq('voided', false);
  console.log('error:', error);
  console.log('rows:', data?.length);
  for (const r of data ?? []) {
    const t = (r as any).trabajadores;
    console.log(`  ${t?.rut} ${t?.nombre} ${t?.apellido_paterno} → $${r.net_pay?.toLocaleString('es-CL')}`);
  }
}
main();
