'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  Eye,
  Download,
  Printer,
  X,
  Loader2,
  AlertCircle,
  FilterX,
  DollarSign,
  MinusCircle,
  Wallet,
  FileText,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Trabajador {
  id: string;
  nombre: string;
  apellido_paterno: string;
  cargo: string;
  rut?: string;
}

interface Liquidacion {
  id: string;
  trabajador_id: string;
  periodo: string;
  sueldo_base: number;
  gratificacion_legal: number;
  horas_extras_50: number;
  bonos_imponibles?: number;
  colacion?: number;
  movilizacion?: number;
  total_haberes: number;
  afp_trabajador: number;
  salud_trabajador: number;
  afc_trabajador: number;
  impuesto_unico: number;
  total_descuentos: number;
  liquido_pagar: number;
  estado: string;
  created_at: string;
  items?: { description: string; amount: number; entry_type: string }[];
  trabajadores: Trabajador;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL');
}

function periodoLabel(p: string): string {
  const [y, m] = p.split('-');
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
  ];
  return `${meses[parseInt(m, 10) - 1]} ${y}`;
}

function estadoBadge(estado: string) {
  const map: Record<string, string> = {
    borrador: 'bg-zinc-100 text-zinc-700',
    calculada: 'bg-blue-50 text-blue-700',
    aprobada: 'bg-amber-50 text-amber-700',
    pagada: 'bg-emerald-50 text-emerald-700',
  };
  return map[estado.toLowerCase()] ?? 'bg-zinc-100 text-zinc-700';
}

function estadoLabel(estado: string) {
  return estado.charAt(0).toUpperCase() + estado.slice(1);
}

function nombreCompleto(t: Trabajador) {
  return `${t.nombre} ${t.apellido_paterno}`;
}

// ---------------------------------------------------------------------------
// PDF Download
// ---------------------------------------------------------------------------

