/**
 * Download generators for Cierre de Mes post-close cards.
 * 4 functions: Libro Remuneraciones, Contabilidad, PREVIRED, Libro Electrónico (LRE).
 * All client-side, query Supabase directly and trigger browser download/print.
 */

import { createClient } from '@/lib/supabase/client';

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function fmt(n: number): string {
  return (n ?? 0).toLocaleString('es-CL');
}

// ──────────────────────────────────────────────────────────────
// Shared: fetch liquidaciones + trabajadores + contratos + instituciones + empleadores
// ──────────────────────────────────────────────────────────────

async function fetchCierreData(periodo: string) {
  const supabase = createClient();

  const { data: liquidaciones } = await supabase
    .from('liquidaciones')
    .select('*')
    .eq('periodo', periodo);

  if (!liquidaciones || liquidaciones.length === 0) return null;

  const trabIds = [...new Set(liquidaciones.map((l: any) => l.trabajador_id).filter(Boolean))];
  const empIds = [...new Set(liquidaciones.map((l: any) => l.empleador_id).filter(Boolean))];

  const [trabRes, contRes, instRes, empRes] = await Promise.all([
    supabase.from('trabajadores').select('id, nombre, apellido_paterno, apellido_materno, rut, cargo, sexo, fecha_nacimiento, afp_id, salud_id, salud_tipo').in('id', trabIds),
    supabase.from('contratos').select('trabajador_id, empleador_id, tipo_contrato, fecha_inicio, cargo').eq('estado', 'activo').in('trabajador_id', trabIds),
    supabase.from('instituciones_previsionales').select('id, nombre, tipo, tasa_descuento'),
    supabase.from('empleadores').select('id, nombre, apellido, rut').in('id', empIds),
  ]);

  const trabMap: Record<string, any> = {};
  (trabRes.data || []).forEach((t: any) => { trabMap[t.id] = t; });
  const contMap: Record<string, any> = {};
  (contRes.data || []).forEach((c: any) => { contMap[`${c.trabajador_id}_${c.empleador_id}`] = c; });
  const instMap: Record<string, any> = {};
  (instRes.data || []).forEach((i: any) => { instMap[i.id] = i; });
  const empMap: Record<string, any> = {};
  (empRes.data || []).forEach((e: any) => { empMap[e.id] = e; });

  return { liquidaciones, trabMap, contMap, instMap, empMap };
}

function periodoLabel(periodo: string): string {
  const [y, m] = periodo.split('-');
  return `${MESES[parseInt(m, 10) - 1] || m} ${y}`;
}

