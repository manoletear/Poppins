// Aplica una migración SQL al proyecto Supabase usando service-role.
// Uso: node scripts/apply-migration.mjs supabase/migrations/20260608_prevision_vigencia.sql
//
// Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
// Usa el endpoint REST de PostgREST con función `exec_sql` si existe, o pg-meta
// via PostgreSQL connection string si SUPABASE_DB_URL está set.

import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

config({ path: '.env.local' });

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/apply-migration.mjs <archivo.sql>');
  process.exit(1);
}

const sql = fs.readFileSync(path.resolve(file), 'utf8');

const dbUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Falta SUPABASE_DB_URL en .env.local (connection string Postgres directo).');
  console.error('Obtén la URL desde Supabase Studio → Project Settings → Database → Connection string (URI).');
  console.error('Ejemplo: postgresql://postgres.<ref>:<pass>@aws-0-us-west-1.pooler.supabase.com:6543/postgres');
  process.exit(2);
}

const { default: pg } = await import('pg');
const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
await client.connect();
try {
  console.log(`Aplicando ${file}…`);
  await client.query(sql);
  console.log('OK');
} catch (e) {
  console.error('Error aplicando migración:', e.message);
  process.exit(3);
} finally {
  await client.end();
}
