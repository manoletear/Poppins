'use client';

import { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, Droplets, Flame, Wifi, Sparkles, Check, Loader2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { loadGoogleMaps } from '@/components/AddressAutocomplete';

// ── Catálogo empresas chilenas por región ──
const EMPRESAS = [
  // Electricidad
  { categoria: 'electricidad', nombre: 'Enel Distribución', regiones: ['Región Metropolitana'], idLabel: 'Número de Cliente', idPlaceholder: 'Ej: 1234567', campos: [{ campo: 'direccion', label: 'Dirección de suministro', placeholder: 'Av. Ejemplo 123' }], emoji: '⚡', url: 'https://www.enel.cl/es/clientes/pago-en-linea.html', ayuda: 'Encuentra tu Número de Cliente en la esquina superior derecha de tu boleta Enel.' },
  { categoria: 'electricidad', nombre: 'CGE Distribución', regiones: ['Región de O\'Higgins', 'Región del Maule', 'Región del Biobío', 'Región de La Araucanía', 'Región de Los Ríos', 'Región de Los Lagos', 'Región de Valparaíso'], idLabel: 'Número de Servicio', idPlaceholder: 'Ej: 987654', campos: [], emoji: '⚡', url: 'https://www.cge.cl/pago-en-linea/', ayuda: 'Tu Número de Servicio está en la parte superior de tu boleta CGE.' },
  { categoria: 'electricidad', nombre: 'Chilquinta Energía', regiones: ['Región de Valparaíso'], idLabel: 'Número de Cliente', idPlaceholder: 'Ej: 456789', campos: [], emoji: '⚡', url: 'https://www.chilquinta.cl/Paginas/pago-en-linea.aspx', ayuda: 'Número de Cliente en tu boleta Chilquinta.' },
  { categoria: 'electricidad', nombre: 'Saesa', regiones: ['Región de Los Lagos', 'Región de Los Ríos', 'Región de Aysén'], idLabel: 'Número de Servicio', idPlaceholder: '', campos: [], emoji: '⚡', url: 'https://www.saesa.cl/', ayuda: 'Número de Servicio en tu boleta Saesa.' },
  // Agua
  { categoria: 'agua', nombre: 'Aguas Andinas', regiones: ['Región Metropolitana'], idLabel: 'Número de Cliente', idPlaceholder: 'Ej: 12345678-9', campos: [{ campo: 'direccion', label: 'Dirección', placeholder: '' }], emoji: '💧', url: 'https://www.aguasandinas.cl/web/aguasandinas/paga-tu-cuenta', ayuda: 'Tu Número de Cliente está en la esquina superior de tu boleta de agua.' },
  { categoria: 'agua', nombre: 'ESVAL', regiones: ['Región de Valparaíso'], idLabel: 'Número de Servicio', idPlaceholder: 'Ej: 1234567', campos: [], emoji: '💧', url: 'https://www.esval.cl/pagos/', ayuda: 'Número de Servicio en tu boleta ESVAL.' },
  { categoria: 'agua', nombre: 'ESSBIO', regiones: ['Región del Biobío', 'Región de Ñuble'], idLabel: 'Número de Cliente', idPlaceholder: '', campos: [], emoji: '💧', url: 'https://www.essbio.cl/', ayuda: '' },
  { categoria: 'agua', nombre: 'Nuevo Sur', regiones: ['Región del Maule'], idLabel: 'Número de Cliente', idPlaceholder: '', campos: [], emoji: '💧', url: 'https://www.nuevosur.cl/', ayuda: '' },
  { categoria: 'agua', nombre: 'Aguas del Altiplano', regiones: ['Región de Arica y Parinacota', 'Región de Tarapacá'], idLabel: 'Número de Cliente', idPlaceholder: '', campos: [], emoji: '💧', url: 'https://www.aguasdelaltiplano.cl/', ayuda: '' },
  { categoria: 'agua', nombre: 'Aguas del Valle', regiones: ['Región de Coquimbo'], idLabel: 'Número de Cliente', idPlaceholder: '', campos: [], emoji: '💧', url: 'https://www.aguasdelvalle.cl/', ayuda: '' },
  { categoria: 'agua', nombre: 'Aguas Araucanía', regiones: ['Región de La Araucanía', 'Región de Los Ríos'], idLabel: 'Número de Cliente', idPlaceholder: '', campos: [], emoji: '💧', url: 'https://www.aguasaraucania.cl/', ayuda: '' },
  // Gas
  { categoria: 'gas', nombre: 'Metrogas', regiones: ['Región Metropolitana', 'Región de O\'Higgins'], idLabel: 'Número de Cliente', idPlaceholder: 'Ej: MG-123456', campos: [], emoji: '🔥', url: 'https://www.metrogas.cl/pago-en-linea', ayuda: 'Tu Número de Cliente Metrogas está en tu boleta mensual.' },
  { categoria: 'gas', nombre: 'Abastible', regiones: ['Nacional'], idLabel: 'Número de Cuenta', idPlaceholder: 'Ej: 12345678', campos: [{ campo: 'tipo_gas', label: 'Tipo', placeholder: 'Granel / Cilindro' }], emoji: '🔥', url: 'https://www.abastible.cl/', ayuda: 'Número de Cuenta en tu contrato o boleta Abastible.' },
  { categoria: 'gas', nombre: 'Lipigas', regiones: ['Nacional'], idLabel: 'Código de Cliente', idPlaceholder: 'Ej: LP-789012', campos: [], emoji: '🔥', url: 'https://www.lipigas.cl/', ayuda: '' },
  { categoria: 'gas', nombre: 'Gasco', regiones: ['Región de Valparaíso', 'Región del Biobío'], idLabel: 'Número de Cliente', idPlaceholder: '', campos: [], emoji: '🔥', url: 'https://www.gasco.cl/', ayuda: '' },
  // Internet/TV
  { categoria: 'internet', nombre: 'Movistar', regiones: ['Nacional'], idLabel: 'RUT Titular', idPlaceholder: '12.345.678-9', campos: [{ campo: 'telefono', label: 'Número de teléfono', placeholder: '+56 9 ...' }], emoji: '📡', url: 'https://www.movistar.cl/atencion-al-cliente/paga-tu-cuenta', ayuda: 'Usa el RUT del titular de la cuenta Movistar.' },
  { categoria: 'internet', nombre: 'VTR', regiones: ['Nacional'], idLabel: 'RUT Titular', idPlaceholder: '12.345.678-9', campos: [], emoji: '📡', url: 'https://www.vtr.com/productos/otros/pago-express', ayuda: 'RUT del titular del servicio VTR.' },
  { categoria: 'internet', nombre: 'Entel', regiones: ['Nacional'], idLabel: 'RUT Titular', idPlaceholder: '12.345.678-9', campos: [], emoji: '📡', url: 'https://www.entel.cl/pago-en-linea/', ayuda: '' },
  { categoria: 'internet', nombre: 'WOM', regiones: ['Nacional'], idLabel: 'RUT Titular', idPlaceholder: '12.345.678-9', campos: [], emoji: '📡', url: 'https://www.wom.cl/pago-en-linea/', ayuda: '' },
  { categoria: 'internet', nombre: 'Claro', regiones: ['Nacional'], idLabel: 'RUT Titular', idPlaceholder: '12.345.678-9', campos: [], emoji: '📡', url: 'https://www.clarochile.cl/', ayuda: '' },
  { categoria: 'internet', nombre: 'GTD', regiones: ['Región del Biobío', 'Región de La Araucanía', 'Región de Los Lagos'], idLabel: 'Número de Cliente', idPlaceholder: '', campos: [], emoji: '📡', url: 'https://www.gtd.cl/', ayuda: '' },
];

const REGIONES = [
  'Región de Arica y Parinacota', 'Región de Tarapacá', 'Región de Antofagasta', 'Región de Atacama',
  'Región de Coquimbo', 'Región de Valparaíso', 'Región Metropolitana', 'Región de O\'Higgins',
  'Región del Maule', 'Región de Ñuble', 'Región del Biobío', 'Región de La Araucanía',
  'Región de Los Ríos', 'Región de Los Lagos', 'Región de Aysén', 'Región de Magallanes',
];

const CATEGORIAS = [
  { value: 'electricidad', label: 'Electricidad', icon: Zap, color: 'border-yellow-200 hover:border-yellow-400' },
  { value: 'agua', label: 'Agua', icon: Droplets, color: 'border-cyan-200 hover:border-cyan-400' },
  { value: 'gas', label: 'Gas', icon: Flame, color: 'border-orange-200 hover:border-orange-400' },
  { value: 'internet', label: 'Internet / TV', icon: Wifi, color: 'border-indigo-200 hover:border-indigo-400' },
];

type Step = 'intro' | 'categoria' | 'region' | 'empresa' | 'datos' | 'confirmar' | 'listo';
type EmpresaType = typeof EMPRESAS[number];

interface Props { empleadorId: string; onClose: () => void; onSaved: () => void; }

export default function AgentePoppins({ empleadorId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<EmpresaType | null>(null);
  const [identificador, setIdentificador] = useState('');
  const [camposExtra, setCamposExtra] = useState<Record<string, string>>({});
  const [alias, setAlias] = useState('');
  const [montoEstimado, setMontoEstimado] = useState('');
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  function handleDetectRegion() {
    if (!mapsKey || !navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await loadGoogleMaps(mapsKey!);
          const g = (window as any).google;
          const geocoder = new g.maps.Geocoder();
          const { results } = await geocoder.geocode({ location: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
          const comps = results?.[0]?.address_components || [];
          const reg: string = comps.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || '';
          const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/regi[oó]n/g, '').replace(/\s+/g, ' ').trim();
          const nReg = norm(reg);
          const match = REGIONES.find(r => nReg && (nReg.includes(norm(r)) || norm(r).includes(nReg)));
          if (match) { setSelectedRegion(match); setStep('empresa'); }
        } finally {
          setDetecting(false);
        }
      },
      () => setDetecting(false),
      { timeout: 10000 }
    );
  }

  const empresasFiltradas = EMPRESAS.filter(e =>
    e.categoria === selectedCat &&
    (e.regiones.includes('Nacional') || e.regiones.includes(selectedRegion))
  );

  const reset = () => { setStep('categoria'); setIdentificador(''); setCamposExtra({}); setAlias(''); setMontoEstimado(''); setSelectedEmpresa(null); setSelectedRegion(''); };

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!selectedEmpresa || !identificador) return;
    setSaving(true);
    setSaveError(null);
    const supabase = createClient();
    const { error } = await supabase.from('cuentas_pago').insert({
      empleador_id: empleadorId,
      tipo: selectedCat,
      alias: alias || `${selectedEmpresa.nombre} - ${identificador}`,
      proveedor: selectedEmpresa.nombre,
      numero_cuenta: identificador,
      monto_fijo: montoEstimado ? Number(montoEstimado) : null,
      fuente: 'poppins_agent',
      activa: true,
    });
    setSaving(false);
    if (error) {
      setSaveError(`Error al guardar: ${error.message}`);
      return;
    }
    setStep('listo');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Sparkles className="w-5 h-5 text-white" /></div>
            <div><p className="text-white font-semibold">Poppins</p><p className="text-white/70 text-xs">Asistente de cuentas</p></div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* INTRO */}
          {step === 'intro' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto"><Sparkles className="w-8 h-8 text-violet-600" /></div>
              <h2 className="text-lg font-bold text-zinc-900">¡Hola! Soy Poppins</h2>
              <p className="text-sm text-zinc-500">Te ayudo a agregar tus cuentas de servicios. Vamos paso a paso.</p>
              <button onClick={() => setStep('categoria')} className="w-full bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700 transition flex items-center justify-center gap-2">
                Comenzar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CATEGORÍA */}
          {step === 'categoria' && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-zinc-900">1. ¿Qué tipo de cuenta quieres agregar?</p>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIAS.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.value} onClick={() => { setSelectedCat(cat.value); setStep('region'); }}
                      className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${cat.color}`}>
                      <Icon className="w-6 h-6 mb-2" />
                      <p className="text-sm font-semibold text-zinc-900">{cat.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* REGIÓN */}
          {step === 'region' && (
            <div className="space-y-4">
              <button onClick={() => setStep('categoria')} className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Cambiar categoría</button>
              <p className="text-sm font-medium text-zinc-900">2. ¿En qué región estás?</p>
              {mapsKey && (
                <button onClick={handleDetectRegion} disabled={detecting}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                  {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : '📍'} {detecting ? 'Detectando...' : 'Detectar mi ubicación'}
                </button>
              )}
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {REGIONES.map(r => (
                  <button key={r} onClick={() => { setSelectedRegion(r); setStep('empresa'); }}
                    className="w-full text-left rounded-lg border border-zinc-200 px-3 py-2 text-sm hover:bg-zinc-50 transition">
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* EMPRESA */}
          {step === 'empresa' && (
            <div className="space-y-4">
              <button onClick={() => setStep('region')} className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Cambiar región</button>
              <p className="text-sm font-medium text-zinc-900">3. Elige tu empresa de {CATEGORIAS.find(c => c.value === selectedCat)?.label.toLowerCase()}</p>
              <p className="text-xs text-zinc-400">{selectedRegion}</p>
              {empresasFiltradas.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-4">No hay empresas disponibles en esta región para esta categoría</p>
              ) : (
                <div className="space-y-2">
                  {empresasFiltradas.map((emp, i) => (
                    <button key={i} onClick={() => { setSelectedEmpresa(emp); setStep('datos'); }}
                      className="w-full rounded-lg border border-zinc-200 p-3 text-left hover:bg-zinc-50 transition flex items-center gap-3">
                      <span className="text-2xl">{emp.emoji}</span>
                      <span className="text-sm font-medium text-zinc-900">{emp.nombre}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* DATOS */}
          {step === 'datos' && selectedEmpresa && (
            <div className="space-y-4">
              <button onClick={() => setStep('empresa')} className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1"><ChevronLeft className="w-3 h-3" /> Cambiar empresa</button>
              <p className="text-sm font-medium text-zinc-900">4. Datos de tu cuenta en {selectedEmpresa.nombre}</p>
              <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-500 space-y-1">
                <p><Search className="w-3.5 h-3.5 inline mr-1" /> Estos datos están en tu boleta o en el sitio web de {selectedEmpresa.nombre}</p>
                {selectedEmpresa.ayuda && <p className="text-zinc-600 font-medium">{selectedEmpresa.ayuda}</p>}
                {selectedEmpresa.url && (
                  <a href={selectedEmpresa.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-violet-600 hover:underline font-medium">
                    Verificar en {selectedEmpresa.nombre} →
                  </a>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">{selectedEmpresa.idLabel} *</label>
                  <input value={identificador} onChange={e => setIdentificador(e.target.value)} placeholder={selectedEmpresa.idPlaceholder}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                {selectedEmpresa.campos.map(c => (
                  <div key={c.campo}>
                    <label className="text-xs font-medium text-zinc-600 block mb-1">{c.label}</label>
                    <input value={camposExtra[c.campo] || ''} onChange={e => setCamposExtra(p => ({ ...p, [c.campo]: e.target.value }))} placeholder={c.placeholder}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Alias (opcional)</label>
                  <input value={alias} onChange={e => setAlias(e.target.value)} placeholder={`Ej: Luz casa`}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Monto estimado mensual (opcional)</label>
                  <input value={montoEstimado} onChange={e => setMontoEstimado(e.target.value)} type="number" placeholder="$"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <button onClick={() => setStep('confirmar')} disabled={!identificador}
                className="w-full bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                Revisar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CONFIRMAR */}
          {step === 'confirmar' && selectedEmpresa && (
            <div className="space-y-4">
              <p className="text-sm font-medium text-zinc-900">5. Confirma los datos</p>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Empresa</span><span className="font-medium">{selectedEmpresa.emoji} {selectedEmpresa.nombre}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">Región</span><span className="font-medium">{selectedRegion}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">{selectedEmpresa.idLabel}</span><span className="font-medium">{identificador}</span></div>
                {alias && <div className="flex justify-between"><span className="text-zinc-500">Alias</span><span className="font-medium">{alias}</span></div>}
                {montoEstimado && <div className="flex justify-between"><span className="text-zinc-500">Monto estimado</span><span className="font-medium">${Number(montoEstimado).toLocaleString('es-CL')}</span></div>}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('datos')} className="flex-1 border border-zinc-200 rounded-lg py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Editar</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Agregar cuenta
                </button>
              </div>
              {saveError && <p className="text-xs text-red-600 mt-2">{saveError}</p>}
            </div>
          )}

          {/* LISTO */}
          {step === 'listo' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto"><Check className="w-8 h-8 text-emerald-600" /></div>
              <h2 className="text-lg font-bold text-zinc-900">¡Cuenta agregada!</h2>
              <p className="text-sm text-zinc-500">{selectedEmpresa?.nombre} lista para pagar desde Poppins.</p>
              <div className="flex gap-3">
                <button onClick={reset} className="flex-1 border border-zinc-200 rounded-lg py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Agregar otra</button>
                <button onClick={onClose} className="flex-1 bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700">Listo</button>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        {!['intro', 'listo'].includes(step) && (
          <div className="px-6 pb-4 flex gap-1 shrink-0">
            {['categoria', 'region', 'empresa', 'datos', 'confirmar'].map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition ${['categoria', 'region', 'empresa', 'datos', 'confirmar'].indexOf(step) >= i ? 'bg-violet-500' : 'bg-zinc-200'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
