import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEmployees, getEmployee } from '@/lib/buk';
import { cleanRut } from '@/lib/validators';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

// [BOOTSTRAP ONLY] Importa los empleados del sistema externo de RRHH como
// trabajadores de Poppins (con su contrato). Marca blanca: el front nunca
// nombra el sistema.
//
// Se usa UNA VEZ por cliente nuevo. La operación posterior (alta, edición,
// novedades, cierre, descargas) es 100% Poppins nativo. Ver docs/buk-bootstrap.md
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

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });
  const { data: empRow } = await supabase.from('empleadores').select('rut').eq('id', empleadorId).maybeSingle();
  const empRutNorm = cleanRut(empRow?.rut || '').toLowerCase();

  let externos: any[];
  try { externos = await getEmployees(); }
  catch { return NextResponse.json({ ok: false, error: 'sistema_no_disponible' }); }

  // Mapa RUT → trabajador+contrato existente (para actualizar en lugar de saltar)
  const { data: contratosExist } = await supabase
    .from('contratos')
    .select('id, trabajador_id, trabajadores(id, rut)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');
  const existentePorRut = new Map<string, { trabajadorId: string; contratoId: string }>();
  for (const c of contratosExist ?? []) {
    const rn = cleanRut((c as any).trabajadores?.rut || '').toLowerCase();
    if (rn) existentePorRut.set(rn, { trabajadorId: (c as any).trabajadores.id, contratoId: (c as any).id });
  }

  let imported = 0, updated = 0, skipped = 0;
  const errors: string[] = [];
  const trabajadoresConBuk: Array<{ trabajadorId: string; bukId: number }> = [];

  for (const ext of externos) {
    const rn = cleanRut(ext.rut || '').toLowerCase();
    if (!rn || rn === empRutNorm) { skipped++; continue; }
    let full: any;
    try { full = await getEmployee(ext.id); } catch { errors.push(`detalle ${ext.rut}`); continue; }

    const { salud_tipo, salud_id } = saludMap(full.salud);
    const afp_id = afpId(full.afp);
    const planUf = Number(full.saludPlanUf) || 0;
    const previsionOk = afp_id != null && salud_id != null && (salud_tipo === 'fonasa' || planUf > 0);
    const previsionFields = {
      afp_id, salud_id, salud_tipo,
      salud_plan_uf: salud_tipo === 'isapre' && planUf > 0 ? planUf : null,
      prevision_verificada_at: new Date().toISOString(),
      prevision_estado: previsionOk ? 'vigente' : 'pendiente',
      buk_employee_id: ext.id,
      // Datos extra Buk
      pension_regime: full.regimenPrevisional || null,
      payment_method: full.metodoPago || null,
      payment_period: full.periodoPago || null,
      progressive_vacations_start: full.inicioVacacionesProgresivas || null,
      retired: !!full.jubilado,
    };

    // Trabajador existente → actualizar previsión + datos personales + sueldo del contrato
    const existente = existentePorRut.get(rn);
    if (existente) {
      const { error: errT } = await supabase
        .from('trabajadores')
        .update({
          ...previsionFields,
          nombre: full.nombre, apellido_paterno: full.apellido, apellido_materno: orNull(full.apellidoMaterno),
          fecha_nacimiento: orNull(full.fechaNacimiento),
          email: orNull(full.email), telefono: orNull(full.telefono),
          cargas_simples: Number(full.cargas) || 0,
        })
        .eq('id', existente.trabajadorId);
      if (errT) { errors.push(`actualizar trab ${full.rut}: ${errT.message}`); continue; }

      const nuevoSueldo = Number(full.sueldoBase) || 0;
      const contratoUpdate: Record<string, any> = {
        fecha_termino: orNull(full.fechaTerminoContrato),
        cargo: full.cargo,
      };
      if (nuevoSueldo > 0) contratoUpdate.sueldo_base = nuevoSueldo;
      if (Number(full.horasSemanales) > 0) contratoUpdate.horas_semanales = Number(full.horasSemanales);
      const { error: errC } = await supabase.from('contratos').update(contratoUpdate).eq('id', existente.contratoId);
      if (errC) errors.push(`actualizar contrato ${full.rut}: ${errC.message}`);
      else updated++;
      trabajadoresConBuk.push({ trabajadorId: existente.trabajadorId, bukId: ext.id });
      continue;
    }

    // Trabajador nuevo
    const trabId = crypto.randomUUID();
    const sexo = full.sexo === 'M' || full.sexo === 'F' ? full.sexo : null;
    const { error: tErr } = await supabase.from('trabajadores').insert({
      id: trabId,
      nombre: full.nombre, apellido_paterno: full.apellido, apellido_materno: orNull(full.apellidoMaterno),
      rut: full.rut, fecha_nacimiento: orNull(full.fechaNacimiento), sexo,
      estado_civil: orNull(full.estadoCivil), nacionalidad: orNull(full.nacionalidad),
      email: orNull(full.email), telefono: orNull(full.telefono), direccion: orNull(full.direccion),
      comuna: orNull(full.comuna), region: orNull(full.region),
      ...previsionFields,
      cargas_simples: Number(full.cargas) || 0, tipo_gratificacion: 'art_50',
      cargo: full.cargo, banco: orNull(full.banco), tipo_cuenta: tipoCuenta(full.tipoCuenta), numero_cuenta: orNull(full.numeroCuenta),
      estado: 'activo',
    });
    if (tErr) { errors.push(`crear ${full.rut}`); continue; }

    const { error: cErr } = await supabase.from('contratos').insert({
      trabajador_id: trabId, empleador_id: empleadorId,
      numero_contrato: `PA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      sueldo_base: Number(full.sueldoBase) || 0,
      fecha_inicio: full.fechaIngreso || new Date().toISOString().split('T')[0],
      fecha_termino: orNull(full.fechaTerminoContrato),
      tipo_contrato: 'indefinido', tipo_jornada: 'completa', horas_semanales: 45,
      tipo_gratificacion: 'art_50', tiene_gratificacion: true, cargo: full.cargo, estado: 'activo',
    });
    if (cErr) { errors.push(`contrato ${full.rut}`); continue; }
    trabajadoresConBuk.push({ trabajadorId: trabId, bukId: ext.id });
    imported++;
  }

  // ── Sync de novedades del último período cerrado (mes anterior al actual) ──
  // Bajamos /accounting?month=X&year=Y desde Buk y guardamos los haberes
  // variables (los que no son sueldo base / asignación familiar / costos
  // empleador) como filas en payroll_novedades para que el engine los reciba
  // como variableItems en el próximo cálculo.
  let novedadesSynced = 0;
  if (trabajadoresConBuk.length > 0) {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const month = target.getMonth() + 1;
    const year = target.getFullYear();
    const period = `${year}-${String(month).padStart(2, '0')}`;
    const token = process.env.BUK_API_TOKEN || '';
    const base  = process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile';
    const groups: Array<{ id: number; items?: Array<{ description: string; amount: number; entry_type: string }> }> = [];
    try {
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
    } catch { /* sin novedades, seguir */ }

    const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '').toUpperCase().slice(0, 40);
    // No persistimos como novedades estos códigos (los calcula el engine o son del empleador)
    const skipRe = /sueldo\s*base|asignaci[oó]n\s*familiar|empleador|mutual|previ|afp|isapre|fonasa|salud|cesant|impuesto|l[ií]quido/i;

    // Service role para bypass RLS en escritura (la sesión actual ya autorizó al empleador)
    const svc = (() => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) return null;
      return createServiceClient(url, key);
    })();
    if (svc) {
      const novedades: Array<{ empleador_id: string; trabajador_id: string; periodo: string; concept_code: string; amount: number }> = [];
      for (const { trabajadorId, bukId } of trabajadoresConBuk) {
        const g = groups.find(x => Number(x.id) === Number(bukId));
        if (!g) continue;
        for (const it of g.items ?? []) {
          if (it.entry_type !== 'debit') continue;
          if (skipRe.test(it.description)) continue;
          const amt = Number(it.amount) || 0;
          if (amt <= 0) continue;
          novedades.push({
            empleador_id: empleadorId,
            trabajador_id: trabajadorId,
            periodo: period,
            concept_code: slug(it.description),
            amount: amt,
          });
        }
      }
      if (novedades.length > 0) {
        // Borrar novedades previas autosynced del período para esos trabajadores (idempotencia)
        const trabIds = Array.from(new Set(novedades.map(n => n.trabajador_id)));
        await svc.from('payroll_novedades')
          .delete()
          .eq('empleador_id', empleadorId)
          .eq('periodo', period)
          .in('trabajador_id', trabIds);
        const { error } = await svc.from('payroll_novedades').insert(novedades);
        if (error) errors.push(`novedades: ${error.message}`);
        else novedadesSynced = novedades.length;
      }
    }
  }

  return NextResponse.json({ ok: true, imported, updated, skipped, novedadesSynced, errors });
}
