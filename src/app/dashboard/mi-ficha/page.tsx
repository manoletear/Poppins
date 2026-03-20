'use client';

import { useState, useEffect, useCallback } from 'react';
import { Pencil, ChevronUp, ChevronDown, X, FileText, Download, Clock, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const tabs = ['Resumen', 'Liquidaciones', 'Documentos', 'Historial'] as const;

interface Trabajador {
  id: string;
  rut: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  telefono: string;
  fecha_nacimiento: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  cargo: string;
  estado: string;
  afp_id: string;
  salud_id: string;
}

interface Contrato {
  id: string;
  trabajador_id: string;
  sueldo_base: number;
  tipo_contrato: string;
  tipo_jornada: string;
  horas_semanales: number;
  fecha_inicio: string;
  fecha_termino: string | null;
  estado: string;
}

interface Liquidacion {
  id: string;
  trabajador_id: string;
  periodo: string;
  sueldo_base: number;
  total_haberes: number;
  total_descuentos: number;
  sueldo_liquido: number;
  created_at: string;
}

interface Documento {
  id: string;
  trabajador_id: string;
  nombre: string;
  tipo: string;
  url: string;
  created_at: string;
}

interface Anotacion {
  id: string;
  trabajador_id: string;
  tipo: string;
  descripcion: string;
  fecha: string;
  created_at: string;
}

function formatRut(rut: string): string {
  if (!rut) return '-';
  const clean = rut.replace(/[^0-9kK]/g, '');
  if (clean.length < 2) return rut;
  const body = clean.slice(0, -1);
  const dv = clean.slice(-1).toUpperCase();
  const formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formatted}-${dv}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' });
}

