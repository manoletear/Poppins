'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Zap, Droplets, Flame, Wifi, Sparkles, Check, Loader2, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Empresa { id: number; categoria: string; nombre: string; identificador_label: string; identificador_placeholder: string; campos_extra: any[]; logo_emoji: string; }

const CATEGORIAS = [
  { value: 'electricidad', label: 'Electricidad', icon: Zap, color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { value: 'agua', label: 'Agua', icon: Droplets, color: 'bg-cyan-50 text-cyan-600 border-cyan-200' },
  { value: 'gas', label: 'Gas', icon: Flame, color: 'bg-orange-50 text-orange-600 border-orange-200' },
  { value: 'internet', label: 'Internet / TV', icon: Wifi, color: 'bg-indigo-50 text-indigo-600 border-indigo-200' },
];

type Step = 'intro' | 'categoria' | 'empresa' | 'datos' | 'confirmar' | 'listo';

interface Props {
  empleadorId: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function AgentePoppins({ empleadorId, onClose, onSaved }: Props) {
  const [step, setStep] = useState<Step>('intro');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [identificador, setIdentificador] = useState('');
  const [camposExtra, setCamposExtra] = useState<Record<string, string>>({});
  const [alias, setAlias] = useState('');
  const [montoEstimado, setMontoEstimado] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.from('empresas_servicios').select('*').eq('activa', true).order('categoria').order('nombre')
      .then(({ data }: any) => setEmpresas(data || []));
  }, []);

  const empresasFiltradas = empresas.filter(e => e.categoria === selectedCat);

  const handleSave = async () => {
    if (!selectedEmpresa || !identificador) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from('cuentas_pago').insert({
      empleador_id: empleadorId,
      tipo: selectedCat,
      alias: alias || `${selectedEmpresa.nombre} - ${identificador}`,
      proveedor: selectedEmpresa.nombre,
      numero_cuenta: identificador,
      monto_fijo: montoEstimado ? Number(montoEstimado) : null,
      fuente: 'poppins_agent',
      activa: true,
      ...Object.fromEntries(Object.entries(camposExtra).filter(([_, v]) => v)),
    });
    setSaving(false);
    setStep('listo');
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Poppins</p>
              <p className="text-white/70 text-xs">Asistente de cuentas</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6">
          {/* INTRO */}
          {step === 'intro' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto">
                <Sparkles className="w-8 h-8 text-violet-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">¡Hola! Soy Poppins</h2>
              <p className="text-sm text-zinc-500">Te ayudo a agregar tus cuentas de servicios para pagarlas desde un solo lugar. Vamos paso a paso.</p>
              <button onClick={() => setStep('categoria')} className="w-full bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700 transition flex items-center justify-center gap-2">
                Comenzar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CATEGORÍA */}
          {step === 'categoria' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">1</div>
                <p className="text-sm font-medium text-zinc-900">¿Qué tipo de cuenta quieres agregar?</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIAS.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <button key={cat.value} onClick={() => { setSelectedCat(cat.value); setStep('empresa'); }}
                      className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${selectedCat === cat.value ? 'border-violet-500 bg-violet-50' : 'border-zinc-200 hover:border-zinc-300'}`}>
                      <Icon className="w-6 h-6 mb-2" />
                      <p className="text-sm font-semibold text-zinc-900">{cat.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* EMPRESA */}
          {step === 'empresa' && (
            <div className="space-y-4">
              <button onClick={() => setStep('categoria')} className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Cambiar categoría
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">2</div>
                <p className="text-sm font-medium text-zinc-900">¿Cuál es tu empresa de {CATEGORIAS.find(c => c.value === selectedCat)?.label.toLowerCase()}?</p>
              </div>
              <div className="space-y-2">
                {empresasFiltradas.map(emp => (
                  <button key={emp.id} onClick={() => { setSelectedEmpresa(emp); setStep('datos'); }}
                    className="w-full rounded-lg border border-zinc-200 p-3 text-left hover:bg-zinc-50 transition flex items-center gap-3">
                    <span className="text-2xl">{emp.logo_emoji}</span>
                    <span className="text-sm font-medium text-zinc-900">{emp.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* DATOS */}
          {step === 'datos' && selectedEmpresa && (
            <div className="space-y-4">
              <button onClick={() => setStep('empresa')} className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1">
                <ChevronLeft className="w-3 h-3" /> Cambiar empresa
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">3</div>
                <p className="text-sm font-medium text-zinc-900">Datos de tu cuenta en {selectedEmpresa.nombre}</p>
              </div>
              <div className="bg-zinc-50 rounded-lg p-3 text-xs text-zinc-500">
                <Search className="w-3.5 h-3.5 inline mr-1" />
                Puedes encontrar estos datos en tu boleta o en el sitio web de {selectedEmpresa.nombre}
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">{selectedEmpresa.identificador_label} *</label>
                  <input value={identificador} onChange={e => setIdentificador(e.target.value)}
                    placeholder={selectedEmpresa.identificador_placeholder || ''}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                {(selectedEmpresa.campos_extra || []).map((campo: any) => (
                  <div key={campo.campo}>
                    <label className="text-xs font-medium text-zinc-600 block mb-1">{campo.label}</label>
                    <input value={camposExtra[campo.campo] || ''} onChange={e => setCamposExtra(prev => ({ ...prev, [campo.campo]: e.target.value }))}
                      placeholder={campo.placeholder || ''}
                      className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Alias (opcional)</label>
                  <input value={alias} onChange={e => setAlias(e.target.value)} placeholder={`Ej: Luz casa Las Condes`}
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
                <div>
                  <label className="text-xs font-medium text-zinc-600 block mb-1">Monto estimado mensual (opcional)</label>
                  <input value={montoEstimado} onChange={e => setMontoEstimado(e.target.value)} type="number" placeholder="$"
                    className="w-full border border-zinc-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400" />
                </div>
              </div>
              <button onClick={() => setStep('confirmar')} disabled={!identificador}
                className="w-full bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                Revisar <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* CONFIRMAR */}
          {step === 'confirmar' && selectedEmpresa && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-violet-100 rounded-full flex items-center justify-center text-xs font-bold text-violet-600">4</div>
                <p className="text-sm font-medium text-zinc-900">Confirma los datos</p>
              </div>
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-zinc-500">Empresa</span><span className="font-medium">{selectedEmpresa.logo_emoji} {selectedEmpresa.nombre}</span></div>
                <div className="flex justify-between"><span className="text-zinc-500">{selectedEmpresa.identificador_label}</span><span className="font-medium">{identificador}</span></div>
                {alias && <div className="flex justify-between"><span className="text-zinc-500">Alias</span><span className="font-medium">{alias}</span></div>}
                {montoEstimado && <div className="flex justify-between"><span className="text-zinc-500">Monto estimado</span><span className="font-medium">${Number(montoEstimado).toLocaleString('es-CL')}</span></div>}
                {Object.entries(camposExtra).filter(([_, v]) => v).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><span className="text-zinc-500 capitalize">{k.replace(/_/g, ' ')}</span><span className="font-medium">{v}</span></div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setStep('datos')} className="flex-1 border border-zinc-200 rounded-lg py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">Editar</button>
                <button onClick={handleSave} disabled={saving}
                  className="flex-1 bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Agregar cuenta
                </button>
              </div>
            </div>
          )}

          {/* LISTO */}
          {step === 'listo' && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-lg font-bold text-zinc-900">¡Cuenta agregada!</h2>
              <p className="text-sm text-zinc-500">Tu cuenta de {selectedEmpresa?.nombre} ya está lista para pagar desde Poppins.</p>
              <div className="flex gap-3">
                <button onClick={() => { setStep('categoria'); setIdentificador(''); setCamposExtra({}); setAlias(''); setMontoEstimado(''); setSelectedEmpresa(null); }}
                  className="flex-1 border border-zinc-200 rounded-lg py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  Agregar otra
                </button>
                <button onClick={onClose} className="flex-1 bg-violet-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-violet-700">
                  Listo
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Progress */}
        {step !== 'intro' && step !== 'listo' && (
          <div className="px-6 pb-4 flex gap-1">
            {['categoria', 'empresa', 'datos', 'confirmar'].map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full transition ${['categoria', 'empresa', 'datos', 'confirmar'].indexOf(step) >= i ? 'bg-violet-500' : 'bg-zinc-200'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
