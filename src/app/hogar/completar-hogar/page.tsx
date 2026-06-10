'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Check, Home, Loader2, AlertCircle, ChevronRight,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/client';

interface DatosHogar {
  tipo_vivienda: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  metros_construidos: string;
  pisos: string;
  dormitorios: string;
  banos: string;
  tiene_piscina: boolean;
  tiene_jardin: boolean;
  estacionamientos: string;
  observaciones: string;
}

const TIPOS_VIVIENDA = [
  { value: 'casa', label: '🏠 Casa' },
  { value: 'departamento', label: '🏢 Departamento' },
  { value: 'parcela', label: '🌳 Parcela' },
];

export default function CompletarHogarPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [data, setData] = useState<DatosHogar>({
    tipo_vivienda: '',
    direccion: '',
    comuna: '',
    ciudad: '',
    metros_construidos: '',
    pisos: '1',
    dormitorios: '',
    banos: '',
    tiene_piscina: false,
    tiene_jardin: false,
    estacionamientos: '0',
    observaciones: '',
  });

  // Pre-fill address from employer data
  useEffect(() => {
    if (!profile?.empleador_id) return;
    const fetchEmpleador = async () => {
      const { data: emp } = await supabase
        .from('empleadores')
        .select('direccion, comuna, ciudad')
        .eq('id', profile.empleador_id)
        .single();
      if (emp) {
        setData(prev => ({
          ...prev,
          direccion: emp.direccion || '',
          comuna: emp.comuna || '',
          ciudad: emp.ciudad || '',
        }));
      }
    };
    fetchEmpleador();
  }, [profile, supabase]);

  // Check if already completed
  useEffect(() => {
    if (!profile?.empleador_id) return;
    const check = async () => {
      const { data: existing } = await supabase
        .from('datos_hogar')
        .select('completado')
        .eq('empleador_id', profile.empleador_id)
        .single();
      if (existing?.completado) setSuccess(true);
    };
    check();
  }, [profile, supabase]);

  const handleSubmit = async () => {
    if (!data.tipo_vivienda || !data.direccion || !data.comuna || !data.dormitorios || !data.banos) {
      setError('Por favor completa los campos obligatorios.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const empleadorId = profile?.empleador_id;
      if (!empleadorId) throw new Error('No se encontró tu cuenta de empleador.');

      const { error: dbErr } = await supabase
        .from('datos_hogar')
        .upsert({
          empleador_id: empleadorId,
          tipo_vivienda: data.tipo_vivienda,
          direccion: data.direccion,
          comuna: data.comuna,
          ciudad: data.ciudad,
          metros_construidos: parseInt(data.metros_construidos) || null,
          pisos: parseInt(data.pisos) || 1,
          dormitorios: parseInt(data.dormitorios) || null,
          banos: parseInt(data.banos) || null,
          tiene_piscina: data.tiene_piscina,
          tiene_jardin: data.tiene_jardin,
          estacionamientos: parseInt(data.estacionamientos) || 0,
          observaciones: data.observaciones || null,
          completado: true,
          completado_at: new Date().toISOString(),
        }, { onConflict: 'empleador_id' });

      if (dbErr) throw dbErr;
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Error al guardar.');
    } finally {
      setLoading(false);
    }
  };

  const f = (field: keyof DatosHogar) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData(prev => ({ ...prev, [field]: e.target.value }));

  if (success) {
    return (
      <div className="min-h-screen bg-[#fcfdfe] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
            <Check className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-3xl font-black text-[#2D2D90] mb-4">¡Datos registrados!</h1>
          <p className="text-zinc-500 mb-8">Los datos de tu hogar han sido guardados correctamente. Tu ejecutivo de cuentas los revisará.</p>
          <button
            onClick={() => router.push('/hogar')}
            className="flex items-center gap-3 mx-auto bg-[#2D2D90] hover:bg-[#1E1B4B] text-white px-8 py-4 rounded-full font-bold transition-all shadow-xl hover:scale-105"
          >
            Ir a mi panel <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fcfdfe] relative overflow-hidden font-outfit">
      <div className="absolute top-0 right-0 w-1/3 h-full bg-[#2D2D90]/[0.02] -skew-x-12 origin-top" />

      <header className="px-8 py-6 flex items-center gap-2 relative z-20">
        <div className="w-10 h-10 bg-[#2D2D90] rounded-xl flex items-center justify-center text-white font-black text-xl">P</div>
        <span className="text-2xl font-black text-[#2D2D90] tracking-tighter">Poppins</span>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12 relative z-10">
        <div className="bg-white rounded-3xl shadow-2xl shadow-navy-900/5 border border-zinc-100 p-8 md:p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5">
            <Home className="w-24 h-24 text-[#2D2D90]" />
          </div>

          <h2 className="text-2xl font-black text-[#2D2D90] mb-2">Datos de tu Hogar</h2>
          <p className="text-zinc-500 mb-8">Esta información nos ayuda a dimensionar el servicio ideal para ti.</p>

          {/* Tipo vivienda */}
          <div className="mb-6">
            <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1 mb-3 block">Tipo de Vivienda</label>
            <div className="flex flex-wrap gap-3">
              {TIPOS_VIVIENDA.map(t => (
                <button
                  key={t.value}
                  onClick={() => setData(prev => ({ ...prev, tipo_vivienda: t.value }))}
                  className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${
                    data.tipo_vivienda === t.value
                      ? 'bg-[#2D2D90] text-white'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dirección */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">Dirección</label>
              <input type="text" value={data.direccion} onChange={f('direccion')} className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C]" placeholder="Av. Providencia 1234" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">Comuna</label>
              <input type="text" value={data.comuna} onChange={f('comuna')} className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C]" placeholder="Providencia" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">Ciudad</label>
              <input type="text" value={data.ciudad} onChange={f('ciudad')} className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C]" placeholder="Santiago" />
            </div>
          </div>

          {/* Dimensiones */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">m² Construidos</label>
              <input type="number" value={data.metros_construidos} onChange={f('metros_construidos')} className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C]" placeholder="120" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">Pisos</label>
              <input type="number" value={data.pisos} onChange={f('pisos')} className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C]" placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">Dormitorios</label>
              <input type="number" value={data.dormitorios} onChange={f('dormitorios')} className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C]" placeholder="3" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">Baños</label>
              <input type="number" value={data.banos} onChange={f('banos')} className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C]" placeholder="2" />
            </div>
          </div>

          {/* Extras */}
          <div className="flex flex-wrap gap-4 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.tiene_piscina} onChange={(e) => setData(prev => ({ ...prev, tiene_piscina: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-[#E91E8C] focus:ring-[#E91E8C]" />
              <span className="text-sm text-zinc-700">Piscina</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={data.tiene_jardin} onChange={(e) => setData(prev => ({ ...prev, tiene_jardin: e.target.checked }))} className="h-4 w-4 rounded border-zinc-300 text-[#E91E8C] focus:ring-[#E91E8C]" />
              <span className="text-sm text-zinc-700">Jardín</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-zinc-700">Estacionamientos:</label>
              <input type="number" value={data.estacionamientos} onChange={f('estacionamientos')} className="w-16 bg-zinc-50 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-[#E91E8C] text-center" />
            </div>
          </div>

          {/* Observaciones */}
          <div className="mb-6 space-y-1.5">
            <label className="text-xs font-bold text-[#2D2D90] uppercase tracking-wider ml-1">Observaciones (opcional)</label>
            <textarea
              value={data.observaciones}
              onChange={f('observaciones')}
              className="w-full bg-zinc-50 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-[#E91E8C] min-h-[80px] resize-none"
              placeholder="Algo que debamos saber sobre tu hogar..."
            />
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6 flex items-center gap-3 text-red-600 text-sm bg-red-50 p-4 rounded-2xl border border-red-100">
              <AlertCircle className="w-5 h-5 shrink-0" /> {error}
            </motion.div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-[#E91E8C] hover:bg-[#D81B7D] text-white px-10 py-4 rounded-full font-bold shadow-lg shadow-pink-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Guardar Datos del Hogar
          </button>
        </div>
      </main>
    </div>
  );
}
