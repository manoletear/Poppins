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
  LayoutGrid,
  List,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import InfoTooltip from '@/components/InfoTooltip';

// Mapa de descripciones legales en lenguaje cotidiano (TCP).
const LABEL_TOOLTIPS: Record<string, { texto: string; legal?: string }> = {
  'Sueldo Base':              { texto: 'Lo que acordaste pagar mensualmente en el contrato.', legal: 'Art. 10 N°4 CT' },
  'Gratificación Legal':      { texto: 'Pago obligatorio adicional al sueldo (mensual). Equivale al 25% del sueldo, con tope.', legal: 'Art. 50 CT' },
  'Horas Extras 50%':         { texto: 'Horas trabajadas más allá de la jornada acordada. Se pagan con recargo del 50%.', legal: 'Art. 32 CT' },
  'Bonos Imponibles':         { texto: 'Bonos sobre los que sí se pagan cotizaciones (AFP, salud).' },
  'Colación (no imponible)':  { texto: 'Subsidio de comida. No paga cotizaciones ni impuestos.' },
  'Movilización (no imponible)': { texto: 'Subsidio de transporte. No paga cotizaciones ni impuestos.' },
  'AFP Trabajador':           { texto: 'Aporte para la pensión futura del trabajador (10% del sueldo imponible + comisión).', legal: 'DL 3.500' },
  'Salud Trabajador':         { texto: 'Aporte para Fonasa o Isapre (7% del sueldo imponible).', legal: 'DL 2.763' },
  'AFC Trabajador (Cesantía)':{ texto: 'Seguro de cesantía (0,6% del sueldo imponible). Lo recibirá si pierde el trabajo.', legal: 'Ley 21.585' },
  'Impuesto Único':           { texto: 'Impuesto a la renta sobre el sueldo. Solo aplica si supera 13,5 UTM mensuales.', legal: 'Art. 42 LIR' },
};

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

