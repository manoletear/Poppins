'use client';

import { useState } from 'react';
import { X, Loader2, User } from 'lucide-react';

interface Props {
  trabajadorId: string;
  trabajadorNombre: string;
  initial: {
    email?: string | null;
    telefono?: string | null;
    direccion?: string | null;
    comuna?: string | null;
    region?: string | null;
    fecha_nacimiento?: string | null;
    sexo?: string | null;
    estado_civil?: string | null;
    nacionalidad?: string | null;
    banco?: string | null;
    tipo_cuenta?: string | null;
    numero_cuenta?: string | null;
    payment_method?: string | null;
  };
  onClose: () => void;
  onSaved: () => void;
}

const BANCOS = [
  'BancoEstado','Banco de Chile','Banco BCI','Banco Santander','Banco Itaú',
  'Banco Scotiabank','Banco Falabella','Banco Ripley','Banco Security',
  'Banco Internacional','Banco BICE','Banco Consorcio','Banco Coopeuch','Otro',
];

const TIPOS_CUENTA = [
  { value: 'corriente',    label: 'Cuenta corriente' },
  { value: 'vista',        label: 'Cuenta vista' },
  { value: 'ahorro',       label: 'Cuenta de ahorro' },
  { value: 'rut',          label: 'CuentaRUT' },
];

export default function EditDatosPersonalesModal({
  trabajadorId, trabajadorNombre, initial, onClose, onSaved,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [faltantes, setFaltantes] = useState<string[]>([]);

  const [email, setEmail]                       = useState(initial.email ?? '');
  const [telefono, setTelefono]                 = useState(initial.telefono ?? '');
  const [direccion, setDireccion]               = useState(initial.direccion ?? '');
  const [comuna, setComuna]                     = useState(initial.comuna ?? '');
  const [region, setRegion]                     = useState(initial.region ?? '');
  const [fechaNacimiento, setFechaNacimiento]   = useState(initial.fecha_nacimiento ?? '');
  const [paymentMethod, setPaymentMethod]       = useState(initial.payment_method ?? 'transferencia');
  const [banco, setBanco]                       = useState(initial.banco ?? '');
  const [tipoCuenta, setTipoCuenta]             = useState(initial.tipo_cuenta ?? '');
  const [numeroCuenta, setNumeroCuenta]         = useState(initial.numero_cuenta ?? '');

  async function handleSave() {
    setSaving(true); setErr(null); setFaltantes([]);
    try {
      const r = await fetch(`/api/empresa/trabajadores/${trabajadorId}/datos-personales`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email, telefono, direccion, comuna, region,
          fecha_nacimiento: fechaNacimiento,
          payment_method: paymentMethod,
          banco: paymentMethod === 'transferencia' ? banco        : null,
          tipo_cuenta:    paymentMethod === 'transferencia' ? tipoCuenta   : null,
          numero_cuenta:  paymentMethod === 'transferencia' ? numeroCuenta : null,
        }),
      });
      const d = await r.json();
      if (d.ok) { onSaved(); onClose(); return; }
      if (d.error === 'campos_faltantes') setFaltantes(d.faltantes ?? []);
      setErr(d.detail ?? d.error ?? 'Error al guardar');
    } catch (e: any) {
      setErr(e?.message ?? 'Error de red');
    } finally { setSaving(false); }
  }

  const showCuentaBancaria = paymentMethod === 'transferencia';

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl pointer-events-auto max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white z-10">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-800">Editar datos personales — {trabajadorNombre}</h2>
            </div>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email *">
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  className="input" placeholder="trabajador@correo.cl" />
              </Field>
              <Field label="Teléfono">
                <input type="tel" value={telefono} onChange={e => setTelefono(e.target.value)}
                  className="input" placeholder="+56 9 1234 5678" />
              </Field>
            </div>

            <Field label="Dirección *">
              <input type="text" value={direccion} onChange={e => setDireccion(e.target.value)}
                className="input" placeholder="Calle, número, depto." />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Comuna *">
                <input type="text" value={comuna} onChange={e => setComuna(e.target.value)}
                  className="input" placeholder="Las Condes" />
              </Field>
              <Field label="Región">
                <input type="text" value={region} onChange={e => setRegion(e.target.value)}
                  className="input" placeholder="Metropolitana" />
              </Field>
            </div>

            <Field label="Fecha de nacimiento *">
              <input type="date" value={fechaNacimiento} onChange={e => setFechaNacimiento(e.target.value)}
                className="input" />
            </Field>

            <div className="pt-3 border-t border-zinc-200">
              <h3 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2">Pago de remuneración</h3>
              <Field label="Forma de pago">
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="input">
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="efectivo">Efectivo</option>
                  <option value="cheque">Cheque</option>
                </select>
              </Field>

              {showCuentaBancaria && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Field label="Banco *">
                    <select value={banco} onChange={e => setBanco(e.target.value)} className="input">
                      <option value="">— Selecciona —</option>
                      {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </Field>
                  <Field label="Tipo de cuenta *">
                    <select value={tipoCuenta} onChange={e => setTipoCuenta(e.target.value)} className="input">
                      <option value="">— Selecciona —</option>
                      {TIPOS_CUENTA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </Field>
                  <div className="col-span-2">
                    <Field label="Número de cuenta *">
                      <input type="text" value={numeroCuenta} onChange={e => setNumeroCuenta(e.target.value)}
                        className="input" placeholder="0000000000" />
                    </Field>
                  </div>
                </div>
              )}
            </div>

            {faltantes.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
                <div className="font-semibold mb-1">Faltan datos legales obligatorios:</div>
                <ul className="list-disc pl-4">
                  {faltantes.map(f => <li key={f}>{f}</li>)}
                </ul>
              </div>
            )}
            {err && faltantes.length === 0 && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>
            )}
          </div>

          <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2 sticky bottom-0 bg-white">
            <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-[#1a2e6e] text-white hover:bg-[#1a2e6e]/90 disabled:opacity-50 flex items-center gap-1.5">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          border: 1px solid #d4d4d8;
          padding: 0.5rem 0.75rem;
          outline: none;
        }
        .input:focus { border-color: #1a2e6e; }
      `}</style>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-zinc-700 block mb-1">{label}</label>
      {children}
    </div>
  );
}