function calcAge(dateStr: string): number {
  if (!dateStr) return 0;
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function calcMonthsSince(dateStr: string): string {
  if (!dateStr) return '';
  const start = new Date(dateStr);
  const now = new Date();
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
  if (months < 1) return 'menos de 1 mes';
  if (months === 1) return '1 mes';
  if (months < 12) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (rem === 0) return years === 1 ? '1 año' : `${years} años`;
  return `${years === 1 ? '1 año' : `${years} años`} y ${rem} ${rem === 1 ? 'mes' : 'meses'}`;
}

function getInitials(nombre: string, apellido: string): string {
  return `${(nombre || '')[0] || ''}${(apellido || '')[0] || ''}`.toUpperCase();
}

// ─── Update Modal ────────────────────────────────────────────────────
function UpdateModal({
  trabajador,
  onClose,
  onSaved,
}: {
  trabajador: Trabajador;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [email, setEmail] = useState(trabajador.email || '');
  const [telefono, setTelefono] = useState(trabajador.telefono || '');
  const [direccion, setDireccion] = useState(trabajador.direccion || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('trabajadores')
        .update({
          email,
          telefono,
          direccion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', trabajador.id);
      if (updateError) throw updateError;
      onSaved();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-zinc-900">Actualizar Datos</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-5">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Correo</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              placeholder="correo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Telefono</label>
            <input
              type="tel"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              placeholder="+56 9 1234 5678"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-1.5">Direccion</label>
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
              placeholder="Av. Principal 1234"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function MiFichaPage() {
  const [activeTab, setActiveTab] = useState<string>('Resumen');
  const [infoOpen, setInfoOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Data state
  const [trabajador, setTrabajador] = useState<Trabajador | null>(null);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [historial, setHistorial] = useState<Anotacion[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      // 1. Get first active worker
      const { data: trab, error: trabErr } = await supabase
        .from('trabajadores')
        .select('*')
        .eq('estado', 'activo')
        .limit(1)
        .single();
      if (trabErr) throw trabErr;
      if (!trab) throw new Error('No se encontro trabajador activo');
      setTrabajador(trab as Trabajador);

      const workerId = trab.id;

      // 2. Get active contract
      const { data: contratoData } = await supabase
        .from('contratos')
        .select('*')
        .eq('trabajador_id', workerId)
        .eq('estado', 'activo')
        .single();
      setContrato(contratoData as Contrato | null);

      // 3. Get last 6 liquidaciones
      const { data: liqData } = await supabase
        .from('liquidaciones')
        .select('*')
        .eq('trabajador_id', workerId)
        .order('periodo', { ascending: false })
        .limit(6);
      setLiquidaciones((liqData as Liquidacion[] | null) ?? []);

      // 4. Get documents
      const { data: docData } = await supabase
        .from('documentos_empleado')
        .select('*')
        .eq('trabajador_id', workerId)
        .order('created_at', { ascending: false });
      setDocumentos((docData as Documento[] | null) ?? []);

      // 5. Get historial / anotaciones
      const { data: histData } = await supabase
        .from('anotaciones')
        .select('*')
        .eq('trabajador_id', workerId)
        .order('fecha', { ascending: false })
        .limit(20);
      setHistorial((histData as Anotacion[] | null) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar datos';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ─── Loading state ────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-3 text-sm text-zinc-500">Cargando ficha...</span>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────
  if (error || !trabajador) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="rounded-lg bg-red-50 px-6 py-4 text-sm text-red-700 border border-red-200 max-w-md text-center">
          {error || 'No se pudo cargar la informacion del trabajador.'}
        </div>
        <button
          onClick={loadData}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ─── Derived display data ─────────────────────
  const fullName = `${trabajador.nombre} ${trabajador.apellido_paterno} ${trabajador.apellido_materno || ''}`.trim();
  const initials = getInitials(trabajador.nombre, trabajador.apellido_paterno);

  const infoFields = [
    { label: 'Identificacion (RUT)', value: formatRut(trabajador.rut) },
    { label: 'Correo', value: trabajador.email || '-' },
    { label: 'Cumpleanos', value: trabajador.fecha_nacimiento ? `${formatDate(trabajador.fecha_nacimiento)} (${calcAge(trabajador.fecha_nacimiento)} anos)` : '-' },
    { label: 'Direccion', value: trabajador.direccion || '-' },
    { label: 'Telefono', value: trabajador.telefono || '-' },
    { label: 'Comuna', value: trabajador.comuna || '-' },
  ];

  const resumenData = [
    { label: 'Cargo', value: trabajador.cargo || '-' },
    { label: 'Estado', value: trabajador.estado || '-' },
    ...(contrato
      ? [
          { label: 'Sueldo Base', value: formatCurrency(contrato.sueldo_base) },
          { label: 'Tipo Contrato', value: contrato.tipo_contrato || '-' },
          { label: 'Tipo Jornada', value: contrato.tipo_jornada ? `${contrato.tipo_jornada} ${contrato.horas_semanales ? `(${contrato.horas_semanales} hrs/sem)` : ''}` : '-' },
          { label: 'Fecha Ingreso', value: `${formatDate(contrato.fecha_inicio)} (${calcMonthsSince(contrato.fecha_inicio)})` },
        ]
      : [{ label: 'Contrato', value: 'Sin contrato activo' }]),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-zinc-900">Mi Ficha</h2>
        <p className="text-sm text-zinc-500">Perfil del colaborador</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left sidebar */}
        <div className="w-full lg:w-72 shrink-0 rounded-xl border border-zinc-200 bg-white">
          {/* Header section */}
          <div className="bg-gradient-to-br from-indigo-50 via-blue-50 to-sky-50 px-6 pt-8 pb-6 rounded-t-xl flex flex-col items-center text-center">
            <div className="h-20 w-20 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-indigo-200">
              {initials}
            </div>
            <h3 className="mt-4 text-base font-bold text-zinc-900">{fullName}</h3>
            <p className="text-sm text-zinc-500">{trabajador.cargo || 'Sin cargo'}</p>
            <span className="mt-2 rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700">
              ID: {trabajador.id.slice(0, 8)}
            </span>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              <Pencil className="h-3.5 w-3.5" />
              Actualizar Datos
            </button>
          </div>

          {/* Info section */}
          <div className="px-5 py-4">
            <button
              onClick={() => setInfoOpen(!infoOpen)}
              className="flex w-full items-center justify-between text-sm font-semibold text-zinc-700"
            >
              Informacion General
              {infoOpen ? (
                <ChevronUp className="h-4 w-4 text-zinc-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-zinc-400" />
              )}
            </button>

            {infoOpen && (
              <dl className="mt-4 space-y-4">
                {infoFields.map((field) => (
                  <div key={field.label}>
                    <dt className="text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                      {field.label}
                    </dt>
                    <dd className="text-sm text-zinc-900 font-medium">
                      {field.value}
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>

        {/* Right content area */}
        <div className="flex-1 min-w-0">
          {/* Tabs bar */}
          <div className="border-b border-zinc-200">
            <nav className="flex gap-0">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab
                      ? 'border-zinc-900 text-zinc-900'
                      : 'border-transparent text-zinc-500 hover:text-zinc-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          {/* ─── Tab: Resumen ──────────────────────────── */}
          {activeTab === 'Resumen' && (
            <div className="mt-6 rounded-xl border border-zinc-200 bg-white">
              <dl className="divide-y divide-zinc-100">
                {resumenData.map((row, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-3 gap-4 px-6 py-3.5 hover:bg-zinc-50/50 transition-colors"
                  >
                    <dt className="text-sm font-medium text-zinc-500">{row.label}</dt>
                    <dd className="col-span-2 text-sm text-zinc-900 font-medium">{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* ─── Tab: Liquidaciones ────────────────────── */}
          {activeTab === 'Liquidaciones' && (
            <div className="mt-6">
              {liquidaciones.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-zinc-300" />
                  <p className="mt-3 text-sm text-zinc-500">No hay liquidaciones registradas</p>
                </div>
              ) : (
                <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50">
                        <th className="px-6 py-3 text-left font-medium text-zinc-500">Periodo</th>
                        <th className="px-6 py-3 text-right font-medium text-zinc-500">Sueldo Base</th>
                        <th className="px-6 py-3 text-right font-medium text-zinc-500">Total Haberes</th>
                        <th className="px-6 py-3 text-right font-medium text-zinc-500">Descuentos</th>
                        <th className="px-6 py-3 text-right font-medium text-zinc-500">Liquido</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {liquidaciones.map((liq) => (
                        <tr key={liq.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-3 font-medium text-zinc-900">{liq.periodo}</td>
                          <td className="px-6 py-3 text-right text-zinc-700">{formatCurrency(liq.sueldo_base)}</td>
                          <td className="px-6 py-3 text-right text-zinc-700">{formatCurrency(liq.total_haberes)}</td>
                          <td className="px-6 py-3 text-right text-red-600">{formatCurrency(liq.total_descuentos)}</td>
                          <td className="px-6 py-3 text-right font-semibold text-zinc-900">{formatCurrency(liq.sueldo_liquido)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: Documentos ───────────────────────── */}
          {activeTab === 'Documentos' && (
            <div className="mt-6">
              {documentos.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
                  <FileText className="mx-auto h-10 w-10 text-zinc-300" />
                  <p className="mt-3 text-sm text-zinc-500">No hay documentos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentos.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white px-5 py-4 hover:bg-zinc-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-zinc-900">{doc.nombre}</p>
                          <p className="text-xs text-zinc-500">
                            {doc.tipo} &middot; {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      {doc.url && (
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-zinc-200 p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── Tab: Historial ────────────────────────── */}
          {activeTab === 'Historial' && (
            <div className="mt-6">
              {historial.length === 0 ? (
                <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center">
                  <Clock className="mx-auto h-10 w-10 text-zinc-300" />
                  <p className="mt-3 text-sm text-zinc-500">No hay registros en el historial</p>
                </div>
              ) : (
                <div className="relative pl-6">
                  {/* Timeline line */}
                  <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-zinc-200" />

                  <div className="space-y-6">
                    {historial.map((item) => (
                      <div key={item.id} className="relative flex gap-4">
                        {/* Dot */}
                        <div className="absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-indigo-500 bg-white" />

                        <div className="flex-1 rounded-xl border border-zinc-200 bg-white px-5 py-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <span className="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700 capitalize">
                                {item.tipo}
                              </span>
                              <p className="mt-2 text-sm text-zinc-900">{item.descripcion}</p>
                            </div>
                            <time className="text-xs text-zinc-400 whitespace-nowrap ml-4">
                              {formatDate(item.fecha)}
                            </time>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─── Update Modal ──────────────────────────── */}
      {showModal && (
        <UpdateModal
          trabajador={trabajador}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