function downloadLiquidacionPDF(liq: Liquidacion, trabajador: Trabajador, returnHtml?: boolean): any {
  if (!returnHtml) {
    const w = window.open('', '_blank');
    if (!w) return;
    const html = downloadLiquidacionPDF(liq, trabajador, true);
    w.document.write(html);
    w.document.close();
    return;
  }

  const row = (label: string, value: number) =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #e4e4e7">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #e4e4e7;text-align:right">${fmt(value)}</td></tr>`;

  // Si vienen los conceptos crudos de Buk (/accounting), se listan todos; si no, se usan los campos fijos.
  const isEmployerCost = (d: string) => /empleador|mutual/i.test(d);
  const items = liq.items || [];
  const haberesItems = items.filter((x) => x.entry_type === 'debit' && !isEmployerCost(x.description));
  const descItems = items.filter((x) => x.entry_type === 'credit' && !/l[ií]quido/i.test(x.description) && !isEmployerCost(x.description));

  const haberesRows = haberesItems.length
    ? haberesItems.map((x) => row(x.description, Number(x.amount) || 0)).join('')
    : row('Sueldo Base', liq.sueldo_base) + row('Gratificación Legal', liq.gratificacion_legal) + row('Horas Extras 50%', liq.horas_extras_50) + row('Bonos Imponibles', liq.bonos_imponibles ?? 0) + row('Colación (no imponible)', liq.colacion ?? 0) + row('Movilización (no imponible)', liq.movilizacion ?? 0);

  const descRows = descItems.length
    ? descItems.map((x) => row(x.description, Number(x.amount) || 0)).join('')
    : row('AFP Trabajador', liq.afp_trabajador) + row('Salud Trabajador', liq.salud_trabajador) + row('AFC Trabajador (Cesantía)', liq.afc_trabajador) + row('Impuesto Único', liq.impuesto_unico);

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Liquidación - ${nombreCompleto(trabajador)} - ${periodoLabel(liq.periodo)}</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;color:#18181b;margin:40px;font-size:13px}
  h1{font-size:20px;text-align:center;margin-bottom:4px}
  .sub{text-align:center;color:#71717a;font-size:12px;margin-bottom:24px}
  .info{display:flex;justify-content:space-between;margin-bottom:24px}
  .info div{line-height:1.6}
  .info strong{display:inline-block;min-width:80px}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  th{background:#f4f4f5;padding:8px 12px;text-align:left;font-size:12px;text-transform:uppercase;color:#71717a;letter-spacing:0.5px}
  th:last-child{text-align:right}
  .total-row td{font-weight:700;border-top:2px solid #18181b;padding-top:10px}
  .liquido{text-align:center;font-size:22px;font-weight:700;color:#059669;margin:24px 0}
  .signatures{display:flex;justify-content:space-around;margin-top:80px}
  .sig-line{text-align:center;width:200px}
  .sig-line hr{border:none;border-top:1px solid #18181b;margin-bottom:6px}
  .footer{text-align:center;color:#a1a1aa;font-size:11px;margin-top:48px}
  @media print{body{margin:20px}}
</style>
</head>
<body>
<h1>LIQUIDACI&Oacute;N DE SUELDO</h1>
<p class="sub">Documento generado por Poppins ERP</p>

<div class="info">
  <div>
    <strong>Empleador:</strong> Rene Alejandro Aravena Riffo<br/>
    <strong>RUT:</strong> 6.836.579-1
  </div>
  <div style="text-align:right">
    <strong>Trabajador:</strong> ${nombreCompleto(trabajador)}<br/>
    <strong>RUT:</strong> ${trabajador.rut ?? 'No registrado'}<br/>
    <strong>Cargo:</strong> ${trabajador.cargo}<br/>
    <strong>Per&iacute;odo:</strong> ${periodoLabel(liq.periodo)}
  </div>
</div>

<h3 style="margin-bottom:8px">Haberes</h3>
<table>
  <thead><tr><th>Concepto</th><th>Monto</th></tr></thead>
  <tbody>
    ${haberesRows}
    <tr class="total-row"><td style="padding:10px 12px">Total Haberes</td><td style="padding:10px 12px;text-align:right">${fmt(liq.total_haberes)}</td></tr>
  </tbody>
</table>

<h3 style="margin-bottom:8px">Descuentos</h3>
<table>
  <thead><tr><th>Concepto</th><th>Monto</th></tr></thead>
  <tbody>
    ${descRows}
    <tr class="total-row"><td style="padding:10px 12px">Total Descuentos</td><td style="padding:10px 12px;text-align:right">${fmt(liq.total_descuentos)}</td></tr>
  </tbody>
</table>

<div class="liquido">Sueldo L&iacute;quido: ${fmt(liq.liquido_pagar)}</div>

<div class="signatures">
  <div class="sig-line"><hr/>Empleador</div>
  <div class="sig-line"><hr/>Trabajador</div>
</div>

<p class="footer">Documento generado por Poppins ERP</p>
<script>window.onload=function(){window.print()}</script>
</body></html>`;

  return html;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LiquidacionesEmpresaPage() {
  // Data
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filtroPeriodo, setFiltroPeriodo] = useState('');
  const [filtroEmpleado, setFiltroEmpleado] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Detail modal
  const [detalle, setDetalle] = useState<Liquidacion | null>(null);

  // ------ Fetch data ------
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data, error: err } = await supabase
          .from('liquidaciones')
          .select('*, trabajadores!inner(id, nombre, apellido_paterno, cargo, rut)')
          .order('periodo', { ascending: false });

        if (err) throw err;
        const supaRows = (data as Liquidacion[]) ?? [];

        // Liquidaciones reales desde Buk (/accounting). Se anteponen las de Supabase si existe el mismo período.
        let bukRows: Liquidacion[] = [];
        try {
          const res = await fetch('/api/buk/liquidaciones');
          const j = await res.json();
          if (j?.ok) {
            bukRows = (j.items as any[]).flatMap((emp) =>
              (emp.liquidaciones as any[]).map((l) => ({
                id: `buk-${emp.trabajadorId}-${l.periodo}`,
                trabajador_id: emp.trabajadorId,
                periodo: l.periodo,
                sueldo_base: l.sueldoBase || 0,
                gratificacion_legal: l.gratificacion || 0,
                horas_extras_50: l.horasExtra || 0,
                bonos_imponibles: l.bonos || 0,
                total_haberes: l.totalHaberes || 0,
                afp_trabajador: l.descAfp || 0,
                salud_trabajador: l.descSalud || 0,
                afc_trabajador: l.descCesantia || 0,
                impuesto_unico: l.impuestoUnico || 0,
                total_descuentos: l.totalDescuentos || 0,
                liquido_pagar: l.liquido || 0,
                estado: 'pagada',
                created_at: '',
                items: l.items || [],
                trabajadores: { id: emp.trabajadorId, nombre: emp.nombre, apellido_paterno: '', cargo: emp.cargo || '', rut: emp.rut || '' },
              })),
            );
          }
        } catch { /* Buk no disponible: solo Supabase */ }

        const supaKeys = new Set(supaRows.map((l) => `${l.trabajador_id}-${l.periodo}`));
        const merged = [...supaRows, ...bukRows.filter((l) => !supaKeys.has(`${l.trabajador_id}-${l.periodo}`))];
        merged.sort((a, b) => String(b.periodo).localeCompare(String(a.periodo)));
        setLiquidaciones(merged);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Error al cargar liquidaciones');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ------ Derived data ------
  const periodos = useMemo(() => {
    const set = new Set(liquidaciones.map((l) => l.periodo));
    return Array.from(set).sort().reverse();
  }, [liquidaciones]);

  const empleados = useMemo(() => {
    const map = new Map<string, Trabajador>();
    liquidaciones.forEach((l) => map.set(l.trabajador_id, l.trabajadores));
    return Array.from(map.values());
  }, [liquidaciones]);

  const filtered = useMemo(() => {
    let list = liquidaciones;
    if (filtroPeriodo) list = list.filter((l) => l.periodo === filtroPeriodo);
    if (filtroEmpleado) list = list.filter((l) => l.trabajador_id === filtroEmpleado);
    if (filtroEstado) list = list.filter((l) => l.estado.toLowerCase() === filtroEstado.toLowerCase());
    if (busqueda) {
      const q = busqueda.toLowerCase();
      list = list.filter(
        (l) =>
          nombreCompleto(l.trabajadores).toLowerCase().includes(q) ||
          l.trabajadores.cargo.toLowerCase().includes(q) ||
          periodoLabel(l.periodo).toLowerCase().includes(q),
      );
    }
    return list;
  }, [liquidaciones, filtroPeriodo, filtroEmpleado, filtroEstado, busqueda]);

  const totalHaberes = filtered.reduce((s, l) => s + l.total_haberes, 0);
  const totalDescuentos = filtered.reduce((s, l) => s + l.total_descuentos, 0);
  const totalLiquido = filtered.reduce((s, l) => s + l.liquido_pagar, 0);

  // ------ Selection helpers ------
  const allSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((l) => l.id)));
    }
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearFilters() {
    setFiltroPeriodo('');
    setFiltroEmpleado('');
    setFiltroEstado('');
    setBusqueda('');
  }

  function downloadSelected() {
    const items = filtered.filter((l) => selected.has(l.id));
    items.forEach((l, i) => {
      setTimeout(() => downloadLiquidacionPDF(l, l.trabajadores), i * 600);
    });
  }

  // ------ Render ------
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-zinc-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Cargando liquidaciones...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 text-red-600">
        <AlertCircle className="h-6 w-6 mr-2" />
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Liquidaciones</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Historial de liquidaciones de tus colaboradores
        </p>
      </div>

      {/* ---- Filters ---- */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Período */}
        <select
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los períodos</option>
          {periodos.map((p) => (
            <option key={p} value={p}>
              {periodoLabel(p)}
            </option>
          ))}
        </select>

        {/* Empleado */}
        <select
          value={filtroEmpleado}
          onChange={(e) => setFiltroEmpleado(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los empleados</option>
          {empleados.map((t) => (
            <option key={t.id} value={t.id}>
              {nombreCompleto(t)}
            </option>
          ))}
        </select>

        {/* Estado */}
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">Todos los estados</option>
          <option value="borrador">Borrador</option>
          <option value="calculada">Calculada</option>
          <option value="aprobada">Aprobada</option>
          <option value="pagada">Pagada</option>
        </select>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-56"
          />
        </div>

        {/* Clear */}
        <button
          onClick={clearFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
        >
          <FilterX className="h-4 w-4" />
          Limpiar Filtros
        </button>

        {/* Bulk download */}
        {selected.size > 0 && (
          <button
            onClick={downloadSelected}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors ml-auto"
          >
            <Download className="h-4 w-4" />
            Descargar Seleccionadas ({selected.size})
          </button>
        )}
      </div>

      {/* ---- Summary Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Bruto', value: totalHaberes, icon: DollarSign, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Descuentos', value: totalDescuentos, icon: MinusCircle, color: 'text-red-600 bg-red-50' },
          { label: 'Total Líquido', value: totalLiquido, icon: Wallet, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Liquidaciones', value: filtered.length, icon: FileText, color: 'text-violet-600 bg-violet-50', isCount: true },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-zinc-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500">{card.label}</p>
                <p className="text-lg font-bold text-zinc-900">
                  {(card as { isCount?: boolean }).isCount ? card.value : fmt(card.value as number)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {periodos.length > 0 && (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-indigo-500" />
            <h3 className="text-sm font-semibold text-zinc-900">Archivos Previred por período</h3>
          </div>
          <p className="text-xs text-zinc-500 mb-3">Planilla de cotizaciones (CSV) generada con los montos reales de cada proceso mensual.</p>
          <div className="flex flex-wrap gap-2">
            {periodos.map((p) => {
              const [y, m] = p.split('-');
              return (
                <a key={p} href={`/api/buk/previred?month=${Number(m)}&year=${y}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition">
                  <Download className="h-4 w-4" /> Previred {periodoLabel(p)}
                </a>
              );
            })}
          </div>
        </div>
      )}


      {/* ---- Table ---- */}
      <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Período</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Empleado</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Cargo</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Sueldo Base</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Haberes</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Descuentos</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-500">Líquido</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-500">Estado</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-zinc-400">
                    No se encontraron liquidaciones con los filtros aplicados.
                  </td>
                </tr>
              )}
              {filtered.map((l) => (
                <tr
                  key={l.id}
                  onClick={() => downloadLiquidacionPDF(l, l.trabajadores)}
                  title="Ver liquidación en PDF"
                  className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selected.has(l.id)}
                      onChange={() => toggleOne(l.id)}
                      className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-zinc-900 whitespace-nowrap">
                    {periodoLabel(l.periodo)}
                  </td>
                  <td className="px-4 py-3 text-zinc-700 whitespace-nowrap">
                    {nombreCompleto(l.trabajadores)}
                  </td>
                  <td className="px-4 py-3 text-zinc-500 whitespace-nowrap">{l.trabajadores.cargo}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 whitespace-nowrap">{fmt(l.sueldo_base)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 whitespace-nowrap">{fmt(l.total_haberes)}</td>
                  <td className="px-4 py-3 text-right text-zinc-600 whitespace-nowrap">{fmt(l.total_descuentos)}</td>
                  <td className="px-4 py-3 text-right font-medium text-zinc-900 whitespace-nowrap">
                    {fmt(l.liquido_pagar)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoBadge(l.estado)}`}
                    >
                      {estadoLabel(l.estado)}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setDetalle(l)}
                        title="Ver detalle"
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadLiquidacionPDF(l, l.trabajadores)}
                        title="Descargar PDF"
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.write(downloadLiquidacionPDF(l, l.trabajadores, true)); w.document.close(); setTimeout(() => w.print(), 400); } }}
                        title="Imprimir"
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---- Detail Modal ---- */}
      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-zinc-900">
                  Liquidación - {periodoLabel(detalle.periodo)}
                </h2>
                <div className="mt-1 text-sm text-zinc-500 space-x-4">
                  <span>{nombreCompleto(detalle.trabajadores)}</span>
                  <span>{detalle.trabajadores.cargo}</span>
                  {detalle.trabajadores.rut && <span>RUT: {detalle.trabajadores.rut}</span>}
                </div>
              </div>
              <button
                onClick={() => setDetalle(null)}
                className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Haberes */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3">Haberes</h3>
                  <div className="space-y-2 text-sm">
                    {(detalle.items && detalle.items.length
                      ? detalle.items.filter((x) => x.entry_type === 'debit' && !/empleador|mutual/i.test(x.description)).map((x) => [x.description, x.amount] as [string, number])
                      : [
                          ['Sueldo Base', detalle.sueldo_base],
                          ['Gratificación Legal', detalle.gratificacion_legal],
                          ['Horas Extras 50%', detalle.horas_extras_50],
                          ['Bonos Imponibles', detalle.bonos_imponibles ?? 0],
                          ['Colación (no imponible)', detalle.colacion ?? 0],
                          ['Movilización (no imponible)', detalle.movilizacion ?? 0],
                        ] as [string, number][]
                    ).map(([label, val]) => (
                      <div key={label as string} className="flex justify-between py-1.5 border-b border-zinc-50">
                        <span className="text-zinc-600">{label as string}</span>
                        <span className="text-zinc-900 font-medium">{fmt(val as number)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t-2 border-zinc-200 font-bold">
                      <span className="text-zinc-900">Total Haberes</span>
                      <span className="text-zinc-900">{fmt(detalle.total_haberes)}</span>
                    </div>
                  </div>
                </div>

                {/* Descuentos */}
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 mb-3">Descuentos</h3>
                  <div className="space-y-2 text-sm">
                    {(detalle.items && detalle.items.length
                      ? detalle.items.filter((x) => x.entry_type === 'credit' && !/l[ií]quido/i.test(x.description) && !/empleador|mutual/i.test(x.description)).map((x) => [x.description, x.amount] as [string, number])
                      : [
                          ['AFP Trabajador', detalle.afp_trabajador],
                          ['Salud Trabajador', detalle.salud_trabajador],
                          ['AFC Trabajador (Cesantía)', detalle.afc_trabajador],
                          ['Impuesto Único', detalle.impuesto_unico],
                        ] as [string, number][]
                    ).map(([label, val]) => (
                      <div key={label as string} className="flex justify-between py-1.5 border-b border-zinc-50">
                        <span className="text-zinc-600">{label as string}</span>
                        <span className="text-zinc-900 font-medium">{fmt(val as number)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between py-2 border-t-2 border-zinc-200 font-bold">
                      <span className="text-zinc-900">Total Descuentos</span>
                      <span className="text-zinc-900">{fmt(detalle.total_descuentos)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sueldo Líquido */}
              <div className="mt-6 rounded-xl bg-emerald-50 border border-emerald-200 p-5 text-center">
                <p className="text-sm font-medium text-emerald-700 mb-1">Sueldo Líquido</p>
                <p className="text-3xl font-bold text-emerald-700">{fmt(detalle.liquido_pagar)}</p>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
              <button
                onClick={() => setDetalle(null)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => downloadLiquidacionPDF(detalle, detalle.trabajadores)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