function triggerDownload(content: string, filename: string, mimeType = 'text/csv;charset=utf-8;') {
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────────────────────
// 1. LIBRO DE REMUNERACIONES (HTML print window)
// ──────────────────────────────────────────────────────────────

export async function downloadLibroRemuneraciones(periodo: string) {
  const data = await fetchCierreData(periodo);
  if (!data) return;
  const { liquidaciones, trabMap, contMap, empMap } = data;

  // Group by employer
  const byEmp: Record<string, any[]> = {};
  liquidaciones.forEach((l: any) => {
    if (!byEmp[l.empleador_id]) byEmp[l.empleador_id] = [];
    byEmp[l.empleador_id].push(l);
  });

  let html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Libro de Remuneraciones - ${periodoLabel(periodo)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 10px; color: #222; margin: 20px; }
  h2 { font-size: 14px; margin: 30px 0 5px; }
  h3 { font-size: 11px; margin: 5px 0 10px; color: #555; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th, td { border: 1px solid #bbb; padding: 3px 6px; text-align: right; white-space: nowrap; }
  th { background: #e8e5f0; font-weight: bold; font-size: 9px; text-align: center; }
  td:nth-child(2), td:nth-child(3), td:nth-child(4) { text-align: left; }
  .totals td { font-weight: bold; background: #f3f0ff; }
  @media print { body { margin: 5mm; } h2 { page-break-before: always; } h2:first-of-type { page-break-before: avoid; } }
</style></head><body>`;

  for (const empId of Object.keys(byEmp)) {
    const emp = empMap[empId] || {};
    const empName = `${emp.nombre || ''} ${emp.apellido || ''}`.trim();
    const empRut = emp.rut || '';
    const liqs = byEmp[empId].sort((a: any, b: any) => {
      const na = trabMap[a.trabajador_id]?.apellido_paterno || '';
      const nb = trabMap[b.trabajador_id]?.apellido_paterno || '';
      return na.localeCompare(nb);
    });

    html += `<h2>Libro de Remuneraciones</h2>`;
    html += `<h3>Empresa: ${empName} (${empRut}) &mdash; Periodo: ${periodoLabel(periodo)}</h3>`;
    html += `<table><thead><tr>
      <th>N°</th><th>RUT</th><th>Nombre</th><th>Cargo</th><th>Días</th>
      <th>Sueldo Base</th><th>Gratific.</th><th>H.Extra</th><th>Bonos</th><th>Total Imp</th>
      <th>Moviliz.</th><th>Colación</th><th>Total No Imp</th><th>TOTAL HAB</th>
      <th>AFP</th><th>Salud</th><th>AFC</th><th>Impuesto</th><th>TOTAL DESC</th><th>LÍQUIDO</th>
    </tr></thead><tbody>`;

    let totals = { sueldo: 0, grat: 0, hextra: 0, bonos: 0, timp: 0, mov: 0, col: 0, tnimp: 0, thab: 0, afp: 0, salud: 0, afc: 0, imp: 0, tdesc: 0, liq: 0 };

    liqs.forEach((l: any, i: number) => {
      const t = trabMap[l.trabajador_id] || {};
      const cont = contMap[`${l.trabajador_id}_${l.empleador_id}`] || {};
      const nombre = `${t.apellido_paterno || ''}, ${t.nombre || ''}`.trim().replace(/^,\s*/, '');
      const sueldo = Number(l.sueldo_base) || 0;
      const grat = Number(l.gratificacion_legal) || 0;
      const hextra = (Number(l.horas_extras_50) || 0) + (Number(l.horas_extras_100) || 0);
      const bonos = Number(l.bonos_imponibles) || 0;
      const timp = Number(l.total_haberes_imponibles) || 0;
      const mov = Number(l.movilizacion) || 0;
      const col = Number(l.colacion) || 0;
      const tnimp = Number(l.total_haberes_no_imponibles) || 0;
      const thab = Number(l.total_haberes) || 0;
      const afp = Number(l.afp_trabajador) || 0;
      const salud = (Number(l.salud_trabajador) || 0) + (Number(l.salud_adicional) || 0);
      const afc = Number(l.afc_trabajador) || 0;
      const imp = Number(l.impuesto_unico) || 0;
      const tdesc = Number(l.total_descuentos) || 0;
      const liq = Number(l.liquido_pagar) || 0;

      totals.sueldo += sueldo; totals.grat += grat; totals.hextra += hextra; totals.bonos += bonos;
      totals.timp += timp; totals.mov += mov; totals.col += col; totals.tnimp += tnimp;
      totals.thab += thab; totals.afp += afp; totals.salud += salud; totals.afc += afc;
      totals.imp += imp; totals.tdesc += tdesc; totals.liq += liq;

      html += `<tr>
        <td>${i + 1}</td><td>${t.rut || ''}</td><td>${nombre}</td><td>${cont.cargo || t.cargo || ''}</td>
        <td>${l.dias_trabajados || 30}</td>
        <td>${fmt(sueldo)}</td><td>${fmt(grat)}</td><td>${fmt(hextra)}</td><td>${fmt(bonos)}</td><td>${fmt(timp)}</td>
        <td>${fmt(mov)}</td><td>${fmt(col)}</td><td>${fmt(tnimp)}</td><td>${fmt(thab)}</td>
        <td>${fmt(afp)}</td><td>${fmt(salud)}</td><td>${fmt(afc)}</td><td>${fmt(imp)}</td><td>${fmt(tdesc)}</td><td>${fmt(liq)}</td>
      </tr>`;
    });

    html += `<tr class="totals">
      <td colspan="5">TOTALES (${liqs.length} trabajadores)</td>
      <td>${fmt(totals.sueldo)}</td><td>${fmt(totals.grat)}</td><td>${fmt(totals.hextra)}</td><td>${fmt(totals.bonos)}</td><td>${fmt(totals.timp)}</td>
      <td>${fmt(totals.mov)}</td><td>${fmt(totals.col)}</td><td>${fmt(totals.tnimp)}</td><td>${fmt(totals.thab)}</td>
      <td>${fmt(totals.afp)}</td><td>${fmt(totals.salud)}</td><td>${fmt(totals.afc)}</td><td>${fmt(totals.imp)}</td><td>${fmt(totals.tdesc)}</td><td>${fmt(totals.liq)}</td>
    </tr></tbody></table>`;
  }

  html += `<p style="font-size:8px;color:#999;">Generado por Poppins el ${new Date().toLocaleString('es-CL')}</p>`;
  html += `</body></html>`;

  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

// ──────────────────────────────────────────────────────────────
// 2. CONTABILIDAD (CSV centralización contable)
// ──────────────────────────────────────────────────────────────

export async function downloadContabilidad(periodo: string) {
  const data = await fetchCierreData(periodo);
  if (!data) return;
  const { liquidaciones, empMap } = data;

  const byEmp: Record<string, any[]> = {};
  liquidaciones.forEach((l: any) => {
    if (!byEmp[l.empleador_id]) byEmp[l.empleador_id] = [];
    byEmp[l.empleador_id].push(l);
  });

  const lines: string[] = [];
  lines.push('Cuenta,Glosa,Debe,Haber');

  for (const empId of Object.keys(byEmp)) {
    const emp = empMap[empId] || {};
    const empName = `${emp.nombre || ''} ${emp.apellido || ''}`.trim();
    const liqs = byEmp[empId];

    let totalHaberes = 0, totalAfp = 0, totalSalud = 0, totalAfc = 0, totalImpuesto = 0, totalLiquido = 0;

    liqs.forEach((l: any) => {
      totalHaberes += Number(l.total_haberes) || 0;
      totalAfp += Number(l.afp_trabajador) || 0;
      totalSalud += (Number(l.salud_trabajador) || 0) + (Number(l.salud_adicional) || 0);
      totalAfc += Number(l.afc_trabajador) || 0;
      totalImpuesto += Number(l.impuesto_unico) || 0;
      totalLiquido += Number(l.liquido_pagar) || 0;
    });

    lines.push('');
    lines.push(`,"=== ${empName} (${emp.rut || ''}) - ${periodoLabel(periodo)} ===",`);
    lines.push(`6210-001,"Remuneraciones por Pagar - ${empName}",${totalHaberes},0`);
    lines.push(`2140-001,"AFP por Pagar - ${empName}",0,${totalAfp}`);
    lines.push(`2140-002,"Salud por Pagar - ${empName}",0,${totalSalud}`);
    lines.push(`2140-003,"AFC por Pagar - ${empName}",0,${totalAfc}`);
    lines.push(`2140-004,"Impuesto Único Retenido - ${empName}",0,${totalImpuesto}`);
    lines.push(`2110-001,"Remuneraciones Líquidas por Pagar - ${empName}",0,${totalLiquido}`);

    // Cuadre
    const diff = totalHaberes - (totalAfp + totalSalud + totalAfc + totalImpuesto + totalLiquido);
    if (Math.abs(diff) > 1) {
      lines.push(`2140-099,"Otros Descuentos / Ajuste - ${empName}",0,${diff}`);
    }
  }

  triggerDownload(lines.join('\n'), `Contabilidad_${periodo}.csv`);
}

// ──────────────────────────────────────────────────────────────
// 3. PREVIRED (CSV 65 campos, separado por ;)
// ──────────────────────────────────────────────────────────────

// Mapeo nombre AFP → código PREVIRED
const AFP_CODES: Record<string, string> = {
  'Capital': '33', 'Cuprum': '03', 'Habitat': '05', 'Modelo': '08',
  'PlanVital': '29', 'Plan Vital': '29', 'ProVida': '08', 'Provida': '08', 'Uno': '34',
};

// Mapeo nombre Salud → código PREVIRED
const SALUD_CODES: Record<string, string> = {
  'Fonasa': '07', 'Banmédica': '01', 'Banmedica': '01', 'Colmena': '02',
  'Consalud': '03', 'Cruz Blanca': '04', 'CruzBlanca': '04', 'Masvida': '05',
  'Vida Tres': '06', 'VidaTres': '06', 'Nueva Masvida': '10',
  'Esencial': '09',
};

function lookupCode(map: Record<string, string>, nombre: string): string {
  if (!nombre) return '';
  for (const [key, code] of Object.entries(map)) {
    if (nombre.toLowerCase().includes(key.toLowerCase())) return code;
  }
  return '';
}

function formatFechaDDMM(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return '';
  return `${parts[2]}${parts[1]}${parts[0]}`;
}

export async function downloadPrevired(periodo: string) {
  const data = await fetchCierreData(periodo);
  if (!data) return;
  const { liquidaciones, trabMap, contMap, instMap, empMap } = data;

  const periodoAAMM = periodo.replace('-', '');
  const lines: string[] = [];

  for (const l of liquidaciones) {
    const t = trabMap[l.trabajador_id] || {};
    const cont = contMap[`${l.trabajador_id}_${l.empleador_id}`] || {};
    const emp = empMap[l.empleador_id] || {};
    const afpInst = instMap[t.afp_id] || {};
    const saludInst = instMap[t.salud_id] || {};

    const codigoAfp = lookupCode(AFP_CODES, afpInst.nombre || '');
    const codigoSalud = lookupCode(SALUD_CODES, saludInst.nombre || t.salud_tipo || '');
    const tipoContrato = (cont.tipo_contrato || '').toLowerCase().includes('plazo') ? 'P' : 'I';
    const fechaNac = formatFechaDDMM(t.fecha_nacimiento || '');

    const rentaAfp = Number(l.renta_imponible_afp) || Number(l.total_haberes_imponibles) || 0;
    const rentaSalud = Number(l.renta_imponible_salud) || Number(l.total_haberes_imponibles) || 0;
    const rentaAfc = Number(l.renta_imponible_afc) || Number(l.total_haberes_imponibles) || 0;

    // 65 fields separated by ;
    const campos: (string | number)[] = [
      emp.rut || '',                              // 1 RUT empleador
      t.rut || '',                                // 2 RUT trabajador
      periodoAAMM,                                // 3 Periodo pago
      t.nombre || '',                             // 4 Nombres
      t.apellido_paterno || '',                   // 5 Ap. paterno
      t.apellido_materno || '',                   // 6 Ap. materno
      t.sexo || 'M',                              // 7 Sexo
      fechaNac,                                   // 8 Fecha nacimiento DDMMAAAA
      '056',                                      // 9 Nacionalidad
      '1',                                        // 10 Tipo pago (normal)
      periodoAAMM,                                // 11 Periodo remuneración
      codigoAfp,                                  // 12 Código AFP
      rentaAfp,                                   // 13 Renta imp AFP
      Number(l.afp_trabajador) || 0,              // 14 Cotiz AFP
      0,                                          // 15 Cotiz SIS
      0,                                          // 16 Ahorro voluntario AFP
      0,                                          // 17 Renta imp IPS
      0,                                          // 18 Cotiz IPS
      0,                                          // 19 Renta imp desahucio
      codigoSalud,                                // 20 Código salud
      rentaSalud,                                 // 21 Renta imp salud
      Number(l.salud_trabajador) || 0,            // 22 Cotiz salud
      Number(l.salud_adicional) || 0,             // 23 Cotiz adicional salud
      '',                                         // 24 Código mutual
      rentaAfp,                                   // 25 Renta imp mutual
      0,                                          // 26 Cotiz ATEP
      '',                                         // 27 Código CCAF
      0,                                          // 28 Renta imp CCAF
      0,                                          // 29 Créditos personales CCAF
      0,                                          // 30 Descuento dental CCAF
      0,                                          // 31 Descuento leasing CCAF
      0,                                          // 32 Descuento seguro vida CCAF
      0,                                          // 33 Otros descuentos CCAF
      0,                                          // 34 Cotiz CCAF
      '',                                         // 35 Código sucursal mutual
      '00',                                       // 36 Código movimiento
      '',                                         // 37 Fecha movimiento
      '',                                         // 38 Tramo asig familiar
      Number(l.total_cargas) || 0,                // 39 Cargas simples
      0,                                          // 40 Cargas maternales
      0,                                          // 41 Cargas invalidez
      Number(l.asignacion_familiar) || 0,         // 42 Monto asig familiar
      0,                                          // 43 Asig familiar retroactiva
      0,                                          // 44 Reintegro cargas
      '',                                         // 45 Solicitud trabajador joven
      '01',                                       // 46 Código AFC
      rentaAfc,                                   // 47 Renta imp AFC
      Number(l.afc_trabajador) || 0,              // 48 Aporte trabajador AFC
      Number(l.afc_empleador) || 0,               // 49 Aporte empleador AFC
      tipoContrato,                               // 50 Tipo contrato
      Number(l.dias_trabajados) || 30,            // 51 Días trabajados
      '0',                                        // 52 Tipo trabajador (activo)
      '',                                         // 53 Código APVI
      0,                                          // 54 Monto APVI
      '',                                         // 55 Código APVC
      0,                                          // 56 Monto APVC trabajador
      0,                                          // 57 Monto APVC empleador
      '',                                         // 58 RUT pagadora subsidio
      0,                                          // 59 Renta imp subsidio
      '7.00',                                     // 60 Tasa pactada salud
      0,                                          // 61 APV régimen B
      '',                                         // 62 Forma APV
      0,                                          // 63 Cotiz desahucio
      0,                                          // 64 Cotiz salud independiente
      '',                                         // 65 Tasa SIS
    ];

    lines.push(campos.join(';'));
  }

  triggerDownload(lines.join('\n'), `PREVIRED_${periodo}.csv`);
}

// ──────────────────────────────────────────────────────────────
// 4. LIBRO ELECTRÓNICO (LRE para DT)
// ──────────────────────────────────────────────────────────────

// DT codes (mirrored from lre.ts for self-contained usage)
const COD_HAB: Record<string, string> = {
  'Sueldo Base': '1101', 'Gratificación Legal': '1105', 'Horas Extra': '1102',
  'Comisiones': '1103', 'Bonos Imponibles': '1106', 'Colación': '1202',
  'Movilización': '1201', 'Viáticos': '1203', 'Semana Corrida': '1301',
  'Asignación Familiar': '1204',
};
const COD_DESC: Record<string, string> = {
  'AFP': '2101', 'Salud': '2102', 'Salud Adicional': '2103',
  'AFC': '2104', 'Impuesto': '2105', 'Anticipo': '2201',
  'Préstamo': '2202', 'APV': '2301',
};

export async function downloadLibroElectronico(periodo: string) {
  const data = await fetchCierreData(periodo);
  if (!data) return;
  const { liquidaciones, trabMap, contMap, empMap } = data;

  const periodoAAMM = periodo.replace('-', '');
  const byEmp: Record<string, any[]> = {};
  liquidaciones.forEach((l: any) => {
    if (!byEmp[l.empleador_id]) byEmp[l.empleador_id] = [];
    byEmp[l.empleador_id].push(l);
  });

  const allLines: string[] = [];

  for (const empId of Object.keys(byEmp)) {
    const emp = empMap[empId] || {};
    const empName = `${emp.nombre || ''} ${emp.apellido || ''}`.trim();
    const liqs = byEmp[empId];
    const fecha = new Date().toISOString().split('T')[0];

    // H = Header
    allLines.push(['H', emp.rut || '', empName, periodoAAMM, liqs.length, fecha].join(';'));

    let grandHab = 0, grandDesc = 0, grandLiq = 0;

    for (const l of liqs) {
      const t = trabMap[l.trabajador_id] || {};
      const cont = contMap[`${l.trabajador_id}_${l.empleador_id}`] || {};
      const nombre = `${t.apellido_paterno || ''}, ${t.nombre || ''}`.trim().replace(/^,\s*/, '');
      const tipoContrato = (cont.tipo_contrato || '').toLowerCase().includes('plazo') ? 'PF' : 'CI';
      const thab = Number(l.total_haberes) || 0;
      const thnoimp = Number(l.total_haberes_no_imponibles) || 0;
      const thimp = Number(l.total_haberes_imponibles) || 0;
      const tdesc = Number(l.total_descuentos) || 0;
      const liq = Number(l.liquido_pagar) || 0;

      grandHab += thab; grandDesc += tdesc; grandLiq += liq;

      // C = Cabecera trabajador
      allLines.push([
        'C', emp.rut || '', periodoAAMM, t.rut || '', nombre,
        cont.fecha_inicio || '', tipoContrato, cont.cargo || t.cargo || '', '',
        l.dias_trabajados || 30, thimp, thnoimp, thab, tdesc, liq,
      ].join(';'));

      // D = Detalle haberes
      const haberes: [string, string, number, string][] = [
        ['1101', 'Sueldo Base', Number(l.sueldo_base) || 0, 'IMP'],
        ['1105', 'Gratificación Legal', Number(l.gratificacion_legal) || 0, 'IMP'],
        ['1102', 'Horas Extra', (Number(l.horas_extras_50) || 0) + (Number(l.horas_extras_100) || 0), 'IMP'],
        ['1106', 'Bonos Imponibles', Number(l.bonos_imponibles) || 0, 'IMP'],
        ['1103', 'Comisiones', Number(l.comisiones) || 0, 'IMP'],
        ['1201', 'Movilización', Number(l.movilizacion) || 0, 'NIR'],
        ['1202', 'Colación', Number(l.colacion) || 0, 'NIR'],
        ['1203', 'Viáticos', Number(l.viatico) || 0, 'NIR'],
        ['1204', 'Asignación Familiar', Number(l.asignacion_familiar) || 0, 'NIR'],
      ];

      for (const [cod, concepto, monto, clas] of haberes) {
        if (monto > 0) {
          allLines.push(['D', t.rut || '', cod, concepto, 'H', clas, monto].join(';'));
        }
      }

      // D = Detalle descuentos
      const descuentos: [string, string, number, string][] = [
        ['2101', 'AFP', Number(l.afp_trabajador) || 0, 'LEG'],
        ['2102', 'Salud', Number(l.salud_trabajador) || 0, 'LEG'],
        ['2103', 'Salud Adicional', Number(l.salud_adicional) || 0, 'LEG'],
        ['2104', 'Seguro de Cesantía', Number(l.afc_trabajador) || 0, 'LEG'],
        ['2105', 'Impuesto Único', Number(l.impuesto_unico) || 0, 'LEG'],
      ];

      // Otros descuentos from detalle jsonb
      if (l.descuentos_detalle && typeof l.descuentos_detalle === 'object') {
        Object.entries(l.descuentos_detalle).forEach(([k, v]) => {
          if (typeof v === 'number' && v > 0) {
            const cod = k.includes('Anticipo') ? '2201' : k.includes('Préstamo') ? '2202' : k.includes('APV') ? '2301' : '2299';
            descuentos.push([cod, k, v, 'VOL']);
          }
        });
      }

      for (const [cod, concepto, monto, clas] of descuentos) {
        if (monto > 0) {
          allLines.push(['D', t.rut || '', cod, concepto, 'D', clas, monto].join(';'));
        }
      }
    }

    // T = Totales
    allLines.push(['T', liqs.length, grandHab, grandDesc, grandLiq].join(';'));
  }

  triggerDownload(allLines.join('\n'), `LRE_${periodo}.csv`);
}
