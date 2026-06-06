import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

// Códigos PREVIRED oficiales
const AFP_CODES: Record<string, string> = {
  capital: '33', cuprum: '03', habitat: '05', planvital: '29',
  'plan vital': '29', provida: '08', modelo: '34', uno: '35',
};
const SALUD_CODES: Record<string, string> = {
  fonasa: '07', banmedica: '01', banmédica: '01', colmena: '02',
  consalud: '03', 'cruz blanca': '04', cruzblanca: '04',
  'vida tres': '06', vidatres: '06', 'nueva masvida': '10', masvida: '10', esencial: '09',
};
const codeOf = (map: Record<string, string>, name: string) => {
  const n = (name || '').toLowerCase();
  for (const [k, v] of Object.entries(map)) if (n.includes(k)) return v;
  return '';
};

const fechaDDMM = (iso: string) => {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}${m}${y}` : '';
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = Number(searchParams.get('month'));
  const year = Number(searchParams.get('year'));
  if (!month || !year) return NextResponse.json({ ok: false, error: 'month_year_required' }, { status: 400 });

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

  const { data: empleador } = await supabase.from('empleadores').select('rut').eq('id', empleadorId).maybeSingle();
  const rutEmpleador = empleador?.rut || '';

  const { data: contratos } = await supabase
    .from('contratos')
    .select('tipo_contrato, trabajadores(id, buk_employee_id)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');
  const bukIds = new Set<number>();
  const tipoByBukId = new Map<number, string>();
  for (const c of (contratos || []) as any[]) {
    const bid = Number(c.trabajadores?.buk_employee_id);
    if (bid) { bukIds.add(bid); tipoByBukId.set(bid, c.tipo_contrato || ''); }
  }
  if (bukIds.size === 0) return NextResponse.json({ ok: false, error: 'sin_trabajadores_buk' }, { status: 400 });

  const token = process.env.BUK_API_TOKEN || '';
  const base = process.env.BUK_API_BASE_URL || 'https://app.buk.cl/api/v1/chile';
  const H = { auth_token: token, Accept: 'application/json' };

  // Datos personales/previsionales de empleados (un fetch)
  const empById = new Map<number, any>();
  try {
    const r = await fetch(`${base}/employees?page_size=100`, { headers: H });
    const j = await r.json();
    for (const e of (j?.data || [])) empById.set(Number(e.id), e);
  } catch { /* */ }

  // Asientos contables del período (montos reales por empleado)
  let groups: any[] = [];
  try {
    const r = await fetch(`${base}/accounting?month=${month}&year=${year}`, { headers: H });
    if (!r.ok) return NextResponse.json({ ok: false, error: 'buk_accounting_error', status: r.status }, { status: 502 });
    const j = await r.json();
    groups = j?.data || [];
  } catch {
    return NextResponse.json({ ok: false, error: 'buk_unreachable' }, { status: 502 });
  }

  const periodoAAMM = `${year}${String(month).padStart(2, '0')}`;
  // Renta imponible = solo haberes imponibles del trabajador (excluye no imponibles y costos empleador).
  const esImponible = (d: string) => !/empleador|mutual|invalidez|expectativa|sobreviv|\bsis\b|colaci|moviliz|viatic|asignaci|previsi|fonasa|isapre|cesant|impuesto|l[ií]quido/i.test(d);
  const lines: string[] = [];

  for (const g of groups) {
    const bid = Number(g.id);
    if (!bukIds.has(bid)) continue;
    const items: any[] = g.items || [];
    const e = empById.get(bid) || {};
    const sum = (pred: (x: any) => boolean) => items.filter(pred).reduce((a, x) => a + (Number(x.amount) || 0), 0);
    const credit = (re: RegExp, excl?: RegExp) => sum((x) => x.entry_type === 'credit' && re.test(x.description) && !(excl && excl.test(x.description)));

    const rentaImp = sum((x) => x.entry_type === 'debit' && esImponible(x.description));
    const cotizAfp = credit(/^\s*previsi/i);                  // "Prevision (AFP)" del trabajador
    const cotizSalud = credit(/^\s*(fonasa|isapre)/i);        // salud legal trabajador
    const afcTrab = credit(/cesant/i, /empleador/i);          // "Cesantía" (sin Empleador)
    const afcEmpl = credit(/cesant.*empleador/i);             // "Cesantía Empleador"
    const mutual = sum((x) => /^\s*mutual/i.test(x.description) && x.entry_type === 'credit');
    const sis = credit(/invalidez|^\s*sis\b|sobreviv/i);

    const codigoAfp = codeOf(AFP_CODES, e.pension_fund || e.afp || '');
    const regimenIPS = (e.pension_regime || '').toLowerCase() === 'ips' || (e.pension_regime || '').toLowerCase() === 'inp';
    const codigoSalud = codeOf(SALUD_CODES, e.health_company || '') || '07';
    const tramo = (Array.isArray(e.family_responsabilities) && e.family_responsabilities[0]?.family_allowance_section) || '';
    const cargas = Array.isArray(e.family_responsabilities) ? e.family_responsabilities.length : 0;
    const tipoContrato = (tipoByBukId.get(bid) || e.current_job?.contract_type || '').toLowerCase().includes('plazo') ? 'P' : 'I';

    const campos: (string | number)[] = [
      rutEmpleador,                               // 1
      e.rut || '',                                // 2
      periodoAAMM,                                // 3
      e.first_name || '',                         // 4
      e.surname || '',                            // 5
      e.second_surname || '',                     // 6
      e.gender || 'M',                            // 7
      fechaDDMM(e.birthday || ''),                // 8
      '056',                                      // 9
      '1',                                        // 10
      periodoAAMM,                                // 11
      regimenIPS ? '0000' : codigoAfp,            // 12
      rentaImp,                                   // 13
      cotizAfp,                                   // 14
      sis,                                        // 15
      0,                                          // 16
      regimenIPS ? rentaImp : 0,                  // 17 Renta imp IPS
      0,                                          // 18
      0,                                          // 19
      codigoSalud,                                // 20
      rentaImp,                                   // 21
      cotizSalud,                                 // 22
      0,                                          // 23
      '',                                         // 24 código mutual (config empleador)
      rentaImp,                                   // 25
      mutual,                                     // 26 ATEP
      '',                                         // 27 CCAF
      0, 0, 0, 0, 0, 0,                           // 28-33 CCAF
      0,                                          // 34
      '',                                         // 35
      '00',                                       // 36
      '',                                         // 37
      tramo,                                      // 38
      cargas,                                     // 39
      0, 0,                                       // 40-41
      0,                                          // 42 asig familiar (monto no expuesto)
      0, 0,                                       // 43-44
      '',                                         // 45
      '01',                                       // 46
      rentaImp,                                   // 47
      afcTrab,                                    // 48
      afcEmpl,                                    // 49
      tipoContrato,                               // 50
      30,                                         // 51 días trabajados (mes completo)
      e.retired === true ? '1' : '0',             // 52
      '', 0,                                      // 53-54 APVI
      '', 0, 0,                                   // 55-57 APVC
      '', 0,                                      // 58-59 subsidio
      '7.00',                                     // 60
      0, '',                                      // 61-62 APV B
      0, 0,                                       // 63-64
      '',                                         // 65
    ];
    lines.push(campos.join(';'));
  }

  const csv = lines.join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="PREVIRED_${periodoAAMM}.csv"`,
    },
  });
}