async function downloadLiquidacionPDF(
  liq: Liquidacion,
  trabajador: Trabajador,
  opts?: { mode?: 'preview' | 'download' | 'print' },
): Promise<void> {
  const mode = opts?.mode ?? 'preview';
  try {
    const r = await fetch(
      `/api/payroll/liquidacion-pdf?period=${liq.periodo}&workerId=${trabajador.id}`,
    );
    if (!r.ok) {
      alert(
        r.status === 404
          ? 'No hay liquidación calculada para este trabajador en este período.'
          : `No se pudo generar el PDF (HTTP ${r.status}).`,
      );
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    if (mode === 'download') {
      const a = document.createElement('a');
      a.href = url;
      a.download = `liquidacion_${nombreCompleto(trabajador).replace(/\s+/g, '_')}_${liq.periodo.replace('-', '')}.pdf`;
      a.click();
    } else {
      const w = window.open(url, '_blank');
      if (!w) {
        alert('Tu navegador bloqueó la ventana. Permite popups e intenta de nuevo.');
        return;
      }
      if (mode === 'print') setTimeout(() => { try { w.print(); } catch {} }, 600);
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    console.error('downloadLiquidacionPDF', e);
    alert('Error al obtener el PDF.');
  }
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
  const [viewMode, setViewMode] = useState<'cards' | 'tabla'>('cards');

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

        // Fuente principal: payroll_results (motor nuevo payroll-cl).
        // Voided=false → solo liquidaciones activas (no anuladas por re-cálculo).
        const { data, error: err } = await supabase
          .from('payroll_results')
          .select(`
            id, payroll_period, worker_id, gross_income, net_pay,
            deduction_afp10, deduction_afp_commission, deduction_health7,
            deduction_income_tax, deduction_advances, deduction_other,
            calculation_trace, created_at,
            trabajadores:worker_id ( id, nombre, apellido_paterno, cargo, rut ),
            contratos ( sueldo_base )
          `)
          .eq('voided', false)
          .order('payroll_period', { ascending: false });

        if (err) throw err;

        const rows: Liquidacion[] = (data ?? []).map((r: any) => {
          const trace = r.calculation_trace ?? {};
          const sueldoBase = r.contratos?.sueldo_base ?? 0;
          const grat = trace['GRATIFICACION']?.result ?? 0;
          const horasExtra = trace['HORAS_EXTRA']?.result ?? 0;
          const totalDesc = (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0)
            + (r.deduction_health7 ?? 0) + (r.deduction_income_tax ?? 0)
            + (r.deduction_advances ?? 0) + (r.deduction_other ?? 0);
          return {
            id: r.id,
            trabajador_id: r.worker_id,
            periodo: r.payroll_period,
            sueldo_base: sueldoBase,
            gratificacion_legal: grat,
            horas_extras_50: horasExtra,
            bonos_imponibles: Math.max(0, (r.gross_income ?? 0) - sueldoBase - grat - horasExtra),
            total_haberes: r.gross_income ?? 0,
            afp_trabajador: (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0),
            salud_trabajador: r.deduction_health7 ?? 0,
            afc_trabajador: r.deduction_other ?? 0,
            impuesto_unico: r.deduction_income_tax ?? 0,
            total_descuentos: totalDesc,
            liquido_pagar: r.net_pay ?? 0,
            estado: 'pagada',
            created_at: r.created_at ?? '',
            trabajadores: {
              id: r.trabajadores?.id ?? r.worker_id,
              nombre: r.trabajadores?.nombre ?? '',
              apellido_paterno: r.trabajadores?.apellido_paterno ?? '',
              cargo: r.trabajadores?.cargo ?? '',
              rut: r.trabajadores?.rut ?? '',
            },
          };
        });
        setLiquidaciones(rows);
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
      setTimeout(() => downloadLiquidacionPDF(l, l.trabajadores, { mode: 'download' }), i * 600);
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


      {/* ---- View toggle ---- */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500">
          {filtered.length} liquidacion{filtered.length === 1 ? '' : 'es'}
        </div>
        <div className="inline-flex rounded-lg border border-zinc-200 bg-white p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'cards' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Cards
          </button>
          <button
            onClick={() => setViewMode('tabla')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
              viewMode === 'tabla' ? 'bg-zinc-900 text-white' : 'text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <List className="h-3.5 w-3.5" /> Lista
          </button>
        </div>
      </div>

      {/* ---- Cards view (default) ---- */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full rounded-xl border border-zinc-200 bg-white p-12 text-center text-zinc-400 text-sm">
              No hay liquidaciones que coincidan con los filtros.
            </div>
          ) : filtered.map((l) => {
            const trab = l.trabajadores;
            const iniciales = `${trab.nombre?.[0] ?? ''}${trab.apellido_paterno?.[0] ?? ''}`.toUpperCase();
            // Semáforo: verde = pagada, amarillo = aprobada/calculada, rojo = borrador/error
            const semaforo: { color: string; bg: string; label: string; icon: any } =
              l.estado === 'pagada'  ? { color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', label: 'Pagada',          icon: CheckCircle2 }
            : l.estado === 'aprobada'? { color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       label: 'Lista para pagar',icon: Clock        }
            : l.estado === 'calculada'? { color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',     label: 'Por revisar',     icon: Clock        }
            : { color: 'text-zinc-600', bg: 'bg-zinc-50 border-zinc-200', label: l.estado || 'Borrador', icon: AlertCircle };
            const IconSem = semaforo.icon;
            return (
              <div key={l.id} className="rounded-xl border border-zinc-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
                <div className="px-5 pt-5 pb-3 flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-sm font-bold text-white shrink-0">
                    {iniciales || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-zinc-900 truncate">
                      {trab.nombre} {trab.apellido_paterno}
                    </div>
                    <div className="text-xs text-zinc-500 truncate">{trab.cargo || 'Empleado'}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{periodoLabel(l.periodo)}</div>
                  </div>
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${semaforo.bg} ${semaforo.color}`}>
                    <IconSem className="h-3 w-3" />
                    {semaforo.label}
                  </span>
                </div>

                <div className="px-5 pb-3">
                  <div className="text-[10px] uppercase tracking-wide text-zinc-400">Sueldo líquido</div>
                  <div className="text-2xl font-bold text-emerald-600">{fmt(l.liquido_pagar)}</div>
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-zinc-500">
                    <span>Haberes <strong className="text-zinc-700">{fmt(l.total_haberes)}</strong></span>
                    <span>Descuentos <strong className="text-red-500">-{fmt(l.total_descuentos)}</strong></span>
                  </div>
                </div>

                <div className="px-5 pb-4 flex items-center gap-1.5">
                  <button
                    onClick={() => setDetalle(l)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 px-2 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                  >
                    <Eye className="h-3.5 w-3.5" /> Ver
                  </button>
                  <button
                    onClick={() => downloadLiquidacionPDF(l, l.trabajadores)}
                    className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-zinc-200 px-2 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                    title="Ver PDF"
                  >
                    <FileText className="h-3.5 w-3.5" /> PDF
                  </button>
                  <button
                    onClick={() => downloadLiquidacionPDF(l, l.trabajadores, { mode: 'download' })}
                    className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-2 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition"
                    title="Descargar"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---- Table view ---- */}
      {viewMode === 'tabla' && (
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
                        onClick={() => downloadLiquidacionPDF(l, l.trabajadores, { mode: 'download' })}
                        title="Descargar PDF"
                        className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadLiquidacionPDF(l, l.trabajadores, { mode: 'print' })}
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
      )}

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
                        <span className="text-zinc-600 inline-flex items-center gap-1">
                          {label as string}
                          {LABEL_TOOLTIPS[label as string] && (
                            <InfoTooltip text={LABEL_TOOLTIPS[label as string].texto} legal={LABEL_TOOLTIPS[label as string].legal} />
                          )}
                        </span>
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
                        <span className="text-zinc-600 inline-flex items-center gap-1">
                          {label as string}
                          {LABEL_TOOLTIPS[label as string] && (
                            <InfoTooltip text={LABEL_TOOLTIPS[label as string].texto} legal={LABEL_TOOLTIPS[label as string].legal} />
                          )}
                        </span>
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
                onClick={() => downloadLiquidacionPDF(detalle, detalle.trabajadores, { mode: 'download' })}
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <Download className="h-4 w-4" />
                Descargar
              </button>
              <button
                onClick={() => downloadLiquidacionPDF(detalle, detalle.trabajadores)}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <Eye className="h-4 w-4" />
                Ver PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
