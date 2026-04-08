/**
 * Generador de Excel "Sueldos" para cierre de mes.
 * Formato: Libro de Remuneraciones para transferencia bancaria.
 * Se descarga automáticamente al clickear la tarjeta "Sueldos" post-cierre.
 *
 * Columnas: BANCO DESTINO | CÓDIGO SBIF | TIPO DE CUENTA | NÚMERO CUENTA |
 *           RUT TRABAJADOR | NOMBRE TRABAJADOR | Remuneraciones | INGRESO COMPAÑÍA
 */

import { createClient } from '@/lib/supabase/client';

interface SueldoRow {
  banco_destino: string;
  codigo_sbif: string;
  tipo_cuenta: string;
  numero_cuenta: string;
  rut_trabajador: string;
  nombre_trabajador: string;
  remuneracion: number;
  ingreso_compania: string;
}

interface EmpleadorData {
  nombre: string;
  apellido: string;
  rut: string;
}

export async function generateSueldosExcel(periodo: string, empleadorId?: string) {
  const supabase = createClient();

  // 1. Get liquidaciones del periodo con trabajador y empleador
  let query = supabase
    .from('liquidaciones')
    .select('liquido_pagar, trabajador_id, empleador_id, trabajadores(nombre, apellido_paterno, rut), empleadores(nombre, apellido, rut)')
    .eq('periodo', periodo);

  if (empleadorId) {
    query = query.eq('empleador_id', empleadorId);
  }

  const { data: liquidaciones } = await query;
  if (!liquidaciones || liquidaciones.length === 0) return null;

  // 2. Get bank info from trabajadores (if table has it)
  const trabajadorIds = liquidaciones.map((l: any) => l.trabajador_id).filter(Boolean);
  const { data: cuentas } = await supabase
    .from('cuentas_pago')
    .select('trabajador_id, banco, tipo_cuenta, numero_cuenta, codigo_sbif')
    .in('trabajador_id', trabajadorIds);

  const cuentaMap: Record<string, any> = {};
  (cuentas || []).forEach((c: any) => { cuentaMap[c.trabajador_id] = c; });

  // 3. Get contrato dates for ingreso compañía
  const { data: contratos } = await supabase
    .from('contratos')
    .select('trabajador_id, fecha_inicio')
    .in('trabajador_id', trabajadorIds)
    .eq('estado', 'activo');

  const contratoMap: Record<string, string> = {};
  (contratos || []).forEach((c: any) => { contratoMap[c.trabajador_id] = c.fecha_inicio; });

  // 4. Build rows
  const rows: SueldoRow[] = liquidaciones.map((l: any) => {
    const trab = l.trabajadores || {};
    const cuenta = cuentaMap[l.trabajador_id] || {};
    const fechaIngreso = contratoMap[l.trabajador_id] || '';

    return {
      banco_destino: cuenta.banco || '',
      codigo_sbif: cuenta.codigo_sbif || '',
      tipo_cuenta: cuenta.tipo_cuenta || '',
      numero_cuenta: cuenta.numero_cuenta || '',
      rut_trabajador: trab.rut || '',
      nombre_trabajador: `${trab.apellido_paterno || ''}, ${trab.nombre || ''}`.trim().replace(/^,\s*/, ''),
      remuneracion: Number(l.liquido_pagar) || 0,
      ingreso_compania: fechaIngreso ? formatDate(fechaIngreso) : '',
    };
  });

  // Sort by name
  rows.sort((a, b) => a.nombre_trabajador.localeCompare(b.nombre_trabajador));

  // 5. Get employer info for header
  const emp = (liquidaciones[0] as any)?.empleadores || {};
  const empData: EmpleadorData = {
    nombre: `${emp.nombre || ''} ${emp.apellido || ''}`.trim(),
    apellido: emp.apellido || '',
    rut: emp.rut || '',
  };

  // 6. Generate CSV with Excel-compatible format (BOM for Spanish chars)
  const [periodoYear, periodoMonth] = periodo.split('-');
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const mesLabel = meses[parseInt(periodoMonth, 10) - 1] || periodoMonth;
  const now = new Date();
  const fechaGen = now.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' a las ' + now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

  const lines: string[] = [];

  // Header rows
  lines.push(`Libro:,Remuneraciones`);
  lines.push(`Empresa:,"${empData.nombre} (${empData.rut})"`);
  lines.push(`Periodo:,${mesLabel} ${periodoYear}`);
  lines.push(`Fecha Generación:,${fechaGen}`);
  lines.push(''); // empty row

  // Column headers
  lines.push('BANCO DESTINO,CÓDIGO SBIF,TIPO DE CUENTA,NÚMERO CUENTA,RUT TRABAJADOR,NOMBRE TRABAJADOR,Remuneraciones,INGRESO COMPAÑÍA');

  // Data rows
  rows.forEach(r => {
    lines.push([
      r.banco_destino,
      r.codigo_sbif,
      r.tipo_cuenta,
      r.numero_cuenta,
      r.rut_trabajador,
      `"${r.nombre_trabajador}"`,
      r.remuneracion.toString(),
      r.ingreso_compania,
    ].join(','));
  });

  // Total row
  const totalRemu = rows.reduce((s, r) => s + r.remuneracion, 0);
  lines.push(`,,,,,,${totalRemu},`);

  // BOM + CSV content
  const bom = '\uFEFF';
  const csvContent = bom + lines.join('\n');

  // 7. Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Sueldos_${periodo}_${empData.nombre.replace(/\s+/g, '_') || 'Poppins'}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { rows: rows.length, total: totalRemu };
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
