'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  ArrowLeft, FileText, Calendar, Clock, Mail, Phone, MapPin,
  Briefcase, Shield, DollarSign, Palmtree, Printer, Loader2, AlertCircle, User, Download, Camera,
  CheckCircle2, Bell, Send, BadgeCheck,
} from 'lucide-react';

type TabKey = 'resumen' | 'contrato' | 'liquidaciones' | 'vacaciones' | 'licencias' | 'asistencia';

function getTabsForCargo(cargo: string): { key: TabKey; label: string }[] {
  const c = (cargo || '').toLowerCase();
  if (c.includes('piscin') || c.includes('jardin')) {
    return [
      { key: 'resumen', label: 'Resumen' },
      { key: 'contrato', label: 'Contrato de Servicios' },
      { key: 'liquidaciones', label: 'Servicios' },
      { key: 'vacaciones', label: 'Vacaciones' },
    { key: 'licencias', label: 'Licencias' },
      { key: 'licencias', label: 'Licencias' },
      { key: 'asistencia', label: 'Asistencia' },
    ];
  }
  return [
    { key: 'resumen', label: 'Resumen' },
    { key: 'contrato', label: 'Contrato' },
    { key: 'liquidaciones', label: 'Liquidaciones' },
    { key: 'vacaciones', label: 'Vacaciones' },
    { key: 'licencias', label: 'Licencias' },
    { key: 'asistencia', label: 'Asistencia' },
  ];
}

function formatCLP(n: number): string { return '$' + (n ?? 0).toLocaleString('es-CL'); }

function calcAntiguedad(fecha: string): string {
  const start = new Date(fecha), now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  const y = Math.floor(months / 12), m = months % 12;
  if (y === 0) return `${m} meses`;
  return `${y} año${y > 1 ? 's' : ''}${m > 0 ? `, ${m} mes${m > 1 ? 'es' : ''}` : ''}`;
}

function openPrintWindow(html: string) {
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
}

