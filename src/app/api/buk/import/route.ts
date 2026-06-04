import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmployees, getEmployee } from '@/lib/buk';
import { cleanRut } from '@/lib/validators';

// Importa los empleados del sistema externo de RRHH como trabajadores de Poppins
// (con su contrato). Marca blanca: el front nunca nombra el sistema.
export const runtime = 'nodejs';

const AFP: { id: number; n: string }[] = [
  { id: 1, n: 'capital' }, { id: 2, n: 'cuprum' }, { id: 3, n: 'habitat' }, { id: 4, n: 'modelo' },
  { id: 5, n: 'planvital' }, { id: 6, n: 'provida' }, { id: 7, n: 'uno' },
];
const ISAPRE: { id: number; n: string }[] = [
  { id: 8, n: 'banmédica' }, { id: 8, n: 'banmedica' }, { id: 9, n: 'colmena' }, { id: 10, n: 'consalud' },
  { id: 11, n: 'cruz blanca' }, { id: 12, n: 'nueva masvida' }, { id: 12, n: 'masvida' }, { id: 32, n: 'vida tres' }, { id: 33, n: 'esencial' },
];

function afpId(name: string): number | null {
  const s = (name || '').toLowerCase();
  return AFP.find((a) => s.includes(a.n))?.id ?? null;
}
function saludMap(name: string): { salud_tipo: string; salud_id: number | null } {
  const s = (name || '').toLowerCase();
  if (!s || s.includes('fonasa')) return { salud_tipo: 'fonasa', salud_id: 13 };
  return { salud_tipo: 'isapre', salud_id: ISAPRE.find((i) => s.includes(i.n))?.id ?? null };
}
function tipoCuenta(v: string): string | null {
  const s = (v || '').toLowerCase();
  if (s.includes('corriente')) return 'corriente';
  if (s.includes('vista')) return 'vista';
  if (s.includes('rut')) return 'rut';
  if (s.includes('ahorro')) return 'ahorro';
  return v ? v.slice(0, 30) : null;
}
const orNull = (v: any) => (v && String(v).trim() !== '' ? String(v).trim() : null);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: perfil } = await supabase.from('user_profiles').select('empleador_id').eq('auth_user_id', user.id).maybeSingle();
  let empleadorId = perfil?.empleador_id as string | undefined;
  if (!empleadorId) {
    const { data: emp } = await supabase.from('empleadores').select('id').eq('auth_user_id', user.id).maybeSingle();
    empleadorId = emp?.id;
  }
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });
  const { data: empRow } = await supabase.from('empleadores').select('rut').eq('id', empleadorId).maybeSingle();
  const empRutNorm = cleanRut(empRow?.rut || '').toLowerCase();

  let externos: any[];
  try { externos = await getEmployees(); }
  catch { return NextResponse.json({ ok: false, error: 'sistema_no_disponible' }); }

  const { data: contratosExist } = await supabase.from('contratos').select('trabajadores(rut)').eq('empleador_id', empleadorId);
  const rutsExistentes = new Set((contratosExist || []).map((c: any) => cleanRut(c.trabajadores?.rut || '').toLowerCase()).filter(Boolean));

  let imported = 0, skipped = 0;
  const errors: string[] = [];

  for (const ext of externos) {
    const rn = cleanRut(ext.rut || '').toLowerCase();
    if (!rn || rn === empRutNorm || rutsExistentes.has(rn)) { skipped++; continue; }
    let full: any;
    try { full = await getEmployee(ext.id); } catch { errors.push(`detalle ${ext.rut}`); continue; }

    const { salud_tipo, salud_id } = saludMap(full.salud);
    const trabId = crypto.randomUUID();
    const sexo = full.sexo === 'M' || full.sexo === 'F' ? full.sexo : null;
    const { error: tErr } = await supabase.from('trabajadores').insert({
      id: trabId,
      nombre: full.nombre, apellido_paterno: full.apellido, apellido_materno: orNull(full.apellidoMaterno),
      rut: full.rut, fecha_nacimiento: orNull(full.fechaNacimiento), sexo,
      estado_civil: orNull(full.estadoCivil), nacionalidad: orNull(full.nacionalidad),
      email: orNull(full.email), telefono: orNull(full.telefono), direccion: orNull(full.direccion),
      comuna: orNull(full.comuna), region: orNull(full.region),
      afp_id: afpId(full.afp), salud_id, salud_tipo,
      cargas_simples: Number(full.cargas) || 0, tipo_gratificacion: 'art_50',
      cargo: full.cargo, banco: orNull(full.banco), tipo_cuenta: tipoCuenta(full.tipoCuenta), numero_cuenta: orNull(full.numeroCuenta),
      buk_employee_id: ext.id, estado: 'activo',
    });
    if (tErr) { errors.push(`crear ${full.rut}`); continue; }

    const { error: cErr } = await supabase.from('contratos').insert({
      trabajador_id: trabId, empleador_id: empleadorId,
      numero_contrato: `PA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      sueldo_base: Number(full.sueldoBase) || 0,
      fecha_inicio: full.fechaIngreso || new Date().toISOString().split('T')[0],
      tipo_contrato: 'indefinido', tipo_jornada: 'completa', horas_semanales: 45,
      tipo_gratificacion: 'art_50', tiene_gratificacion: true, cargo: full.cargo, estado: 'activo',
    });
    if (cErr) { errors.push(`contrato ${full.rut}`); continue; }
    imported++;
  }

  return NextResponse.json({ ok: true, imported, skipped, errors });
}
