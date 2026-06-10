'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, Shield } from 'lucide-react';

interface AfpRow { id: number; codigo: string; activa: boolean }
interface IsapreRow { id: number; codigo: string; tipo: 'fonasa' | 'isapre'; activa: boolean }

interface Props {
  trabajadorId: string;
  trabajadorNombre: string;
  initial: {
    afp_id: number | null;
    salud_id: number | null;
    salud_tipo: string | null;
    salud_plan_uf: number | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

const AFP_LABEL: Record<string, string> = {
  capital: 'AFP Capital', cuprum: 'AFP Cuprum', habitat: 'AFP Hábitat',
  modelo: 'AFP Modelo', planvital: 'AFP PlanVital', provida: 'AFP Provida', uno: 'AFP Uno',
};

const ISAPRE_LABEL: Record<string, string> = {
  banmedica: 'Banmédica', colmena: 'Colmena', consalud: 'Consalud',
  'cruz blanca': 'Cruz Blanca', 'nueva masvida': 'Nueva MásVida',
  'vida tres': 'Vida Tres', esencial: 'Esencial', fonasa: 'FONASA',
};

export default function EditPrevisionModal({
  trabajadorId, trabajadorNombre, initial, onClose, onSaved,
}: Props) {
  const [afps, setAfps] = useState<AfpRow[]>([]);
  const [isapres, setIsapres] = useState<IsapreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [afpId, setAfpId] = useState<number | ''>(initial.afp_id ?? '');
  const [tipo, setTipo]   = useState<'fonasa' | 'isapre'>(
    (initial.salud_tipo as 'fonasa' | 'isapre') ?? 'fonasa',
  );
  const [saludId, setSaludId] = useState<number | ''>(initial.salud_id ?? '');
  const [planUf, setPlanUf]   = useState<string>(initial.salud_plan_uf ? String(initial.salud_plan_uf) : '');

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/payroll/catalogos').then(x => x.json()).catch(() => ({}));
        if (r?.ok) {
          setAfps(r.afps ?? []);
          setIsapres(r.isapres ?? []);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  // Default Fonasa salud_id = 13 cuando tipo=fonasa
  useEffect(() => {
    if (tipo === 'fonasa') setSaludId(13);
    else if (saludId === 13) setSaludId('');
  }, [tipo]);

  async function handleSave() {
    setSaving(true); setErr(null);
    try {
      const r = await fetch('/api/payroll/trabajadores/prevision', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trabajador_id: trabajadorId,
          afp_id: afpId || null,
          salud_id: saludId || null,
          salud_tipo: tipo,
          salud_plan_uf: tipo === 'isapre' ? Number(planUf) : null,
        }),
      });
      const d = await r.json();
      if (d.ok) { onSaved(); onClose(); }
      else setErr(d.error ?? 'Error al guardar');
    } catch (e: any) {
      setErr(e?.message ?? 'Error de red');
    } finally { setSaving(false); }
  }

  const isapresActivas = isapres.filter(i => i.tipo === 'isapre' && i.activa);
  const afpsActivas = afps.filter(a => a.activa);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md pointer-events-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-800">Editar previsión — {trabajadorNombre}</h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            {loading ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">AFP</label>
                  <select
                    value={afpId}
                    onChange={e => setAfpId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2 focus:border-[#1a2e6e] focus:outline-none"
                  >
                    <option value="">— Selecciona —</option>
                    {afpsActivas.map(a => (
                      <option key={a.id} value={a.id}>{AFP_LABEL[a.codigo] ?? a.codigo}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 block mb-1">Tipo de salud</label>
                  <div className="flex gap-2">
                    {(['fonasa', 'isapre'] as const).map(t => (
                      <button
                        key={t}
                        onClick={() => setTipo(t)}
                        className={`flex-1 text-sm px-3 py-2 rounded-lg border font-medium transition ${
                          tipo === t
                            ? 'border-[#1a2e6e] bg-[#1a2e6e]/5 text-[#1a2e6e]'
                            : 'border-zinc-300 text-zinc-600 hover:bg-zinc-50'
                        }`}
                      >
                        {t === 'fonasa' ? 'FONASA' : 'Isapre'}
                      </button>
                    ))}
                  </div>
                </div>

                {tipo === 'isapre' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">Isapre</label>
                      <select
                        value={saludId}
                        onChange={e => setSaludId(e.target.value ? Number(e.target.value) : '')}
                        className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2 focus:border-[#1a2e6e] focus:outline-none"
                      >
                        <option value="">— Selecciona —</option>
                        {isapresActivas.map(i => (
                          <option key={i.id} value={i.id}>{ISAPRE_LABEL[i.codigo] ?? i.codigo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-zinc-700 block mb-1">
                        Plan pactado (UF)
                      </label>
                      <input
                        type="number" step="0.01" min="0"
                        value={planUf}
                        onChange={e => setPlanUf(e.target.value)}
                        placeholder="Ej: 2.5"
                        className="w-full text-sm rounded-lg border border-zinc-300 px-3 py-2 focus:border-[#1a2e6e] focus:outline-none"
                      />
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Valor mensual en UF del plan completo (no solo el adicional).
                      </p>
                    </div>
                  </>
                )}

                {err && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                    {err}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="text-sm px-4 py-2 rounded-lg bg-[#1a2e6e] text-white font-medium hover:bg-[#142358] disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