// ── Contract PDF generator ──
function generateContractHTML(worker: any, contrato: any, empleador: any) {
  const fechaInicio = contrato.fecha_inicio ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CL') : '';
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Contrato de Trabajo - ${worker.nombre}</title>
<style>body{font-family:'Times New Roman',serif;max-width:700px;margin:40px auto;padding:40px;line-height:1.7;color:#1a1a1a;font-size:14px}
h1{text-align:center;font-size:20px;margin-bottom:30px;letter-spacing:2px;text-transform:uppercase}
h2{font-size:14px;margin-top:24px;margin-bottom:8px;text-transform:uppercase}
.clause{margin-bottom:16px;text-align:justify}
.signatures{margin-top:60px;display:flex;justify-content:space-between}
.sig-block{text-align:center;width:45%}.sig-line{border-top:1px solid #333;margin-top:60px;padding-top:8px}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>CONTRATO DE TRABAJO<br>TRABAJADOR(A) DE CASA PARTICULAR</h1>
<p style="text-align:center;color:#2563eb;font-weight:bold">Ref: ${contrato.numero_contrato}</p>
<p class="clause">En Santiago de Chile, a ${fechaInicio}, entre <strong>${empleador?.nombre || ''} ${empleador?.apellido || ''}</strong>, RUT <strong>${empleador?.rut || ''}</strong>, domiciliado en ${empleador?.direccion || ''}, ${empleador?.comuna || ''}, en adelante "el Empleador", y <strong>${worker.nombre} ${worker.apellido_paterno || ''}</strong>, RUT <strong>${worker.rut}</strong>, domiciliado(a) en ${worker.direccion || 'domicilio del trabajador'}, en adelante "el(la) Trabajador(a)", se ha convenido el siguiente contrato de trabajo:</p>
<h2>PRIMERO: Naturaleza de los Servicios</h2>
<p class="clause">El(la) Trabajador(a) se compromete a desempeñar el cargo de <strong>${contrato.cargo || worker.cargo || 'Asesora del Hogar'}</strong>, realizando labores de aseo, orden, preparación de alimentos, lavado y planchado de ropa, y demás tareas propias del hogar, conforme al artículo 146 del Código del Trabajo.</p>
<h2>SEGUNDO: Lugar de Trabajo</h2>
<p class="clause">Los servicios serán prestados en el domicilio del Empleador ubicado en ${empleador?.direccion || ''}, ${empleador?.comuna || ''}, Santiago, bajo la modalidad de <strong>Puertas Afuera</strong>.</p>
<h2>TERCERO: Jornada de Trabajo</h2>
<p class="clause">La jornada ordinaria será de <strong>${contrato.horas_semanales || 45} horas semanales</strong>, distribuidas de lunes a viernes, en horario de 08:00 a 17:00 horas, con 1 hora de colación. Se respetarán los límites de la Ley 21.561 (Ley 40 Horas).</p>
<h2>CUARTO: Remuneración</h2>
<p class="clause">El Empleador pagará una remuneración mensual de <strong>${formatCLP(contrato.sueldo_base)}</strong> (bruto), que incluye sueldo base. Adicionalmente se pagará gratificación legal conforme al ${contrato.tipo_gratificacion === 'art_50' ? 'artículo 50' : 'artículo 47'} del Código del Trabajo, colación de $30.000 y movilización de $20.000. La remuneración será pagada por transferencia bancaria dentro de los primeros 5 días hábiles del mes siguiente.</p>
<h2>QUINTO: Duración del Contrato</h2>
<p class="clause">El presente contrato es de carácter <strong>${contrato.tipo_contrato === 'indefinido' ? 'indefinido' : 'plazo fijo'}</strong>, con fecha de inicio el <strong>${fechaInicio}</strong>.</p>
<h2>SEXTO: Cotizaciones Previsionales</h2>
<p class="clause">El Empleador se obliga a efectuar las cotizaciones previsionales conforme a la ley: AFP, Salud (${worker.salud_tipo === 'fonasa' ? 'FONASA' : 'ISAPRE'}), Seguro de Cesantía (AFC), y Seguro de Invalidez y Sobrevivencia (SIS).</p>
<h2>SÉPTIMO: Vacaciones</h2>
<p class="clause">El(la) Trabajador(a) tendrá derecho a ${contrato.dias_vacaciones_anuales || 15} días hábiles de vacaciones anuales conforme al artículo 67 del Código del Trabajo, una vez cumplido un año de servicio.</p>
<h2>OCTAVO: Obligaciones Especiales</h2>
<p class="clause">Ambas partes se obligan a cumplir las disposiciones de la Ley 21.643 (Ley Karin) sobre prevención del acoso laboral, sexual y violencia en el trabajo.</p>
<div class="signatures"><div class="sig-block"><div class="sig-line"><strong>${empleador?.nombre || ''} ${empleador?.apellido || ''}</strong><br>RUT: ${empleador?.rut || ''}<br>Empleador</div></div>
<div class="sig-block"><div class="sig-line"><strong>${worker.nombre} ${worker.apellido_paterno || ''}</strong><br>RUT: ${worker.rut}<br>Trabajador(a)</div></div></div></body></html>`;
}

// ── Liquidación PDF generator ──
function generateLiquidacionHTML(worker: any, liq: any, empleador: any) {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Liquidación ${liq.periodo}</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;padding:30px;color:#1a1a1a;font-size:13px}
h1{text-align:center;font-size:18px;margin-bottom:4px}.sub{text-align:center;color:#666;margin-bottom:24px;font-size:14px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px}
.info div{font-size:13px}.info strong{color:#333}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#f3f4f6;text-align:left;padding:8px 12px;font-size:12px;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb}
td{padding:8px 12px;border-bottom:1px solid #e5e7eb}.amt{text-align:right;font-variant-numeric:tabular-nums}
.tot{font-weight:bold;background:#f9fafb}.final{font-size:16px;font-weight:bold;background:#ecfdf5}
.sec{font-weight:bold;font-size:14px;margin:20px 0 8px;color:#333}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>LIQUIDACIÓN DE SUELDO</h1><p class="sub">${liq.periodo}</p>
<div class="info"><div><strong>Empleador:</strong> ${empleador?.nombre || ''} ${empleador?.apellido || ''}</div>
<div><strong>RUT Empleador:</strong> ${empleador?.rut || ''}</div>
<div><strong>Trabajador(a):</strong> ${worker.nombre} ${worker.apellido_paterno || ''}</div>
<div><strong>RUT:</strong> ${worker.rut}</div>
<div><strong>Cargo:</strong> ${worker.cargo || 'Asesora del Hogar'}</div>
<div><strong>Días trabajados:</strong> ${liq.dias_trabajados || 30}</div></div>
<p class="sec">Haberes</p><table><thead><tr><th>Concepto</th><th class="amt">Monto</th></tr></thead><tbody>
<tr><td>Sueldo Base</td><td class="amt">${formatCLP(liq.sueldo_base)}</td></tr>
<tr><td>Gratificación Legal</td><td class="amt">${formatCLP(liq.gratificacion_legal)}</td></tr>
<tr><td>Colación</td><td class="amt">${formatCLP(liq.colacion)}</td></tr>
<tr><td>Movilización</td><td class="amt">${formatCLP(liq.movilizacion)}</td></tr>
${liq.asignacion_familiar > 0 ? `<tr><td>Asignación Familiar</td><td class="amt">${formatCLP(liq.asignacion_familiar)}</td></tr>` : ''}
<tr class="tot"><td>Total Haberes</td><td class="amt">${formatCLP(liq.total_haberes)}</td></tr></tbody></table>
<p class="sec">Descuentos</p><table><thead><tr><th>Concepto</th><th class="amt">Monto</th></tr></thead><tbody>
<tr><td>AFP</td><td class="amt">${formatCLP(liq.afp_trabajador)}</td></tr>
<tr><td>Salud</td><td class="amt">${formatCLP(liq.salud_trabajador)}</td></tr>
<tr><td>Seguro Cesantía (AFC)</td><td class="amt">${formatCLP(liq.afc_trabajador)}</td></tr>
${liq.impuesto_unico > 0 ? `<tr><td>Impuesto Único</td><td class="amt">${formatCLP(liq.impuesto_unico)}</td></tr>` : ''}
<tr class="tot"><td>Total Descuentos</td><td class="amt">${formatCLP(liq.total_descuentos)}</td></tr></tbody></table>
<table><tbody><tr class="final"><td>SUELDO LÍQUIDO A PAGAR</td><td class="amt">${formatCLP(liq.liquido_pagar)}</td></tr></tbody></table>
</body></html>`;
}

// ── Liquidación PDF generator (datos de Buk: lista todos los conceptos crudos) ──
function generateBukLiquidacionHTML(worker: any, liq: any, empleador: any) {
  const isEmployerCost = (d: string) => /empleador|mutual/i.test(d);
  const items: any[] = Array.isArray(liq.items) ? liq.items : [];
  const haberes = items.filter((x) => x.entry_type === 'debit' && !isEmployerCost(x.description));
  const descuentos = items.filter((x) => x.entry_type === 'credit' && !/l[ií]quido/i.test(x.description) && !isEmployerCost(x.description));
  const r = (lab: string, val: number) => `<tr><td>${lab}</td><td class="amt">${formatCLP(val)}</td></tr>`;
  const haberesRows = haberes.length ? haberes.map((x) => r(x.description, Number(x.amount) || 0)).join('') : r('Sueldo Base', liq.sueldoBase || 0) + r('Gratificación', liq.gratificacion || 0);
  const descRows = descuentos.length ? descuentos.map((x) => r(x.description, Number(x.amount) || 0)).join('') : r('AFP', liq.descAfp || 0) + r('Salud', liq.descSalud || 0) + r('Cesantía', liq.descCesantia || 0) + r('Impuesto', liq.impuestoUnico || 0);
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Liquidación ${liq.periodo}</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;padding:30px;color:#1a1a1a;font-size:13px}
h1{text-align:center;font-size:18px;margin-bottom:4px}.sub{text-align:center;color:#666;margin-bottom:24px;font-size:14px}
.info{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:24px;padding:16px;background:#f9fafb;border-radius:8px}
.info div{font-size:13px}.info strong{color:#333}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th{background:#f3f4f6;text-align:left;padding:8px 12px;font-size:12px;text-transform:uppercase;color:#666;border-bottom:2px solid #e5e7eb}
td{padding:8px 12px;border-bottom:1px solid #e5e7eb}.amt{text-align:right;font-variant-numeric:tabular-nums}
.tot{font-weight:bold;background:#f9fafb}.final{font-size:16px;font-weight:bold;background:#ecfdf5}
.sec{font-weight:bold;font-size:14px;margin:20px 0 8px;color:#333}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>LIQUIDACIÓN DE SUELDO</h1><p class="sub">${liq.periodo}</p>
<div class="info"><div><strong>Empleador:</strong> ${empleador?.nombre || ''} ${empleador?.apellido || ''}</div>
<div><strong>RUT Empleador:</strong> ${empleador?.rut || ''}</div>
<div><strong>Trabajador(a):</strong> ${worker.nombre} ${worker.apellido_paterno || ''}</div>
<div><strong>RUT:</strong> ${worker.rut}</div>
<div><strong>Cargo:</strong> ${worker.cargo || ''}</div></div>
<p class="sec">Haberes</p><table><thead><tr><th>Concepto</th><th class="amt">Monto</th></tr></thead><tbody>
${haberesRows}
<tr class="tot"><td>Total Haberes</td><td class="amt">${formatCLP(liq.totalHaberes || 0)}</td></tr></tbody></table>
<p class="sec">Descuentos</p><table><thead><tr><th>Concepto</th><th class="amt">Monto</th></tr></thead><tbody>
${descRows}
<tr class="tot"><td>Total Descuentos</td><td class="amt">${formatCLP(liq.totalDescuentos || 0)}</td></tr></tbody></table>
<table><tbody><tr class="final"><td>SUELDO LÍQUIDO A PAGAR</td><td class="amt">${formatCLP(liq.liquido || 0)}</td></tr></tbody></table>
<script>window.onload=function(){window.print()}</script>
</body></html>`;
}

// ── Certificado Asistencia generator ──
function generateAsistenciaHTML(worker: any, marcajes: any[], empleador: any) {
  const hoy = new Date().toLocaleDateString('es-CL');
  const totalHoras = marcajes.reduce((s: number, m: any) => s + (m.horas_trabajadas || 0), 0);
  const diasTrabajados = marcajes.filter((m: any) => m.hora_entrada).length;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Certificado de Asistencia</title>
<style>body{font-family:Arial,sans-serif;max-width:700px;margin:30px auto;padding:30px;color:#1a1a1a;font-size:13px}
h1{text-align:center;font-size:18px;margin-bottom:20px}
.info{margin-bottom:20px;padding:16px;background:#f9fafb;border-radius:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px}
.info strong{color:#333}
table{width:100%;border-collapse:collapse;margin:20px 0}
th{background:#f3f4f6;text-align:left;padding:8px 12px;font-size:12px;color:#666;border-bottom:2px solid #e5e7eb}
td{padding:8px 12px;border-bottom:1px solid #e5e7eb}
.summary{margin-top:20px;padding:16px;background:#ecfdf5;border-radius:8px;font-size:14px}
.sig{margin-top:60px;display:flex;justify-content:space-between}
.sig-block{text-align:center;width:40%;border-top:1px solid #333;padding-top:8px}
@media print{body{margin:0;padding:20px}}</style></head><body>
<h1>CERTIFICADO DE ASISTENCIA LABORAL</h1>
<div class="info"><div><strong>Empleador:</strong> ${empleador?.nombre || ''} ${empleador?.apellido || ''}</div>
<div><strong>Trabajador(a):</strong> ${worker.nombre} ${worker.apellido_paterno || ''}</div>
<div><strong>RUT Trabajador:</strong> ${worker.rut}</div>
<div><strong>Fecha emisión:</strong> ${hoy}</div></div>
<p>Se certifica que el(la) trabajador(a) registra la siguiente asistencia:</p>
<table><thead><tr><th>Fecha</th><th>Entrada</th><th>Salida Col.</th><th>Regreso Col.</th><th>Salida</th><th>Horas</th></tr></thead><tbody>
${marcajes.map((m: any) => `<tr><td>${new Date(m.fecha).toLocaleDateString('es-CL')}</td><td>${m.hora_entrada || '-'}</td><td>${m.hora_salida_colacion || '-'}</td><td>${m.hora_regreso_colacion || '-'}</td><td>${m.hora_salida || '-'}</td><td>${m.horas_trabajadas ? m.horas_trabajadas.toFixed(1) + 'h' : '-'}</td></tr>`).join('')}
</tbody></table>
<div class="summary"><strong>Resumen:</strong> ${diasTrabajados} días trabajados · ${totalHoras.toFixed(1)} horas totales</div>
<div class="sig"><div class="sig-block">${empleador?.nombre || ''} ${empleador?.apellido || ''}<br>Empleador</div>
<div class="sig-block">${worker.nombre} ${worker.apellido_paterno || ''}<br>Trabajador(a)</div></div></body></html>`;
}

export default function EmpleadoDetallePage() {
  const params = useParams();
  const id = params.id as string;
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>('resumen');
  const [worker, setWorker] = useState<any>(null);
  const [contrato, setContrato] = useState<any>(null);
  const [empleador, setEmpleador] = useState<any>(null);
  const [liquidaciones, setLiquidaciones] = useState<any[]>([]);
  const [visitas, setVisitas] = useState<any[]>([]);
  const [materiales, setMateriales] = useState<Record<string, any[]>>({});
  const [marcajes, setMarcajes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLiq, setExpandedLiq] = useState<string | null>(null);
  const [asistenciaPeriodo, setAsistenciaPeriodo] = useState<'semana' | 'mes' | 'todo'>('mes');
  const [allMarcajes, setAllMarcajes] = useState<any[]>([]);
  // BUK enrichment by RUT
  const [bukState, setBukState] = useState<'idle' | 'found' | 'notfound'>('idle');
  const [bukEmpleado, setBukEmpleado] = useState<any>(null);
  const [bukLiquidaciones, setBukLiquidaciones] = useState<any[]>([]);
  const [bukVacaciones, setBukVacaciones] = useState<any[]>([]);
  const [bukLicencias, setBukLicencias] = useState<any[]>([]);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const [wRes, cRes, lRes, mRes, eRes] = await Promise.all([
      supabase.from('trabajadores').select('*').eq('id', id).single(),
      supabase.from('contratos').select('*').eq('trabajador_id', id).eq('estado', 'activo').single(),
      supabase.from('liquidaciones').select('*').eq('trabajador_id', id).order('periodo', { ascending: false }).limit(12),
      supabase.from('marcajes_horario').select('*').eq('trabajador_id', id).order('fecha', { ascending: false }).limit(90),
      profile?.empleador_id ? supabase.from('empleadores').select('*').eq('id', profile.empleador_id).single() : Promise.resolve({ data: null }),
    ]);
    setWorker(wRes.data);
    setContrato(cRes.data);
    setLiquidaciones(lRes.data || []);
    setAllMarcajes(mRes.data || []);
    setEmpleador(eRes.data);

    // Cargar visitas si es trabajador por visitas (piscinero, jardinero, etc.)
    const cargo = (wRes.data?.cargo || '').toLowerCase();
    if (cargo.includes('piscin') || cargo.includes('jardin') || cargo === 'otro') {
      const { data: visitasData } = await supabase.from('visitas_servicio')
        .select('*').eq('trabajador_id', id).order('fecha', { ascending: false });
      setVisitas(visitasData || []);

      // Cargar materiales
      const visitaIds = (visitasData || []).map((v: any) => v.id);
      if (visitaIds.length > 0) {
        const { data: matData } = await supabase.from('materiales_visita')
          .select('*').in('visita_id', visitaIds);
        const byVisita: Record<string, any[]> = {};
        (matData || []).forEach((m: any) => {
          if (!byVisita[m.visita_id]) byVisita[m.visita_id] = [];
          byVisita[m.visita_id].push(m);
        });
        setMateriales(byVisita);
      }
    }
    setLoading(false);
  }, [id, profile?.empleador_id]);

  useEffect(() => { loadData(); }, [loadData]);

  // Enriquecimiento: buscar al trabajador en BUK por RUT
  useEffect(() => {
    if (!worker?.rut) return;
    let cancel = false;
    fetch(`/api/buk/by-rut?rut=${encodeURIComponent(worker.rut)}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancel) return;
        if (d?.found) { setBukState('found'); setBukEmpleado(d.empleado); setBukLiquidaciones(d.liquidaciones || []); setBukVacaciones(d.vacaciones || []); setBukLicencias(d.licencias || []); }
        else { setBukState('notfound'); }
      })
      .catch(() => { if (!cancel) setBukState('notfound'); });
    return () => { cancel = true; };
  }, [worker?.rut]);

  // Filter marcajes by period
  const filteredMarcajes = allMarcajes.filter(m => {
    if (asistenciaPeriodo === 'todo') return true;
    const fecha = new Date(m.fecha);
    const now = new Date();
    if (asistenciaPeriodo === 'semana') return now.getTime() - fecha.getTime() < 7 * 86400000;
    // mes: same month & year
    return fecha.getMonth() === now.getMonth() && fecha.getFullYear() === now.getFullYear();
  });

  // Toggle firma liquidacion
  const toggleFirma = async (liqId: string, firmada: boolean) => {
    const supabase = createClient();
    await supabase.from('liquidaciones').update({
      firmada_por_empleado: firmada,
      fecha_firma_empleado: firmada ? new Date().toISOString() : null,
    }).eq('id', liqId);
    setLiquidaciones(prev => prev.map(l => l.id === liqId ? { ...l, firmada_por_empleado: firmada, fecha_firma_empleado: firmada ? new Date().toISOString() : null } : l));
  };

  // Send toque (reminder to sign)
  const enviarToque = async (liqId: string) => {
    const supabase = createClient();
    await supabase.from('liquidaciones').update({
      toque_enviado: true,
      toque_enviado_at: new Date().toISOString(),
    }).eq('id', liqId);
    setLiquidaciones(prev => prev.map(l => l.id === liqId ? { ...l, toque_enviado: true, toque_enviado_at: new Date().toISOString() } : l));
  };

  // Upload worker photo
  const handlePhotoUpload = async (file: File) => {
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `trabajadores/${id}.${ext}`;
    await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const foto_url = data.publicUrl + '?t=' + Date.now();
    await supabase.from('trabajadores').update({ foto_url }).eq('id', id);
    loadData();
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  if (!worker) return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <AlertCircle className="h-12 w-12 text-zinc-300" />
      <p className="text-zinc-500">Empleado no encontrado</p>
      <Link href="/empresa/empleados" className="text-sm text-violet-600 hover:underline">Volver</Link>
    </div>
  );

  const nombre = `${worker.nombre} ${worker.apellido_paterno || ''}`.trim();
  const iniciales = `${(worker.nombre || '')[0] || ''}${(worker.apellido_paterno || '')[0] || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      <Link href="/empresa/empleados" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 transition">
        <ArrowLeft className="w-4 h-4" /> Volver
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="bg-gradient-to-r from-rose-500 to-rose-600 px-6 py-5">
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group">
              {worker.foto_url ? (
                <Image src={worker.foto_url} alt="" width={56} height={56} className="h-14 w-14 rounded-full object-cover border-2 border-white/30" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/20 text-lg font-bold text-white">{iniciales}</div>
              )}
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handlePhotoUpload(f); }} />
            </label>
            <div>
              <h1 className="text-xl font-bold text-white">{nombre}</h1>
              <p className="text-rose-100">{worker.cargo || 'Empleado'}</p>
              {bukState === 'found' && (
                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-400/90 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <BadgeCheck className="w-3 h-3" /> Datos sincronizados
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 flex flex-wrap gap-3">
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">{contrato?.tipo_contrato === 'indefinido' ? 'Indefinido' : contrato?.tipo_contrato || 'Sin contrato'}</span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">Activa</span>
          {contrato?.tipo_jornada && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">Jornada {contrato.tipo_jornada === 'completa' ? 'Completa' : contrato.tipo_jornada}</span>}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-zinc-100 p-1 w-fit">
        {getTabsForCargo(worker?.cargo).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6">
        {/* RESUMEN */}
        {activeTab === 'resumen' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Datos Personales</h3>
              <InfoRow icon={User} label="RUT" value={worker.rut} />
              <InfoRow icon={Mail} label="Email" value={worker.email || 'No registrado'} />
              <InfoRow icon={Phone} label="Teléfono" value={worker.telefono || 'No registrado'} />
              <InfoRow icon={MapPin} label="Dirección" value={worker.direccion || 'No registrada'} />
              <InfoRow icon={Calendar} label="Nacimiento" value={worker.fecha_nacimiento ? new Date(worker.fecha_nacimiento).toLocaleDateString('es-CL') : '-'} />
            </div>
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-900 uppercase tracking-wide">Datos Laborales</h3>
              <InfoRow icon={Briefcase} label="Cargo" value={worker.cargo || contrato?.cargo || '-'} />
              <InfoRow icon={DollarSign} label="Sueldo Base" value={formatCLP(contrato?.sueldo_base || 0)} />
              <InfoRow icon={Clock} label="Horas/Sem" value={contrato?.horas_semanales ? `${contrato.horas_semanales}h` : '-'} />
              <InfoRow icon={Calendar} label="Ingreso" value={contrato?.fecha_inicio ? new Date(contrato.fecha_inicio).toLocaleDateString('es-CL') : '-'} />
              <InfoRow icon={Palmtree} label="Antigüedad" value={contrato?.fecha_inicio ? calcAntiguedad(contrato.fecha_inicio) : '-'} />
              <InfoRow icon={Shield} label="Salud" value={worker.salud_tipo === 'fonasa' ? 'FONASA' : worker.salud_tipo || '-'} />
            </div>
            {bukState === 'found' && bukEmpleado && (
              <div className="md:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <BadgeCheck className="w-4 h-4" /> Datos sincronizados
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm text-zinc-800">
                  {([
                    ['RUT', bukEmpleado.rut],
                    ['Cargo', bukEmpleado.cargo],
                    ['Estado', bukEmpleado.estado],
                    ['Sueldo Base', bukEmpleado.sueldoBase > 0 ? formatCLP(bukEmpleado.sueldoBase) : ''],
                    ['Tipo Contrato', bukEmpleado.tipoContrato],
                    ['Ingreso', bukEmpleado.fechaIngreso],
                    ['Horas/Sem', bukEmpleado.horasSemanales ? `${bukEmpleado.horasSemanales}h` : ''],
                    ['Tipo Jornada', bukEmpleado.tipoJornada],
                    ['Gratificación', bukEmpleado.gratificacionLegal ? 'Sí' : ''],
                    ['AFP / Fondo', bukEmpleado.afp],
                    ['Régimen Previsional', bukEmpleado.regimenPrevisional],
                    ['Salud', bukEmpleado.salud],
                    ['Seguro Cesantía', bukEmpleado.seguroCesantia],
                    ['Email', bukEmpleado.email],
                    ['Email Personal', bukEmpleado.emailPersonal],
                    ['Teléfono', bukEmpleado.telefono],
                    ['Dirección', bukEmpleado.direccion],
                    ['Comuna', bukEmpleado.comuna],
                    ['Región', bukEmpleado.region],
                    ['Nacionalidad', bukEmpleado.nacionalidad],
                    ['Estado Civil', bukEmpleado.estadoCivil],
                    ['Sexo', bukEmpleado.sexo],
                    ['Nacimiento', bukEmpleado.fechaNacimiento],
                    ['Banco', bukEmpleado.banco],
                    ['Tipo Cuenta', bukEmpleado.tipoCuenta],
                    ['N° Cuenta', bukEmpleado.numeroCuenta],
                    ['Método Pago', bukEmpleado.metodoPago],
                    ['Cargas', bukEmpleado.cargas != null ? `${bukEmpleado.cargas}${bukEmpleado.tramoAsignacion ? ` (tramo ${bukEmpleado.tramoAsignacion})` : ''}` : ''],
                    ['Código Ficha', bukEmpleado.codigoFicha],
                    ['Centro Costo', bukEmpleado.centroCosto],
                    ['Jefe', bukEmpleado.jefe],
                    ['Vac. Progresivas', bukEmpleado.inicioVacacionesProgresivas],
                  ] as [string, any][]).filter(([, v]) => v !== '' && v != null).map(([label, val]) => (
                    <div key={label}><span className="text-zinc-400 text-xs block">{label}</span>{String(val)}</div>
                  ))}
                </div>
                {bukVacaciones.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Vacaciones</p>
                    <div className="space-y-1.5">
                      {bukVacaciones.map((v, i) => {
                        const st = String(v.estado || '').toLowerCase();
                        const fin = v.fin ? new Date(v.fin + 'T00:00:00') : null;
                        const e = st.includes('reject') || st.includes('rechaz') || st.includes('cancel') || st.includes('denied') ? 'rechazada' : (st.includes('approv') || st.includes('aprob') || st.includes('acept') ? (fin && fin < new Date() ? 'tomada' : 'aprobada') : 'solicitada');
                        const c = e === 'tomada' ? 'bg-blue-100 text-blue-700' : e === 'aprobada' ? 'bg-emerald-100 text-emerald-700' : e === 'rechazada' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700';
                        return (
                          <div key={i} className="flex flex-wrap items-center gap-2 text-xs">
                            <span className={'px-2 py-0.5 rounded-full font-medium capitalize ' + c}>{e}</span>
                            <span className="text-zinc-700 font-medium">{Number(v.dias) || 0} días</span>
                            <span className="text-zinc-400">{v.inicio || '—'} → {v.fin || '—'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* CONTRATO */}
        {activeTab === 'contrato' && contrato && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-zinc-900">Contrato #{contrato.numero_contrato}</h3>
              <div className="flex gap-2">
                <button onClick={() => openPrintWindow(generateContractHTML(worker, contrato, empleador))}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition">
                  <Printer className="w-4 h-4" /> Imprimir
                </button>
                <button onClick={() => openPrintWindow(generateContractHTML(worker, contrato, empleador))}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white hover:bg-violet-700 transition">
                  <Download className="w-4 h-4" /> Descargar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <CField label="Tipo Contrato" value={contrato.tipo_contrato === 'indefinido' ? 'Indefinido' : contrato.tipo_contrato} />
              <CField label="Jornada" value={`${contrato.tipo_jornada} (${contrato.horas_semanales}h/sem)`} />
              <CField label="Sueldo Base" value={formatCLP(contrato.sueldo_base)} />
              <CField label="Fecha Inicio" value={new Date(contrato.fecha_inicio).toLocaleDateString('es-CL')} />
              <CField label="Gratificación" value={contrato.tipo_gratificacion === 'art_50' ? 'Art. 50 (tope)' : 'Art. 47'} />
              <CField label="Cargo" value={contrato.cargo || worker.cargo || '-'} />
              <CField label="Vacaciones" value={`${contrato.dias_vacaciones_anuales || 15} días anuales`} />
              <CField label="Estado" value={contrato.estado} />
            </div>

            {/* Upload contrato/acuerdo */}
            <div className="mt-6 pt-6 border-t border-zinc-200">
              <h4 className="text-sm font-semibold text-zinc-700 mb-3">Subir Contrato o Acuerdo</h4>
              <p className="text-xs text-zinc-500 mb-3">Sube un documento firmado (PDF, imagen) al perfil de la trabajadora. Se notificará al administrador.</p>
              <label className="inline-flex items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-50 cursor-pointer transition">
                <FileText className="w-4 h-4" />
                Seleccionar archivo
                <input type="file" accept=".pdf,image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file || !contrato) return;
                  const supabase = createClient();
                  const ext = file.name.split('.').pop();
                  const path = `contratos/${id}/${Date.now()}.${ext}`;
                  await supabase.storage.from('avatars').upload(path, file, { upsert: true });
                  const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
                  const archivo_url = urlData.publicUrl;
                  // Save to documentos_empleado
                  await supabase.from('documentos_empleado').insert({
                    trabajador_id: id,
                    tipo: 'contrato',
                    nombre: file.name,
                    archivo_url,
                  });
                  // Notify admin
                  await supabase.from('notificaciones_admin').insert({
                    tipo: 'contrato_subido',
                    titulo: `Nuevo contrato subido: ${worker.nombre} ${worker.apellido_paterno || ''}`,
                    descripcion: `El empleador subió el documento "${file.name}" al perfil del trabajador.`,
                    empleador_id: profile?.empleador_id,
                    trabajador_id: id,
                  });
                  alert('Documento subido correctamente. El administrador ha sido notificado.');
                  loadData();
                }} />
              </label>

              {/* List uploaded docs */}
              <DocsList trabajadorId={id} />
            </div>
          </div>
        )}
        {activeTab === 'contrato' && !contrato && bukState === 'found' && bukEmpleado && (
          <div className="space-y-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="text-sm font-semibold text-emerald-800 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4" /> Contrato (datos de Buk)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                {([
                  ['Tipo Contrato', bukEmpleado.tipoContrato],
                  ['Cargo', bukEmpleado.cargo],
                  ['Sueldo Base', bukEmpleado.sueldoBase > 0 ? formatCLP(bukEmpleado.sueldoBase) : ''],
                  ['Jornada', bukEmpleado.tipoJornada ? `${bukEmpleado.tipoJornada} (${bukEmpleado.horasSemanales}h/sem)` : (bukEmpleado.horasSemanales ? `${bukEmpleado.horasSemanales}h/sem` : '')],
                  ['Fecha Inicio', bukEmpleado.fechaInicioContrato],
                  ['Fecha Suscripcion', bukEmpleado.fechaSuscripcion],
                  ['Fecha Termino', bukEmpleado.fechaTerminoContrato],
                  ['Gratificacion Legal', bukEmpleado.gratificacionLegal ? 'Si' : 'No'],
                  ['Centro de Costo', bukEmpleado.centroCosto],
                  ['Jefatura', bukEmpleado.jefe],
                  ['Dias de Trabajo', bukEmpleado.diasTrabajo ? `${bukEmpleado.diasTrabajo} dias/sem` : ''],
                  ['Estado', bukEmpleado.estado],
                ] as [string, any][]).filter(([, v]) => v !== '' && v != null).map(([label, val]) => (
                  <CField key={label} label={label} value={String(val)} />
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'contrato' && !contrato && bukState !== 'found' && <p className="text-sm text-zinc-500 text-center py-8">Sin contrato activo.</p>}

        {/* LIQUIDACIONES / SERVICIOS */}
        {activeTab === 'liquidaciones' && (() => {
          const cargo = (worker?.cargo || '').toLowerCase();
          const esPorVisitas = cargo.includes('piscin') || cargo.includes('jardin');

          if (esPorVisitas) {
            const aprobadas = visitas.filter(v => v.estado === 'aprobada');
            const totalVisitas = aprobadas.reduce((s: number, v: any) => s + (v.costo_visita || 0), 0);
            const totalMats = Object.values(materiales).flat().filter((m: any) => m.aprobado).reduce((s: number, m: any) => s + (m.costo * (m.cantidad || 1)), 0);
            const porMes: Record<string, { visitas: number; monto: number; materiales: number }> = {};
            aprobadas.forEach((v: any) => {
              const mes = v.fecha?.substring(0, 7) || '';
              if (!porMes[mes]) porMes[mes] = { visitas: 0, monto: 0, materiales: 0 };
              porMes[mes].visitas++;
              porMes[mes].monto += v.costo_visita || 0;
              const mats = materiales[v.id] || [];
              porMes[mes].materiales += mats.filter((m: any) => m.aprobado).reduce((s: number, m: any) => s + (m.costo * (m.cantidad || 1)), 0);
            });

            return (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-zinc-900">Resumen de Servicios</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="rounded-lg bg-emerald-50 p-4 text-center">
                    <p className="text-2xl font-bold text-emerald-700">{aprobadas.length}</p>
                    <p className="text-xs text-emerald-600">Visitas aprobadas</p>
                  </div>
                  <div className="rounded-lg bg-violet-50 p-4 text-center">
                    <p className="text-2xl font-bold text-violet-700">{formatCLP(totalVisitas)}</p>
                    <p className="text-xs text-violet-600">Total servicios</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{formatCLP(totalMats)}</p>
                    <p className="text-xs text-blue-600">Materiales</p>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-zinc-700 mt-4">Detalle por Mes</h4>
                {Object.entries(porMes).sort(([a], [b]) => b.localeCompare(a)).map(([mes, data]) => (
                  <div key={mes} className="rounded-lg border border-zinc-200 p-4 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{mes}</p>
                      <p className="text-xs text-zinc-500">{data.visitas} visitas · Materiales {formatCLP(data.materiales)}</p>
                    </div>
                    <p className="text-lg font-bold text-zinc-900">{formatCLP(data.monto + data.materiales)}</p>
                  </div>
                ))}
              </div>
            );
          }

          return (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Liquidaciones</h3>
            {bukState === 'found' && bukLiquidaciones.length > 0 && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs font-semibold text-emerald-800 uppercase mb-2 flex items-center gap-1"><BadgeCheck className="w-3.5 h-3.5" /> Liquidaciones anteriores</p>
                <div className="space-y-1.5">
                  {bukLiquidaciones.slice(0, 12).map((l: any, i: number) => (
                    <div key={i} onClick={() => openPrintWindow(generateBukLiquidacionHTML(worker, l, empleador))} title="Ver liquidación en PDF"
                      className="flex items-center justify-between text-sm bg-white rounded-lg px-3 py-2 border border-emerald-100 hover:bg-emerald-50 cursor-pointer transition">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-500" />
                        <span className="text-zinc-700">{l.periodo || l.period || `Ítem ${i + 1}`}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-zinc-900">{typeof l.liquido === 'number' ? formatCLP(l.liquido) : (typeof l.amount === 'number' ? formatCLP(l.amount) : '')}</span>
                        <button onClick={(e) => { e.stopPropagation(); openPrintWindow(generateBukLiquidacionHTML(worker, l, empleador)); }}
                          className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600 transition" title="Descargar PDF">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {liquidaciones.length === 0 ? (
              !(bukState === 'found' && bukLiquidaciones.length > 0) && <p className="text-sm text-zinc-500 text-center py-8">Sin liquidaciones.</p>
            ) : (
              liquidaciones.map(liq => (
                <div key={liq.id} className="rounded-lg border border-zinc-200 overflow-hidden">
                  <div className="px-4 py-3 flex items-center justify-between hover:bg-zinc-50 transition cursor-pointer" onClick={() => setExpandedLiq(expandedLiq === liq.id ? null : liq.id)}>
                    <div className="flex items-center gap-3">
                      <FileText className="w-4 h-4 text-zinc-400" />
                      <span className="text-sm font-medium text-zinc-900">{liq.periodo}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${liq.estado === 'pagada' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{liq.estado}</span>
                      {liq.firmada_por_empleado ? (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Firmada</span>
                      ) : (
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">Sin firmar</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-zinc-900">{formatCLP(liq.liquido_pagar)}</span>
                      <button onClick={(e) => { e.stopPropagation(); openPrintWindow(generateLiquidacionHTML(worker, liq, empleador)); }}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition" title="Imprimir">
                        <Printer className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openPrintWindow(generateLiquidacionHTML(worker, liq, empleador)); }}
                        className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition" title="Descargar">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {expandedLiq === liq.id && (
                    <div className="px-4 pb-4 border-t border-zinc-100 bg-zinc-50">
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 py-3 text-sm">
                        <div className="flex justify-between"><span className="text-zinc-500">Sueldo Base</span><span>{formatCLP(liq.sueldo_base)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Gratificación</span><span>{formatCLP(liq.gratificacion_legal)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Colación</span><span>{formatCLP(liq.colacion)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Movilización</span><span>{formatCLP(liq.movilizacion)}</span></div>
                        <div className="flex justify-between font-medium border-t border-zinc-200 pt-2"><span>Total Haberes</span><span>{formatCLP(liq.total_haberes)}</span></div>
                        <div className="flex justify-between font-medium border-t border-zinc-200 pt-2"><span>Total Descuentos</span><span className="text-red-600">-{formatCLP(liq.total_descuentos)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">AFP</span><span>-{formatCLP(liq.afp_trabajador)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">Salud</span><span>-{formatCLP(liq.salud_trabajador)}</span></div>
                        <div className="flex justify-between"><span className="text-zinc-500">AFC</span><span>-{formatCLP(liq.afc_trabajador)}</span></div>
                      </div>
                      {/* Firma actions */}
                      <div className="mt-3 pt-3 border-t border-zinc-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleFirma(liq.id, !liq.firmada_por_empleado)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${liq.firmada_por_empleado ? 'bg-blue-100 text-blue-700' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {liq.firmada_por_empleado ? 'Firmada por empleado' : 'Marcar como firmada'}
                          </button>
                        </div>
                        {!liq.firmada_por_empleado && (
                          <button onClick={() => enviarToque(liq.id)}
                            disabled={liq.toque_enviado}
                            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition disabled:opacity-50">
                            <Bell className="w-3.5 h-3.5" />
                            {liq.toque_enviado ? 'Toque enviado' : 'Enviar toque para firmar'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
          );
        })()}

        {/* VACACIONES */}
        {activeTab === 'vacaciones' && (() => {
          const clasif = (v: any) => {
            const st = String(v.estado || '').toLowerCase();
            const fin = v.fin ? new Date(v.fin + 'T00:00:00') : null;
            if (st.includes('reject') || st.includes('rechaz') || st.includes('cancel') || st.includes('denied')) return 'rechazada';
            if (st.includes('approv') || st.includes('aprob') || st.includes('acept')) return (fin && fin < new Date()) ? 'tomada' : 'aprobada';
            return 'por_aprobar';
          };
          const vac = bukVacaciones.map((v: any) => ({ ...v, _e: clasif(v) }));
          const dias = (e: string) => vac.filter((v: any) => v._e === e).reduce((s: number, v: any) => s + (Number(v.dias) || 0), 0);
          const cnt = (e: string) => vac.filter((v: any) => v._e === e).length;
          const ingreso = bukEmpleado?.fechaIngreso || contrato?.fecha_inicio;
          const mesesEntre = (desde?: string) => {
            if (!desde) return 0;
            const d = new Date(desde); if (isNaN(d.getTime())) return 0;
            const n = new Date();
            return Math.max(0, (n.getFullYear() - d.getFullYear()) * 12 + (n.getMonth() - d.getMonth()));
          };
          const meses = mesesEntre(ingreso);
          const basicas = meses * 1.25; // 15 días hábiles/año (Art. 67) = 1,25/mes
          // Feriado progresivo (Art. 68): +1 día hábil/año por cada 3 años desde que aplica. Buk: progressive_vacations_start.
          let progresivas = 0;
          let mp = mesesEntre(bukEmpleado?.inicioVacacionesProgresivas);
          for (let k = 0; mp > 0; k++) { const m = Math.min(mp, 36); progresivas += (k + 1) * (m / 12); mp -= m; }
          progresivas = Math.round(progresivas * 10) / 10;
          const acumuladas = Math.round((basicas + progresivas) * 10) / 10;
          const tomadas = dias('tomada');
          const reservadas = dias('aprobada');
          const disponibles = Math.round((acumuladas - tomadas - reservadas) * 10) / 10;
          const cards: [string, string, string][] = [
            ['Acumuladas', `${acumuladas} días`, 'bg-violet-50 text-violet-700'],
            ['Tomadas', `${tomadas} días`, 'bg-blue-50 text-blue-700'],
            ['Disponibles', `${disponibles} días`, 'bg-emerald-50 text-emerald-700'],
            ['Por aprobar', `${cnt('por_aprobar')} (${dias('por_aprobar')}d)`, 'bg-amber-50 text-amber-700'],
            ['Aprobadas', `${cnt('aprobada')} (${reservadas}d)`, 'bg-teal-50 text-teal-700'],
            ['Rechazadas', `${cnt('rechazada')}`, 'bg-rose-50 text-rose-700'],
          ];
          const badgeCls: Record<string, string> = { tomada: 'bg-blue-100 text-blue-700', aprobada: 'bg-teal-100 text-teal-700', rechazada: 'bg-rose-100 text-rose-700', por_aprobar: 'bg-amber-100 text-amber-700' };
          const badgeLbl: Record<string, string> = { tomada: 'Tomada', aprobada: 'Aprobada', rechazada: 'Rechazada', por_aprobar: 'Por aprobar' };
          return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-zinc-900">Vacaciones</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {cards.map(([label, val, cls]) => (
                  <div key={label} className={'rounded-xl p-4 ' + cls}>
                    <p className="text-2xl font-bold">{val}</p>
                    <p className="text-xs font-medium opacity-80">{label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-400">Acumuladas estimadas según antigüedad: 1,25 días hábiles/mes (Art. 67){progresivas > 0 ? ` + ${progresivas}d progresivos (Art. 68)` : ''}. Disponibles = acumuladas − tomadas − aprobadas. Buk no expone el saldo por API; es una estimación legal.</p>
              {bukState !== 'found' ? (
                <p className="text-sm text-zinc-500 text-center py-6">No sincronizado con Buk.</p>
              ) : vac.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">Sin vacaciones registradas.</p>
              ) : (
                <div className="space-y-2">
                  {vac.sort((a: any, b: any) => String(b.inicio || '').localeCompare(String(a.inicio || ''))).map((v: any, i: number) => (
                    <div key={i} className="flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm">
                      <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + (badgeCls[v._e] || 'bg-zinc-100 text-zinc-700')}>{badgeLbl[v._e] || v._e}</span>
                      <span className="font-semibold text-zinc-900">{Number(v.dias) || 0} días</span>
                      <span className="text-zinc-500">{v.inicio || '—'} → {v.fin || '—'}</span>
                      {v.tipo && <span className="text-zinc-400">· {v.tipo}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* LICENCIAS MÉDICAS */}
        {activeTab === 'licencias' && (() => {
          const estadoCls = (e: string) => { const s = String(e).toLowerCase(); return s.includes('approv') || s.includes('aprob') ? 'bg-emerald-100 text-emerald-700' : s.includes('reject') || s.includes('rechaz') ? 'bg-rose-100 text-rose-700' : s.includes('cancel') ? 'bg-zinc-100 text-zinc-600' : 'bg-amber-100 text-amber-700'; };
          const estadoLbl = (e: string) => { const s = String(e).toLowerCase(); return s.includes('approv') || s.includes('aprob') ? 'Aprobada' : s.includes('reject') || s.includes('rechaz') ? 'Rechazada' : s.includes('cancel') ? 'Cancelada' : 'Pendiente'; };
          const totalDias = bukLicencias.reduce((s: number, l: any) => s + (Number(l.dias) || 0), 0);
          return (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-zinc-900">Licencias médicas</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="rounded-xl p-4 bg-rose-50 text-rose-700"><p className="text-2xl font-bold">{bukLicencias.length}</p><p className="text-xs font-medium opacity-80">Licencias</p></div>
                <div className="rounded-xl p-4 bg-amber-50 text-amber-700"><p className="text-2xl font-bold">{totalDias} días</p><p className="text-xs font-medium opacity-80">Días totales</p></div>
                <div className="rounded-xl p-4 bg-emerald-50 text-emerald-700"><p className="text-2xl font-bold">{bukLicencias.filter((l: any) => String(l.estado).toLowerCase().includes('aprob') || String(l.estado).toLowerCase().includes('approv')).length}</p><p className="text-xs font-medium opacity-80">Aprobadas</p></div>
              </div>
              {bukState !== 'found' ? (
                <p className="text-sm text-zinc-500 text-center py-6">No sincronizado con Buk.</p>
              ) : bukLicencias.length === 0 ? (
                <p className="text-sm text-zinc-500 text-center py-6">Sin licencias médicas registradas en Buk.</p>
              ) : (
                <div className="space-y-2">
                  {bukLicencias.sort((a: any, b: any) => String(b.inicio || '').localeCompare(String(a.inicio || ''))).map((l: any, i: number) => (
                    <div key={i} className="rounded-lg border border-zinc-200 px-4 py-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className={'px-2 py-0.5 rounded-full text-xs font-medium ' + estadoCls(l.estado)}>{estadoLbl(l.estado)}</span>
                        <span className="font-semibold text-zinc-900">{l.tipo || 'Licencia médica'}</span>
                        <span className="text-zinc-700">{Number(l.dias) || 0} días</span>
                        <span className="text-zinc-500">{l.inicio || '—'} → {l.fin || '—'}</span>
                        {l.folio && <span className="text-zinc-400">· Folio {l.folio}</span>}
                      </div>
                      {l.observaciones && <p className="mt-1 text-xs text-zinc-500">{l.observaciones}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ASISTENCIA / VISITAS */}
        {activeTab === 'asistencia' && (() => {
          const cargo = (worker?.cargo || '').toLowerCase();
          const esPorVisitas = cargo.includes('piscin') || cargo.includes('jardin');

          if (esPorVisitas && visitas.length > 0) {
            const diaSemana = cargo.includes('piscin') ? 'Viernes' : 'Miércoles';
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900">Asistencia — {diaSemana}s</h3>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Realizada y aprobada</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Completada (por aprobar)</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> No realizada / Pendiente</span>
                  </div>
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                  {visitas.map(v => {
                    const bg = v.estado === 'aprobada' ? 'bg-emerald-500 text-white' :
                               v.estado === 'completada' ? 'bg-blue-500 text-white' :
                               v.estado === 'no_realizada' ? 'bg-red-500 text-white' :
                               new Date(v.fecha) < new Date() ? 'bg-red-100 text-red-700 border border-red-300' :
                               'bg-zinc-100 text-zinc-600';
                    return (
                      <div key={v.id} className={`rounded-lg p-2 text-center ${bg}`} title={v.estado}>
                        <p className="text-[10px] opacity-80">{new Date(v.fecha).toLocaleDateString('es-CL', { month: 'short' })}</p>
                        <p className="text-lg font-bold">{new Date(v.fecha).getDate()}</p>
                        <p className="text-[10px]">{diaSemana.substring(0, 3)}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Pending approvals */}
                {visitas.filter(v => v.estado === 'completada').length > 0 && (
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-semibold text-blue-900 mb-2">Visitas pendientes de aprobación</p>
                    {visitas.filter(v => v.estado === 'completada').map(v => (
                      <div key={v.id} className="flex items-center justify-between py-1">
                        <span className="text-sm text-blue-800">{new Date(v.fecha).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        <button onClick={async () => {
                          const supabase = createClient();
                          await supabase.from('visitas_servicio').update({ estado: 'aprobada', aprobada_por_empleador: true, aprobada_at: new Date().toISOString() }).eq('id', v.id);
                          loadData();
                        }} className="rounded-lg bg-emerald-600 text-white px-3 py-1 text-xs font-medium hover:bg-emerald-700">
                          Aprobar visita
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Summary */}
                <div className="rounded-lg bg-zinc-50 px-4 py-2 flex gap-6 text-xs text-zinc-600">
                  <span><strong>{visitas.filter(v => v.estado === 'aprobada').length}</strong> aprobadas</span>
                  <span><strong>{visitas.filter(v => v.estado === 'no_realizada' || (v.estado === 'programada' && new Date(v.fecha) < new Date())).length}</strong> faltó</span>
                  <span><strong>{visitas.filter(v => v.estado === 'programada' && new Date(v.fecha) >= new Date()).length}</strong> próximas</span>
                </div>
              </div>
            );
          }

          // Normal attendance (asesora, etc.)
          return (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h3 className="text-lg font-semibold text-zinc-900">Registro de Asistencia</h3>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg bg-zinc-100 p-0.5">
                    {(['semana', 'mes', 'todo'] as const).map(p => (
                      <button key={p} onClick={() => setAsistenciaPeriodo(p)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition ${asistenciaPeriodo === p ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'}`}>
                        {p === 'semana' ? 'Semana' : p === 'mes' ? 'Este mes' : 'Todo'}
                      </button>
                    ))}
                  </div>
                  {filteredMarcajes.length > 0 && (
                    <button onClick={() => openPrintWindow(generateAsistenciaHTML(worker, filteredMarcajes, empleador))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-700 transition">
                      <Printer className="w-3.5 h-3.5" /> Certificado
                    </button>
                  )}
                </div>
              </div>
              {filteredMarcajes.length === 0 ? <p className="text-sm text-zinc-500 text-center py-8">Sin marcajes en este período.</p> : (
                <>
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Fecha</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Entrada</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Salida</th>
                      <th className="px-4 py-2 text-left font-medium text-zinc-500">Horas</th>
                    </tr></thead>
                    <tbody className="divide-y divide-zinc-100">
                      {filteredMarcajes.map(m => (
                        <tr key={m.id} className="hover:bg-zinc-50">
                          <td className="px-4 py-2">{new Date(m.fecha).toLocaleDateString('es-CL')}</td>
                          <td className="px-4 py-2">{m.hora_entrada || '-'}</td>
                          <td className="px-4 py-2">{m.hora_salida || '-'}</td>
                          <td className="px-4 py-2">{m.horas_trabajadas ? `${m.horas_trabajadas.toFixed(1)}h` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-3 rounded-lg bg-zinc-50 px-4 py-2 flex gap-6 text-xs text-zinc-600">
                    <span><strong>{filteredMarcajes.filter(m => m.hora_entrada).length}</strong> días</span>
                    <span><strong>{filteredMarcajes.reduce((s: number, m: any) => s + (m.horas_trabajadas || 0), 0).toFixed(1)}</strong> horas totales</span>
                  </div>
                </>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-zinc-400 shrink-0" />
      <span className="text-zinc-500 w-24 shrink-0">{label}</span>
      <span className="text-zinc-900">{value}</span>
    </div>
  );
}

function CField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-zinc-50 p-3">
      <p className="text-xs text-zinc-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-zinc-900 capitalize">{value}</p>
    </div>
  );
}

function DocsList({ trabajadorId }: { trabajadorId: string }) {
  const [docs, setDocs] = useState<any[]>([]);
  useEffect(() => {
    const supabase = createClient();
    supabase.from('documentos_empleado').select('*').eq('trabajador_id', trabajadorId).eq('tipo', 'contrato').order('created_at', { ascending: false })
      .then(({ data }: any) => setDocs(data || []));
  }, [trabajadorId]);

  if (docs.length === 0) return null;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-xs font-medium text-zinc-500">Documentos subidos</p>
      {docs.map((d: any) => (
        <a key={d.id} href={d.archivo_url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm text-violet-600 hover:underline">
          <FileText className="w-4 h-4" /> {d.nombre}
        </a>
      ))}
    </div>
  );
}
