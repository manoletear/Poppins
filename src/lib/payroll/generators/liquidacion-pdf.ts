/**
 * Generador de Liquidaciones PDF para cierre de mes.
 * Formato idéntico a BUK: 1 PDF por empleador, 1 página por trabajador.
 * Se abre en nueva ventana para imprimir/guardar como PDF.
 */

import { createClient } from '@/lib/supabase/client';

const MESES_LABEL: Record<string, string> = {
  '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril',
  '05': 'Mayo', '06': 'Junio', '07': 'Julio', '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
};

function fmt(n: number | null | undefined): string {
  return '$ ' + (n ?? 0).toLocaleString('es-CL');
}

function formatDate(d: string | null): string {
  if (!d) return '—';
  const date = new Date(d + 'T00:00:00');
  const day = String(date.getDate()).padStart(2, '0');
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
}

interface LiquidacionData {
  // Worker
  nombre: string;
  rut: string;
  cargo: string;
  // Contract
  tipo_contrato: string;
  fecha_inicio: string;
  dias_trabajados: number;
  sueldo_base: number;
  // Previsión
  afp_nombre: string;
  afp_tasa: string;
  salud_nombre: string;
  salud_detalle: string;
  apv_detalle: string | null;
  uf_valor: string;
  // Haberes imponibles
  hab_sueldo_base: number;
  hab_gratificacion: number;
  hab_horas_extras_50: number;
  hab_horas_extras_100: number;
  hab_bonos_imponibles: number;
  hab_comisiones: number;
  total_haberes_imponibles: number;
  // Haberes no imponibles
  hab_movilizacion: number;
  hab_colacion: number;
  hab_viatico: number;
  hab_asignacion_familiar: number;
  total_haberes_no_imponibles: number;
  // Descuentos legales
  desc_afp: number;
  desc_salud: number;
  desc_salud_adicional: number;
  desc_afc: number;
  desc_impuesto: number;
  desc_apv: number;
  total_descuentos_legales: number;
  // Otros descuentos (from detalle jsonb)
  otros_descuentos: { label: string; monto: number }[];
  total_otros_descuentos: number;
  // Totals
  total_haberes: number;
  total_descuentos: number;
  imp_prev_salud: number;
  imp_cesantia: number;
  base_tributable: number;
  liquido_pagar: number;
}

