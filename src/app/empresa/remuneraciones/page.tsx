'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Lock, ChevronDown, Download, Loader2, FileText, Shield, BookOpen,
  FileSpreadsheet, CreditCard, Calculator, Receipt, CheckCircle2, X,
  Plus, Trash2, Stethoscope, Users, ClipboardList, AlertTriangle,
} from 'lucide-react';

// ── Constantes ───────────────────────────────────────────────────────────────

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
               'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const PROCESOS_ABIERTO = [
  { key: 'contabilidad',      label: 'Contabilidad',       Icon: FileSpreadsheet },
  { key: 'previred',          label: 'Previred',           Icon: Shield          },
  { key: 'libro_electronico', label: 'Libro Electrónico',  Icon: BookOpen        },
];

const PROCESOS_CERRADO = [
  { key: 'sueldos',           label: 'Sueldos',              Icon: Calculator,      download: 'sueldos'  },
  { key: 'liquidaciones_pdf', label: 'Liquidaciones PDF',    Icon: FileText,        download: null       },
  { key: 'libros',            label: 'Libro Remuneraciones', Icon: BookOpen,        download: 'libro'    },
  { key: 'contabilidad',      label: 'Contabilidad',         Icon: FileSpreadsheet, download: null       },
  { key: 'previred',          label: 'Previred',             Icon: Shield,          download: 'previred' },
  { key: 'libro_electronico', label: 'Libro Electrónico',    Icon: Receipt,         download: null       },
];

const TIPOS_LICENCIA = [
  { value: 'MEDICA',    label: 'Médica' },
  { value: 'PRENATAL',  label: 'Prenatal' },
  { value: 'POSNATAL',  label: 'Posnatal' },
  { value: 'ACCIDENTE', label: 'Accidente laboral' },
];

// Codes que se guardan en payroll_novedades como eventos del período (no son items monetarios)
const EVENT_CODES = ['_DIAS_TRABAJADOS', '_HORAS_EXTRA', '_DIAS_AUSENCIA', '_DIAS_VACACIONES'];

const HABERES_VARIABLES = [
  { code: 'BONO_IMPONIBLE',             label: 'Bono imponible' },
  { code: 'BONO_NO_IMPONIBLE',          label: 'Bono no imponible' },
  { code: 'AGUINALDO',                  label: 'Aguinaldo' },
  { code: 'ASIGNACION_MOVILIZACION',    label: 'Asig. movilización' },
  { code: 'ASIGNACION_COLACION',        label: 'Asig. colación' },
  { code: 'ASIGNACION_PERDIDA_CAJA',    label: 'Asig. pérdida de caja' },
  { code: 'VIATICO',                    label: 'Viático' },
  { code: 'REEMBOLSO_GASTOS',           label: 'Reembolso gastos' },
  { code: 'GRATIFICACION_CONTRACTUAL',  label: 'Gratificación contractual' },
  { code: 'DIFERENCIA_RETROACTIVA',     label: 'Diferencia retroactiva' },
];

