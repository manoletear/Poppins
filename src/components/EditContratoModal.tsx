'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Briefcase, AlertTriangle } from 'lucide-react';

interface CargoCatalogo {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  requiere_puertas_adentro: boolean;
}

interface Beneficios {
  colacion_monto?: number;
  movilizacion_monto?: number;
  otros?: Array<{ nombre: string; monto: number; imponible: boolean }>;
}

type DistDia = { inicio: string; fin: string; colacion_min?: number } | null;
type DistHoraria = Record<string, DistDia>;

interface Props {
  contratoId: string;
  initial: {
    sueldo_base: number;
    horas_semanales: number | null;
    cargo: string | null;
    tipo_contrato: string | null;
    fecha_inicio: string | null;
    fecha_termino: string | null;
    tipo_gratificacion: string | null;
    puertas_adentro?: boolean;
    lugar_servicios?: string | null;
    distribucion_horaria?: DistHoraria | null;
    beneficios?: Beneficios | null;
    viajes_familia?: boolean;
    descanso_semanal?: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

const TIPOS_CONTRATO = [
  { value: 'indefinido', label: 'Indefinido' },
  { value: 'plazo_fijo', label: 'Plazo fijo' },
  { value: 'obra_faena', label: 'Obra o faena' },
];

const TIPOS_GRATIF = [
  { value: 'art_50', label: 'Art. 50 (25% sueldo, tope 4.75 IMM)' },
  { value: 'art_47', label: 'Art. 47 (30% utilidad líquida)' },
];

const DIAS_LABEL = [
  { key: 'lunes',     short: 'Lun' },
  { key: 'martes',    short: 'Mar' },
  { key: 'miercoles', short: 'Mié' },
  { key: 'jueves',    short: 'Jue' },
  { key: 'viernes',   short: 'Vie' },
  { key: 'sabado',    short: 'Sáb' },
  { key: 'domingo',   short: 'Dom' },
];

function defaultDist(): DistHoraria {
  return {
    lunes:     { inicio: '08:00', fin: '17:00', colacion_min: 60 },
    martes:    { inicio: '08:00', fin: '17:00', colacion_min: 60 },
    miercoles: { inicio: '08:00', fin: '17:00', colacion_min: 60 },
    jueves:    { inicio: '08:00', fin: '17:00', colacion_min: 60 },
    viernes:   { inicio: '08:00', fin: '17:00', colacion_min: 60 },
    sabado:    null,
    domingo:   null,
  };
}

export default function EditContratoModal({ contratoId, initial, onClose, onSaved }: Props) {
  const [tab, setTab] = useState<'basico' | 'jornada' | 'beneficios' | 'tcp'>('basico');
  const [cargos, setCargos] = useState<CargoCatalogo[]>([]);

  const [sueldoBase, setSueldoBase]     = useState(String(initial.sueldo_base ?? ''));
  const [horas, setHoras]               = useState(String(initial.horas_semanales ?? 45));
  const [cargo, setCargo]               = useState(initial.cargo ?? '');
  const [tipo, setTipo]                 = useState(initial.tipo_contrato ?? 'indefinido');
  const [fechaInicio, setFechaInicio]   = useState(initial.fecha_inicio ?? '');
  const [fechaTermino, setFechaTermino] = useState(initial.fecha_termino ?? '');
  const [gratif, setGratif]             = useState(initial.tipo_gratificacion ?? 'art_50');

  // TCP específicos
  const [puertasAdentro, setPuertasAdentro] = useState(!!initial.puertas_adentro);
  const [lugarServicios, setLugarServicios] = useState(initial.lugar_servicios ?? '');
  const [dist, setDist]                     = useState<DistHoraria>(initial.distribucion_horaria ?? defaultDist());
  const [viajes, setViajes]                 = useState(!!initial.viajes_familia);
  const [descanso, setDescanso]             = useState(initial.descanso_semanal ?? 'domingo');

  // Beneficios
  const [colacionMonto, setColacionMonto]         = useState(String(initial.beneficios?.colacion_monto ?? ''));
  const [movilizacionMonto, setMovilizacionMonto] = useState(String(initial.beneficios?.movilizacion_monto ?? ''));

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [warns, setWarns] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/catalogos/cargos-tcp').then(r => r.json()).then(d => {
      if (d?.ok) setCargos(d.cargos);
    }).catch(() => {});
  }, []);

  function setDia(diaKey: string, patch: Partial<NonNullable<DistDia>> | null) {
    setDist(d => ({ ...d, [diaKey]: patch === null ? null : { ...(d[diaKey] ?? { inicio: '08:00', fin: '17:00' }), ...patch } }));
  }

  async function save() {
    setSaving(true); setErr(null); setWarns([]);
    try {
      const beneficios: Beneficios = {};
      if (Number(colacionMonto) > 0)     beneficios.colacion_monto     = Number(colacionMonto);
      if (Number(movilizacionMonto) > 0) beneficios.movilizacion_monto = Number(movilizacionMonto);

      const body: Record<string, any> = {
        sueldo_base: Number(sueldoBase) || 0,
        horas_semanales: Number(horas) || 45,
        cargo: cargo || null,
        tipo_contrato: tipo,
        fecha_inicio: fechaInicio || null,
        fecha_termino: fechaTermino || null,
        tipo_gratificacion: gratif,
        puertas_adentro: puertasAdentro,
        lugar_servicios: lugarServicios || null,
        distribucion_horaria: dist,
        beneficios: Object.keys(beneficios).length > 0 ? beneficios : null,
        viajes_familia: viajes,
        descanso_semanal: descanso,
      };
      const r = await fetch(`/api/contratos/${contratoId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (d.ok) {
        if (d.warnings) setWarns(d.warnings);
        if (d.anexoCreado) alert(`Se creó el anexo automáticamente. Revisar en perfil del trabajador.`);
        onSaved();
        if (!d.warnings || d.warnings.length === 0) onClose();
      } else if (d.error === 'validacion_legal') {
        setErr(d.detalles?.join(' · ') ?? 'Validación legal');
      } else {
        setErr(d.error ?? 'Error al guardar');
      }
    } catch (e: any) { setErr(e?.message ?? 'Error de red'); }
    finally { setSaving(false); }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl pointer-events-auto max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-800">Editar contrato</h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 border-b border-zinc-200">
            {([['basico','Básico'],['jornada','Jornada'],['beneficios','Beneficios'],['tcp','TCP']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)}
                className={`text-xs px-3 py-2 border-b-2 transition ${tab === k ? 'border-[#1a2e6e] text-[#1a2e6e] font-semibold' : 'border-transparent text-zinc-500'}`}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
            {tab === 'basico' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Cargo *</label>
                  <select value={cargos.find(c => c.nombre === cargo)?.codigo ?? ''}
                    onChange={e => {
                      const sel = cargos.find(c => c.codigo === e.target.value);
                      if (sel) {
                        setCargo(sel.nombre);
                        if (sel.requiere_puertas_adentro) setPuertasAdentro(true);
                      }
                    }}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2">
                    <option value="">— Selecciona —</option>
                    {cargos.map(c => <option key={c.codigo} value={c.codigo}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Sueldo base (CLP) *</label>
                  <input type="number" min="0" value={sueldoBase} onChange={e => setSueldoBase(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Horas semanales *</label>
                  <input type="number" min="0" max="45" value={horas} onChange={e => setHoras(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo de contrato *</label>
                  <select value={tipo} onChange={e => setTipo(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2">
                    {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo gratificación</label>
                  <select value={gratif} onChange={e => setGratif(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2">
                    {TIPOS_GRATIF.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Fecha inicio *</label>
                  <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Fecha término {tipo === 'plazo_fijo' && '*'}</label>
                  <input type="date" value={fechaTermino} onChange={e => setFechaTermino(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                </div>
              </div>
            )}

            {tab === 'jornada' && (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Lugar de prestación de servicios (dirección del hogar)</label>
                  <input type="text" value={lugarServicios} onChange={e => setLugarServicios(e.target.value)}
                    placeholder="Av. Providencia 1234, depto 56, Providencia"
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                  <p className="text-[10px] text-zinc-400 mt-1">Art. 10 N°3 CT: lugar donde se prestan los servicios.</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-2">Distribución horaria por día</label>
                  <div className="space-y-1.5">
                    {DIAS_LABEL.map(d => (
                      <div key={d.key} className="flex items-center gap-2 text-xs">
                        <label className="flex items-center gap-1 w-16">
                          <input type="checkbox" checked={dist[d.key] != null}
                            onChange={e => setDia(d.key, e.target.checked ? { inicio: '08:00', fin: '17:00', colacion_min: 60 } : null)} />
                          {d.short}
                        </label>
                        {dist[d.key] != null && (
                          <>
                            <input type="time" value={dist[d.key]!.inicio}
                              onChange={e => setDia(d.key, { inicio: e.target.value })}
                              className="text-xs rounded border border-zinc-300 px-2 py-1" />
                            <span className="text-zinc-400">a</span>
                            <input type="time" value={dist[d.key]!.fin}
                              onChange={e => setDia(d.key, { fin: e.target.value })}
                              className="text-xs rounded border border-zinc-300 px-2 py-1" />
                            <span className="text-zinc-500">colación:</span>
                            <input type="number" min="0" max="120"
                              value={dist[d.key]!.colacion_min ?? 0}
                              onChange={e => setDia(d.key, { colacion_min: Number(e.target.value) })}
                              className="w-14 text-xs rounded border border-zinc-300 px-2 py-1" />
                            <span className="text-zinc-400">min</span>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Descanso semanal</label>
                  <select value={descanso} onChange={e => setDescanso(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2">
                    <option value="domingo">Domingo y festivos</option>
                    <option value="sabado_domingo">Sábado, domingo y festivos</option>
                    <option value="rotativo">Rotativo / por turnos</option>
                  </select>
                </div>
              </div>
            )}

            {tab === 'beneficios' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Colación (CLP, no imponible)</label>
                  <input type="number" min="0" value={colacionMonto} onChange={e => setColacionMonto(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Movilización (CLP, no imponible)</label>
                  <input type="number" min="0" value={movilizacionMonto} onChange={e => setMovilizacionMonto(e.target.value)}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2" />
                </div>
              </div>
            )}

            {tab === 'tcp' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-zinc-200 p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={puertasAdentro} onChange={e => setPuertasAdentro(e.target.checked)}
                      className="mt-1" />
                    <div>
                      <p className="font-semibold text-zinc-800">Modalidad puertas adentro</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">
                        El(la) trabajador(a) reside en el hogar del empleador. Sin sujeción a horario, con descanso absoluto mínimo de 12 horas diarias (Art. 149 CT).
                      </p>
                    </div>
                  </label>
                </div>

                <div className="rounded-xl border border-zinc-200 p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <input type="checkbox" checked={viajes} onChange={e => setViajes(e.target.checked)}
                      className="mt-1" />
                    <div>
                      <p className="font-semibold text-zinc-800">Acompaña a la familia en viajes</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">
                        Cláusula del Art. 152 CT. El tiempo de viaje constituye jornada efectiva. Gastos de traslado, alojamiento y alimentación de cargo del empleador.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {err && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>}
            {warns.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <ul className="space-y-1">{warns.map((w, i) => <li key={i}>• {w}</li>)}</ul>
              </div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
              Cancelar
            </button>
            <button onClick={save} disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