export async function generateLiquidacionesPDF(periodo: string, empleadorId?: string) {
  const supabase = createClient();

  // Fetch current UF value from indicadores API
  let ufValor = '$ 0';
  try {
    const indRes = await fetch('/api/indicadores');
    if (indRes.ok) {
      const ind = await indRes.json();
      ufValor = '$ ' + Number(ind.uf ?? 0).toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  } catch { /* use fallback */ }

  // Get empleadores to process
  let empQuery = supabase.from('empleadores').select('id, nombre, apellido, rut');
  if (empleadorId) empQuery = empQuery.eq('id', empleadorId);
  const { data: empleadores } = await empQuery;
  if (!empleadores || empleadores.length === 0) return;

  for (const emp of empleadores) {
    const empName = `${emp.nombre || ''} ${emp.apellido || ''}`.trim();
    const empRut = emp.rut || '';

    // Get liquidaciones for this employer + periodo
    const { data: liquidaciones } = await supabase
      .from('liquidaciones')
      .select('*')
      .eq('empleador_id', emp.id)
      .eq('periodo', periodo);

    if (!liquidaciones || liquidaciones.length === 0) continue;

    // Get worker + contract info
    const trabIds = liquidaciones.map((l: any) => l.trabajador_id);
    const [trabRes, contRes, instRes] = await Promise.all([
      supabase.from('trabajadores').select('id, nombre, apellido_paterno, rut, cargo, afp_id, salud_id, salud_tipo, salud_plan_uf, apv_monto, apv_regimen').in('id', trabIds),
      supabase.from('contratos').select('trabajador_id, tipo_contrato, fecha_inicio, cargo').eq('empleador_id', emp.id).eq('estado', 'activo').in('trabajador_id', trabIds),
      supabase.from('instituciones_previsionales').select('id, nombre, tipo, tasa_descuento'),
    ]);

    const trabMap: Record<string, any> = {};
    (trabRes.data || []).forEach((t: any) => { trabMap[t.id] = t; });
    const contMap: Record<string, any> = {};
    (contRes.data || []).forEach((c: any) => { contMap[c.trabajador_id] = c; });
    const instMap: Record<string, any> = {};
    (instRes.data || []).forEach((i: any) => { instMap[i.id] = i; });

    // Build liquidacion data per worker
    const pages: LiquidacionData[] = liquidaciones.map((l: any) => {
      const trab = trabMap[l.trabajador_id] || {};
      const cont = contMap[l.trabajador_id] || {};
      const afpInst = instMap[trab.afp_id] || {};
      const saludInst = instMap[trab.salud_id] || {};

      const afpTasa = afpInst.tasa_descuento ? `${afpInst.tasa_descuento}%` : '';
      const saludNombre = saludInst.nombre || trab.salud_tipo || 'Fonasa';
      let saludDetalle = saludNombre;
      if (trab.salud_plan_uf) saludDetalle += ` ${trab.salud_plan_uf} UF`;

      let apvDetalle: string | null = null;
      if (l.apv_monto && l.apv_monto > 0) {
        apvDetalle = `${l.apv_regimen || 'APV'} $ ${Number(l.apv_monto).toLocaleString('es-CL')}`;
      }

      const otrosDesc: { label: string; monto: number }[] = [];
      if (l.descuentos_detalle && typeof l.descuentos_detalle === 'object') {
        Object.entries(l.descuentos_detalle).forEach(([k, v]) => {
          if (typeof v === 'number' && v > 0) otrosDesc.push({ label: k, monto: v });
        });
      }

      return {
        nombre: `${trab.apellido_paterno || ''}, ${trab.nombre || ''}`.trim().replace(/^,\s*/, ''),
        rut: trab.rut || '',
        cargo: cont.cargo || trab.cargo || '',
        tipo_contrato: cont.tipo_contrato || 'Indefinido',
        fecha_inicio: cont.fecha_inicio || '',
        dias_trabajados: l.dias_trabajados || 30,
        sueldo_base: Number(l.sueldo_base) || 0,
        afp_nombre: afpInst.nombre || 'AFP',
        afp_tasa: afpTasa,
        salud_nombre: saludNombre,
        salud_detalle: saludDetalle,
        apv_detalle: apvDetalle,
        uf_valor: ufValor,
        hab_sueldo_base: Number(l.sueldo_base) || 0,
        hab_gratificacion: Number(l.gratificacion_legal) || 0,
        hab_horas_extras_50: Number(l.horas_extras_50) || 0,
        hab_horas_extras_100: Number(l.horas_extras_100) || 0,
        hab_bonos_imponibles: Number(l.bonos_imponibles) || 0,
        hab_comisiones: Number(l.comisiones) || 0,
        total_haberes_imponibles: Number(l.total_haberes_imponibles) || 0,
        hab_movilizacion: Number(l.movilizacion) || 0,
        hab_colacion: Number(l.colacion) || 0,
        hab_viatico: Number(l.viatico) || 0,
        hab_asignacion_familiar: Number(l.asignacion_familiar) || 0,
        total_haberes_no_imponibles: Number(l.total_haberes_no_imponibles) || 0,
        desc_afp: Number(l.afp_trabajador) || 0,
        desc_salud: Number(l.salud_trabajador) || 0,
        desc_salud_adicional: Number(l.salud_adicional) || 0,
        desc_afc: Number(l.afc_trabajador) || 0,
        desc_impuesto: Number(l.impuesto_unico) || 0,
        desc_apv: Number(l.apv_monto) || 0,
        total_descuentos_legales: (Number(l.afp_trabajador) || 0) + (Number(l.salud_trabajador) || 0) + (Number(l.salud_adicional) || 0) + (Number(l.afc_trabajador) || 0) + (Number(l.impuesto_unico) || 0) + (Number(l.apv_monto) || 0),
        otros_descuentos: otrosDesc,
        total_otros_descuentos: otrosDesc.reduce((s, d) => s + d.monto, 0),
        total_haberes: Number(l.total_haberes) || 0,
        total_descuentos: Number(l.total_descuentos) || 0,
        imp_prev_salud: Number(l.renta_imponible_salud) || Number(l.total_haberes_imponibles) || 0,
        imp_cesantia: Number(l.renta_imponible_afc) || Number(l.total_haberes_imponibles) || 0,
        base_tributable: Number(l.base_tributable) || 0,
        liquido_pagar: Number(l.liquido_pagar) || 0,
      };
    });

    // Sort by name
    pages.sort((a, b) => a.nombre.localeCompare(b.nombre));

    // Generate HTML
    const [, mesNum] = periodo.split('-');
    const mesLabel = MESES_LABEL[mesNum] || mesNum;
    const html = buildHTML(empName, empRut, `${mesLabel} ${periodo.split('-')[0]}`, pages);

    // Open in new window
    const w = window.open('', '_blank');
    if (!w) continue;
    w.document.write(html);
    w.document.close();
    w.print();
  }
}

function buildHTML(empName: string, empRut: string, mesLabel: string, pages: LiquidacionData[]): string {
  const pagesHtml = pages.map((p, idx) => buildPageHTML(empName, empRut, mesLabel, p, idx < pages.length - 1)).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Liquidaciones ${mesLabel} - ${empName}</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; font-size: 11px; line-height: 1.4; }
  .page { page-break-after: always; padding: 0; }
  .page:last-child { page-break-after: avoid; }

  .header { background: linear-gradient(135deg, #e8e8f0 0%, #f0f0f5 100%); padding: 16px 20px; border-radius: 4px 4px 0 0; margin-bottom: 0; }
  .header h1 { font-size: 18px; font-weight: 600; color: #222; margin-bottom: 2px; }
  .header p { font-size: 11px; color: #555; }
  .header .emp { font-weight: 700; }

  .info-grid { display: flex; gap: 0; padding: 14px 20px; border-bottom: 1px solid #e0e0e0; }
  .info-col { flex: 1; }
  .info-col p { margin-bottom: 2px; font-size: 10.5px; }
  .info-col .label { color: #666; font-weight: 700; }
  .info-col .value { color: #333; }

  .sueldo-base { padding: 8px 20px; font-size: 11px; border-bottom: 1px solid #e0e0e0; }
  .sueldo-base strong { font-weight: 700; }

  .table-container { padding: 16px 20px; }
  table.liq { width: 100%; border-collapse: collapse; font-size: 10.5px; }
  table.liq td, table.liq th { padding: 5px 8px; vertical-align: top; }
  table.liq .section-header { font-weight: 800; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; padding-top: 12px; }
  table.liq .section-total { font-weight: 800; border-top: 2px solid #333; padding-top: 6px; }
  table.liq .amount { text-align: right; font-variant-numeric: tabular-nums; }
  table.liq .total-amount { text-align: right; font-weight: 800; font-variant-numeric: tabular-nums; }

  .totals-bar { display: flex; justify-content: space-between; padding: 8px 20px; background: #f5f5f8; border-top: 2px solid #333; border-bottom: 2px solid #333; font-size: 10.5px; font-weight: 700; margin-top: 4px; }
  .imp-bar { display: flex; justify-content: space-between; padding: 6px 20px; font-size: 10px; color: #555; }
  .liquido { text-align: center; font-size: 16px; font-weight: 800; padding: 12px 20px; border: 2px solid #333; margin: 8px 20px; }

  .certificacion { padding: 20px 20px 0; font-size: 9.5px; color: #666; line-height: 1.5; }
  .firma { padding: 40px 20px 10px; }
  .firma-line { width: 200px; border-top: 1px solid #333; padding-top: 4px; font-size: 10px; font-weight: 700; }

  .footer { text-align: center; padding: 20px 0 0; }
  .footer .brand { font-size: 14px; font-weight: 800; color: #7c3aed; }
  .footer .url { font-size: 10px; color: #999; }
</style>
</head>
<body>
${pagesHtml}
</body>
</html>`;
}

function buildPageHTML(empName: string, empRut: string, mesLabel: string, p: LiquidacionData, hasNext: boolean): string {
  // Build haberes rows
  const haberesImp: string[] = [];
  if (p.hab_sueldo_base) haberesImp.push(row('Sueldo Base', p.hab_sueldo_base));
  if (p.hab_gratificacion) haberesImp.push(row('Gratificación', p.hab_gratificacion));
  if (p.hab_horas_extras_50) haberesImp.push(row('Horas Extra 50%', p.hab_horas_extras_50));
  if (p.hab_horas_extras_100) haberesImp.push(row('Horas Extra 100%', p.hab_horas_extras_100));
  if (p.hab_bonos_imponibles) haberesImp.push(row('Bonos Imponibles', p.hab_bonos_imponibles));
  if (p.hab_comisiones) haberesImp.push(row('Comisiones', p.hab_comisiones));

  const haberesNoImp: string[] = [];
  if (p.hab_movilizacion) haberesNoImp.push(row('Movilización', p.hab_movilizacion));
  if (p.hab_colacion) haberesNoImp.push(row('Colación', p.hab_colacion));
  if (p.hab_viatico) haberesNoImp.push(row('Viático', p.hab_viatico));
  if (p.hab_asignacion_familiar) haberesNoImp.push(row('Asignación Familiar', p.hab_asignacion_familiar));

  const descLegales: string[] = [];
  if (p.desc_afp) descLegales.push(row('Cotiz. Previ. Obligatoria', p.desc_afp));
  if (p.desc_apv) descLegales.push(row(`Cotiz. Prev. Voluntaria (${p.apv_detalle || 'APV'})`, p.desc_apv));
  if (p.desc_salud) descLegales.push(row('Cotiz. Salud Obligatoria', p.desc_salud));
  if (p.desc_salud_adicional) descLegales.push(row('Adicional Salud', p.desc_salud_adicional));
  if (p.desc_afc) descLegales.push(row('Seguro Cesantía', p.desc_afc));
  if (p.desc_impuesto) descLegales.push(row('Impuesto Único', p.desc_impuesto));

  const otrosDesc = p.otros_descuentos.map(d => row(d.label, d.monto));

  return `
<div class="page">
  <div class="header">
    <h1>Liquidación de Sueldo</h1>
    <p class="emp">Empleador: ${empName} (${empRut})</p>
    <p>Mes: ${mesLabel}</p>
  </div>

  <div class="info-grid">
    <div class="info-col">
      <p><span class="label">Sr(a):</span> <span class="value">${p.nombre}</span></p>
      <p><span class="label">RUT:</span> <span class="value">${p.rut}</span></p>
      <p><span class="label">Cargo:</span> <span class="value">${p.cargo}</span></p>
    </div>
    <div class="info-col">
      <p><span class="label">Tipo Contrato:</span> <span class="value">${p.tipo_contrato}</span></p>
      <p><span class="label">Inicio Contrato:</span> <span class="value">${formatDate(p.fecha_inicio)}</span></p>
      <p><span class="label">Días Trabajados:</span> <span class="value">${p.dias_trabajados} días</span></p>
    </div>
    <div class="info-col">
      <p><span class="label">Previsión:</span> <span class="value">${p.afp_nombre} (${p.afp_tasa})</span></p>
      ${p.apv_detalle ? `<p><span class="label">APV:</span> <span class="value">${p.apv_detalle}</span></p>` : ''}
      <p><span class="label">Salud:</span> <span class="value">${p.salud_detalle}</span></p>
      <p><span class="label">UF:</span> <span class="value">${p.uf_valor}</span></p>
    </div>
  </div>

  <div class="sueldo-base"><strong>Sueldo Base:</strong> ${fmt(p.sueldo_base)}</div>

  <div class="table-container">
    <table class="liq">
      <tr>
        <td colspan="2">
          <table class="liq" style="width:100%">
            <tr><td class="section-header" colspan="2">HABERES IMPONIBLES</td><td class="total-amount">${fmt(p.total_haberes_imponibles)}</td></tr>
            ${haberesImp.join('')}
            <tr><td colspan="3" style="padding-top:10px"></td></tr>
            <tr><td class="section-header" colspan="2">HABERES NO IMPONIBLES</td><td class="total-amount">${fmt(p.total_haberes_no_imponibles)}</td></tr>
            ${haberesNoImp.join('')}
          </table>
        </td>
        <td colspan="2">
          <table class="liq" style="width:100%">
            <tr><td class="section-header" colspan="2">DESCUENTOS LEGALES</td><td class="total-amount">${fmt(p.total_descuentos_legales)}</td></tr>
            ${descLegales.join('')}
            <tr><td colspan="3" style="padding-top:10px"></td></tr>
            <tr><td class="section-header" colspan="2">OTROS DESCUENTOS</td><td class="total-amount">${fmt(p.total_otros_descuentos)}</td></tr>
            ${otrosDesc.length > 0 ? otrosDesc.join('') : '<tr><td colspan="3"></td></tr>'}
          </table>
        </td>
      </tr>
    </table>
  </div>

  <div class="totals-bar">
    <span>TOTAL HABERES ${fmt(p.total_haberes)}</span>
    <span>TOTAL DESCUENTOS ${fmt(p.total_descuentos)}</span>
  </div>

  <div class="imp-bar">
    <span>IMP. PREV./SALUD: ${fmt(p.imp_prev_salud)}</span>
    <span>IMP. CESANTÍA: ${fmt(p.imp_cesantia)}</span>
    <span>BASE TRIBUTABLE: ${fmt(p.base_tributable)}</span>
  </div>

  <div class="liquido">LÍQUIDO A RECIBIR: ${fmt(p.liquido_pagar)}</div>

  <div class="certificacion">
    Certifico que he recibido de ${empName} (${empRut}) a mi entera satisfacción el saldo indicado en la presente Liquidación y no
    tengo cargo ni cobro posterior que hacer.
  </div>

  <div class="firma">
    <div class="firma-line">FIRMA CONFORME</div>
  </div>

  <div class="footer">
    <div class="brand">poppins</div>
    <div class="url">poppins.cl</div>
  </div>
</div>`;
}

function row(label: string, amount: number): string {
  return `<tr><td>${label}</td><td></td><td class="amount">${fmt(amount)}</td></tr>`;
}