const DESCUENTOS_VARIABLES = [
  { code: 'ANTICIPO_SUELDO',          label: 'Anticipo de sueldo' },
  { code: 'PRESTAMO_EMPLEADOR',       label: 'Préstamo empleador' },
  { code: 'DESCUENTO_CONVENIDO',      label: 'Descuento convenido' },
  { code: 'OTRO_DESCUENTO_LEGAL',     label: 'Otro descuento legal' },
  { code: 'OTRO_DESCUENTO_AUTORIZADO',label: 'Otro descuento autorizado' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function periodoLabel(period: string) {
  const [y, m] = period.split('-').map(Number);
  return `${MESES[m - 1]} '${String(y).slice(2)}`;
}

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function lastNPeriods(n: number): string[] {
  const result: string[] = [];
  const now = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return result;
}

function daysInPeriod(period: string) {
  const [y, m] = period.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

function fmt(n: number) {
  return n.toLocaleString('es-CL');
}

// ── Tipos ────────────────────────────────────────────────────────────────────

interface PeriodSummary {
  period: string;
  closed: boolean;
  workerCount: number;
  totalNetPay: number;
}

interface ProcessResult {
  workerName: string;
  workerId: string;
  netPay: number;
  grossIncome: number;
  warnings: string[];
}

interface Trabajador {
  id: string;
  rut: string;
  nombre: string;
  apellido_paterno: string;
  sueldo_base?: number;
  contrato_id?: string;
}

interface Novedad {
  id: string;
  trabajador_id: string;
  concept_code: string;
  amount: number;
  description?: string;
}

interface Licencia {
  id: string;
  trabajador_id: string;
  periodo: string;
  tipo: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  observacion?: string;
  trabajadores: { nombre: string; apellido_paterno: string; rut: string };
}

// ── Modal Novedades del trabajador ───────────────────────────────────────────

interface NovedadesModalProps {
  period: string;
  trabajador: Trabajador;
  onClose: () => void;
}

function NovedadesModal({ period, trabajador, onClose }: NovedadesModalProps) {
  const totalDays = daysInPeriod(period);
  const [novedades, setNovedades] = useState<Novedad[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  // Campos de eventos del período
  const [diasTrabajados, setDiasTrabajados]   = useState<string>('');
  const [horasExtra, setHorasExtra]           = useState<string>('');
  const [diasAusencia, setDiasAusencia]       = useState<string>('');
  const [diasVacaciones, setDiasVacaciones]   = useState<string>('');

  // Formulario haberes/descuentos
  const [itemCode, setItemCode]     = useState('');
  const [itemAmount, setItemAmount] = useState('');
  const [itemDesc, setItemDesc]     = useState('');

  const fetchNovedades = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/payroll/novedades?period=${period}&trabajadorId=${trabajador.id}`);
    if (res.ok) {
      const d = await res.json();
      const all: Novedad[] = d.data ?? [];
      setNovedades(all.filter(n => !EVENT_CODES.includes(n.concept_code)));

      const ev = (code: string) => all.find(n => n.concept_code === code)?.amount;
      setDiasTrabajados(String(ev('_DIAS_TRABAJADOS') ?? totalDays));
      setHorasExtra(String(ev('_HORAS_EXTRA') ?? ''));
      setDiasAusencia(String(ev('_DIAS_AUSENCIA') ?? ''));
      setDiasVacaciones(String(ev('_DIAS_VACACIONES') ?? ''));
    }
    setLoading(false);
  }, [period, trabajador.id, totalDays]);

  useEffect(() => { fetchNovedades(); }, [fetchNovedades]);

  const saveEvent = useCallback(async (code: string, value: string, defaultVal?: number) => {
    const num = Number(value);
    if (isNaN(num)) return;
    if (defaultVal !== undefined && num === defaultVal && value === '') return;
    await fetch('/api/payroll/novedades', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, trabajador_id: trabajador.id, concept_code: code, amount: num }),
    });
  }, [period, trabajador.id]);

  const handleAddItem = async () => {
    if (!itemCode || !itemAmount) return;
    setSaving(true);
    try {
      const res = await fetch('/api/payroll/novedades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period,
          trabajador_id: trabajador.id,
          concept_code: itemCode,
          amount: Number(itemAmount.replace(/\./g, '')),
          description: itemDesc || undefined,
        }),
      });
      if (res.ok) {
        setItemCode(''); setItemAmount(''); setItemDesc('');
        await fetchNovedades();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    await fetch(`/api/payroll/novedades?id=${id}`, { method: 'DELETE' });
    await fetchNovedades();
  };

  const allItems = [...HABERES_VARIABLES, ...DESCUENTOS_VARIABLES];
  const itemLabel = (code: string) => allItems.find(x => x.code === code)?.label ?? code;
  const isDescuento = (code: string) => DESCUENTOS_VARIABLES.some(x => x.code === code);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg pointer-events-auto flex flex-col max-h-[88vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 shrink-0">
            <div>
              <p className="text-sm font-semibold text-zinc-800">
                {trabajador.nombre} {trabajador.apellido_paterno}
              </p>
              <p className="text-xs text-zinc-400">{trabajador.rut} · Novedades {periodoLabel(period)}</p>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-zinc-400" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

              {/* Eventos del período */}
              <div>
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                  Eventos del período
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">
                      Días trabajados <span className="text-zinc-300">(def. {totalDays})</span>
                    </label>
                    <input
                      type="number" min="0" max={totalDays}
                      value={diasTrabajados}
                      onChange={e => setDiasTrabajados(e.target.value)}
                      onBlur={() => saveEvent('_DIAS_TRABAJADOS', diasTrabajados, totalDays)}
                      className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Horas extra</label>
                    <input
                      type="number" min="0" step="0.5"
                      value={horasExtra}
                      onChange={e => setHorasExtra(e.target.value)}
                      onBlur={() => saveEvent('_HORAS_EXTRA', horasExtra)}
                      placeholder="0"
                      className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Días ausencia injustif.</label>
                    <input
                      type="number" min="0" max={totalDays}
                      value={diasAusencia}
                      onChange={e => setDiasAusencia(e.target.value)}
                      onBlur={() => saveEvent('_DIAS_AUSENCIA', diasAusencia)}
                      placeholder="0"
                      className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Días vacaciones</label>
                    <input
                      type="number" min="0" max={totalDays}
                      value={diasVacaciones}
                      onChange={e => setDiasVacaciones(e.target.value)}
                      onBlur={() => saveEvent('_DIAS_VACACIONES', diasVacaciones)}
                      placeholder="0"
                      className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-zinc-400 mt-1.5">Los valores se guardan automáticamente al salir del campo.</p>
              </div>

              {/* Lista haberes/descuentos existentes */}
              {novedades.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide mb-2">
                    Haberes y descuentos ingresados
                  </p>
                  <div className="space-y-1.5">
                    {novedades.map(n => (
                      <div key={n.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2 gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-zinc-800 truncate">{itemLabel(n.concept_code)}</p>
                          {n.description && <p className="text-[10px] text-zinc-400 truncate">{n.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs font-semibold ${isDescuento(n.concept_code) ? 'text-red-600' : 'text-emerald-700'}`}>
                            {isDescuento(n.concept_code) ? '−' : '+'}${fmt(n.amount)}
                          </span>
                          <button
                            onClick={() => handleDeleteItem(n.id)}
                            className="text-zinc-300 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Agregar haber/descuento */}
              <div className="rounded-xl border border-dashed border-zinc-300 p-3 space-y-2.5">
                <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Agregar haber / descuento</p>

                <select
                  value={itemCode}
                  onChange={e => setItemCode(e.target.value)}
                  className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                >
                  <option value="">Seleccionar concepto…</option>
                  <optgroup label="── Haberes ──">
                    {HABERES_VARIABLES.map(h => (
                      <option key={h.code} value={h.code}>{h.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="── Descuentos ──">
                    {DESCUENTOS_VARIABLES.map(d => (
                      <option key={d.code} value={d.code}>{d.label}</option>
                    ))}
                  </optgroup>
                </select>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Monto ($)</label>
                    <input
                      type="number" min="0" step="1"
                      placeholder="0"
                      value={itemAmount}
                      onChange={e => setItemAmount(e.target.value)}
                      className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-500 block mb-0.5">Descripción (opcional)</label>
                    <input
                      type="text"
                      placeholder="ej. Bono marzo"
                      value={itemDesc}
                      onChange={e => setItemDesc(e.target.value)}
                      className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]"
                    />
                  </div>
                </div>

                <button
                  disabled={saving || !itemCode || !itemAmount}
                  onClick={handleAddItem}
                  className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] disabled:opacity-50 transition"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Agregar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Modal Licencias Médicas ──────────────────────────────────────────────────

function LicenciasModal({ period, onClose }: { period: string; onClose: () => void }) {
  const [licencias, setLicencias]     = useState<Licencia[]>([]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({
    trabajador_id: '', tipo: 'MEDICA', fecha_inicio: '', fecha_fin: '', observacion: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [licRes, trabRes] = await Promise.all([
      fetch(`/api/payroll/licencias-medicas?period=${period}`),
      fetch('/api/payroll/trabajadores'),
    ]);
    if (licRes.ok)  { const d = await licRes.json();  setLicencias(d.data ?? []); }
    if (trabRes.ok) { const d = await trabRes.json(); setTrabajadores(d.data ?? []); }
    setLoading(false);
  }, [period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAdd = async () => {
    if (!form.trabajador_id || !form.fecha_inicio || !form.fecha_fin) return;
    setSaving(true);
    try {
      const res = await fetch('/api/payroll/licencias-medicas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, periodo: period }),
      });
      if (res.ok) {
        setForm({ trabajador_id: '', tipo: 'MEDICA', fecha_inicio: '', fecha_fin: '', observacion: '' });
        await fetchData();
      } else {
        const d = await res.json();
        alert(d.error ?? 'Error al guardar');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta licencia?')) return;
    await fetch(`/api/payroll/licencias-medicas?id=${id}`, { method: 'DELETE' });
    await fetchData();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl pointer-events-auto flex flex-col max-h-[80vh]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Stethoscope className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-800">
                Licencias médicas — {periodoLabel(period)}
              </h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
            ) : (
              <>
                {licencias.length === 0 ? (
                  <p className="text-xs text-zinc-400 text-center py-4">Sin licencias registradas.</p>
                ) : (
                  <div className="space-y-2">
                    {licencias.map(lic => (
                      <div key={lic.id} className="flex items-start justify-between rounded-xl border border-zinc-200 px-3 py-2.5 gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-zinc-800">
                            {lic.trabajadores?.nombre} {lic.trabajadores?.apellido_paterno}
                          </p>
                          <p className="text-[11px] text-zinc-500">
                            {TIPOS_LICENCIA.find(t => t.value === lic.tipo)?.label ?? lic.tipo}
                            {' · '}{lic.fecha_inicio} → {lic.fecha_fin}
                            {' · '}<span className="font-medium text-zinc-700">{lic.dias} día{lic.dias !== 1 ? 's' : ''}</span>
                          </p>
                          {lic.observacion && <p className="text-[10px] text-zinc-400 mt-0.5">{lic.observacion}</p>}
                        </div>
                        <button onClick={() => handleDelete(lic.id)} className="shrink-0 text-zinc-400 hover:text-red-500 transition mt-0.5">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-dashed border-zinc-300 p-3 space-y-2.5">
                  <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">Registrar licencia</p>
                  <select value={form.trabajador_id} onChange={e => setForm(f => ({ ...f, trabajador_id: e.target.value }))}
                    className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]">
                    <option value="">Seleccionar trabajador…</option>
                    {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre} {t.apellido_paterno} — {t.rut}</option>)}
                  </select>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]">
                    {TIPOS_LICENCIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-0.5 block">Fecha inicio</label>
                      <input type="date" value={form.fecha_inicio} onChange={e => setForm(f => ({ ...f, fecha_inicio: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]" />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-500 mb-0.5 block">Fecha fin</label>
                      <input type="date" value={form.fecha_fin} onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                        className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]" />
                    </div>
                  </div>
                  <input type="text" placeholder="Observación (opcional)" value={form.observacion}
                    onChange={e => setForm(f => ({ ...f, observacion: e.target.value }))}
                    className="w-full text-xs rounded-lg border border-zinc-300 px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#1a2e6e]" />
                  <button disabled={saving || !form.trabajador_id || !form.fecha_inicio || !form.fecha_fin}
                    onClick={handleAdd}
                    className="w-full flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] disabled:opacity-50 transition">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Agregar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Tabla de trabajadores con novedades ──────────────────────────────────────

interface TrabajadoresTableProps {
  period: string;
  onOpenNovedades: (t: Trabajador) => void;
}

function TrabajadoresTable({ period, onOpenNovedades }: TrabajadoresTableProps) {
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [novedadesCount, setNovedadesCount] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [trabRes, novRes] = await Promise.all([
        fetch('/api/payroll/trabajadores'),
        fetch(`/api/payroll/novedades?period=${period}`),
      ]);
      if (cancelled) return;
      if (trabRes.ok) {
        const d = await trabRes.json();
        setTrabajadores(d.data ?? []);
      }
      if (novRes.ok) {
        const d = await novRes.json();
        const counts: Record<string, number> = {};
        for (const n of (d.data ?? []) as Novedad[]) {
          if (!EVENT_CODES.includes(n.concept_code)) {
            counts[n.trabajador_id] = (counts[n.trabajador_id] ?? 0) + 1;
          }
        }
        setNovedadesCount(counts);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [period]);

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-zinc-400" /></div>;
  if (trabajadores.length === 0) return <p className="text-xs text-zinc-400 py-2">Sin trabajadores activos.</p>;

  return (
    <div className="space-y-1.5">
      {trabajadores.map(t => {
        const cnt = novedadesCount[t.id] ?? 0;
        return (
          <button
            key={t.id}
            onClick={() => onOpenNovedades(t)}
            className="w-full flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5 hover:border-[#1a2e6e]/40 hover:bg-zinc-50 transition text-left"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-800 truncate">
                {t.nombre} {t.apellido_paterno}
              </p>
              <p className="text-[11px] text-zinc-400">
                {t.rut}
                {t.sueldo_base != null && <> · Sueldo base ${fmt(t.sueldo_base)}</>}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-3">
              {cnt > 0 && (
                <span className="text-[10px] font-semibold bg-[#1a2e6e] text-white rounded-full px-2 py-0.5">
                  {cnt} novedad{cnt !== 1 ? 'es' : ''}
                </span>
              )}
              <ClipboardList className="w-4 h-4 text-zinc-300" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function RemuneracionesPage() {
  const periods = lastNPeriods(12);
  const current = currentPeriod();

  const [summaries,    setSummaries]    = useState<Map<string, PeriodSummary>>(new Map());
  const [expanded,     setExpanded]     = useState<string | null>(periods[0]);
  const [masAcciones,  setMasAcciones]  = useState<string | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [licenciasModal, setLicenciasModal] = useState<string | null>(null);
  const [novedadesModal, setNovedadesModal] = useState<{ period: string; trabajador: Trabajador } | null>(null);

  const [processing,  setProcessing]  = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<Map<string, ProcessResult[]>>(new Map());

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payroll/periodos-estado');
      if (res.ok) {
        const data = await res.json();
        const map = new Map<string, PeriodSummary>();
        for (const s of data.periods ?? []) map.set(s.period, s);
        setSummaries(map);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

  const handleProcesar = async (period: string, mode: 'preview' | 'final') => {
    setProcessing(period);
    try {
      const res = await fetch('/api/payroll/procesar-mes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, mode }),
      });
      const data = await res.json();
      if (data.ok) {
        if (mode === 'preview') {
          setPreviewData(prev => new Map(prev).set(period, data.results));
        } else {
          await fetchSummaries();
          setPreviewData(prev => { const m = new Map(prev); m.delete(period); return m; });
        }
      } else {
        alert(data.error ?? 'Error al procesar');
      }
    } finally { setProcessing(null); }
  };

  const handleDownload = (path: string, filename: string) => {
    const a = document.createElement('a');
    a.href = path; a.download = filename; a.click();
  };

  const handleReopenPeriod = async (period: string) => {
    if (!confirm(`¿Reabrir el período ${periodoLabel(period)}? Se anularán todos los resultados calculados.`)) return;
    setMasAcciones(null);
    const res = await fetch('/api/payroll/reabrir-periodo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period }),
    });
    const data = await res.json();
    if (data.ok) await fetchSummaries();
    else alert(data.error ?? 'Error al reabrir período');
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-zinc-400" /></div>;
  }

  return (
    <div className="space-y-0 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-zinc-900">Procesos</h1>
      </div>

      {periods.map((period) => {
        const summary  = summaries.get(period);
        const isClosed = summary?.closed ?? false;
        const isOpen   = expanded === period;
        const isCurrent = period === current;
        const isProc   = processing === period;
        const preview  = previewData.get(period) ?? [];

        return (
          <div key={period} className="border-b border-zinc-200 last:border-b-0">
            {/* Row header */}
            <button
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-zinc-50 transition text-left"
              onClick={() => setExpanded(isOpen ? null : period)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isClosed ? 'bg-[#1a2e6e]' : 'bg-zinc-300'}`}>
                <Lock className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-zinc-800">{periodoLabel(period)}</p>
                <p className="text-xs text-zinc-400">
                  {isClosed
                    ? `Cerrado · ${summary?.workerCount ?? 0} trabajadores · $${fmt(summary?.totalNetPay ?? 0)} neto`
                    : isCurrent ? 'Abierto' : 'Pendiente'}
                </p>
              </div>
              <ChevronDown className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="px-4 pb-5">
                {isClosed ? (
                  /* ── CERRADO ── */
                  <div className="space-y-4">
                    <div className="flex justify-end">
                      <div className="relative">
                        <button
                          onClick={() => setMasAcciones(masAcciones === period ? null : period)}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:border-zinc-400 transition"
                        >
                          Más Acciones <ChevronDown className="w-3 h-3" />
                        </button>
                        {masAcciones === period && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setMasAcciones(null)} />
                            <div className="absolute right-0 mt-1 w-44 rounded-xl border border-zinc-200 bg-white shadow-xl z-50 overflow-hidden">
                              <button
                                onClick={() => handleReopenPeriod(period)}
                                className="w-full text-left px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-50 transition"
                              >
                                Reabrir período
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PROCESOS_CERRADO.map(({ key, label, Icon, download }) => {
                        const onClickFn = download === 'previred'
                          ? () => handleDownload(`/api/payroll/previred?period=${period}`, `previred_${period.replace('-','')}.txt`)
                          : download === 'sueldos'
                          ? () => handleDownload(`/api/payroll/sueldos?period=${period}`, `sueldos_${period.replace('-','')}.csv`)
                          : download === 'libro'
                          ? () => handleDownload(`/api/payroll/libro-remuneraciones?period=${period}`, `libro_remuneraciones_${period.replace('-','')}.csv`)
                          : undefined;
                        return (
                          <button
                            key={key}
                            onClick={onClickFn}
                            className={`flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-3 py-3 transition text-left ${onClickFn ? 'hover:border-[#1a2e6e]/40 hover:shadow-sm cursor-pointer' : 'cursor-default opacity-60'}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-[#1a2e6e] flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-zinc-800 leading-tight">{label}</p>
                                <p className="text-[10px] text-zinc-400">Actualizado</p>
                              </div>
                            </div>
                            <Download className={`w-3.5 h-3.5 shrink-0 ${onClickFn ? 'text-zinc-400' : 'text-zinc-200'}`} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* ── ABIERTO ── */
                  <div className="space-y-4">

                    {/* Tabla trabajadores */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <Users className="w-3.5 h-3.5 text-zinc-400" />
                        <p className="text-xs font-semibold text-zinc-600">Trabajadores activos</p>
                      </div>
                      <TrabajadoresTable
                        period={period}
                        onOpenNovedades={t => setNovedadesModal({ period, trabajador: t })}
                      />
                    </div>

                    {/* Procesos desactualizados */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {PROCESOS_ABIERTO.map(({ key, label, Icon }) => (
                        <div key={key} className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50 px-3 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-zinc-800 leading-tight">{label}</p>
                              <p className="text-[10px] text-orange-500">Desactualizado</p>
                            </div>
                          </div>
                          <Download className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                        </div>
                      ))}
                    </div>

                    {/* Vista previa */}
                    {preview.length > 0 && (
                      <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 space-y-2">
                        <p className="text-xs font-semibold text-blue-800">
                          Vista previa — {preview.length} trabajador{preview.length !== 1 ? 'es' : ''}
                        </p>
                        {preview.map((r, i) => (
                          <div key={i} className="flex justify-between items-center text-xs text-blue-700">
                            <span>{r.workerName}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">${fmt(r.netPay)} neto</span>
                              <button
                                onClick={() => handleDownload(
                                  `/api/payroll/liquidacion-pdf?period=${period}&workerId=${r.workerId}`,
                                  `liquidacion_${period.replace('-','')}_${r.workerId.slice(0,8)}.pdf`
                                )}
                                className="text-blue-500 hover:text-blue-700 transition"
                                title="Descargar liquidación PDF"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {preview.some(r => r.warnings.length > 0) && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <p className="text-[10px] text-amber-600">
                              {preview.flatMap(r => r.warnings).length} advertencia(s). Revise antes de cerrar.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Footer acciones */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpanded(null)}
                          className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => setLicenciasModal(period)}
                          className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 transition"
                        >
                          <Stethoscope className="w-3.5 h-3.5" />
                          Licencias
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={isProc}
                          onClick={() => handleProcesar(period, 'preview')}
                          className="text-sm px-4 py-2 rounded-lg border border-[#1a2e6e] text-[#1a2e6e] font-medium hover:bg-blue-50 transition disabled:opacity-50"
                        >
                          {isProc ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Calcular'}
                        </button>
                        <button
                          disabled={isProc}
                          onClick={() => handleProcesar(period, 'final')}
                          className="text-sm px-5 py-2 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] transition disabled:opacity-50 flex items-center gap-2"
                        >
                          {isProc
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Procesando...</>
                            : <><CheckCircle2 className="w-4 h-4" /> Cerrar mes</>
                          }
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Modales */}
      {licenciasModal && (
        <LicenciasModal period={licenciasModal} onClose={() => setLicenciasModal(null)} />
      )}
      {novedadesModal && (
        <NovedadesModal
          period={novedadesModal.period}
          trabajador={novedadesModal.trabajador}
          onClose={() => setNovedadesModal(null)}
        />
      )}
    </div>
  );
}
