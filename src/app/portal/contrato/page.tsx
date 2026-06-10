'use client';

import { useEffect, useState } from 'react';
import { FileText, CheckCircle2, Loader2, AlertCircle, Download, Shield } from 'lucide-react';

interface Contrato {
  id: string;
  sueldo_base: number;
  horas_semanales: number | null;
  cargo: string | null;
  tipo_contrato: string | null;
  fecha_inicio: string | null;
  fecha_termino: string | null;
  puertas_adentro: boolean;
  lugar_servicios: string | null;
  pdf_url: string | null;
  fecha_firma_empleador: string | null;
  fecha_firma_trabajador: string | null;
  estado: string;
}

interface Anexo {
  id: string;
  numero_anexo: number;
  fecha_anexo: string;
  motivo: string;
  cambios: Record<string, { antes: any; despues: any }>;
  pdf_url: string | null;
  fecha_firma_empleador: string | null;
  fecha_firma_trabajador: string | null;
}

const fmt = (n: number) => '$ ' + (n ?? 0).toLocaleString('es-CL');
const fmtFecha = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

export default function MiContratoPage() {
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [acepto, setAcepto] = useState(false);
  const [firmando, setFirmando] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    fetch('/api/portal/mi-contrato')
      .then(r => r.json())
      .then(d => {
        if (d.ok) { setContrato(d.contrato); setAnexos(d.anexos); }
        else setErr(d.error ?? 'Error al cargar');
      })
      .catch(() => setErr('Error de red'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  async function firmar() {
    if (!contrato || !acepto) return;
    setFirmando(true); setErr(null);
    try {
      const r = await fetch(`/api/contratos/${contrato.id}/firma`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: 'trabajador' }),
      });
      const d = await r.json();
      if (d.ok) reload();
      else setErr(d.error ?? 'No se pudo firmar');
    } catch (e: any) { setErr(e?.message ?? 'Error de red'); }
    finally { setFirmando(false); }
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[300px]">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!contrato) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-8 text-center">
          <FileText className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-zinc-600">No tienes un contrato activo registrado.</p>
        </div>
      </div>
    );
  }

  const firmadoPorMi = !!contrato.fecha_firma_trabajador;
  const firmadoPorEmpleador = !!contrato.fecha_firma_empleador;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-zinc-900">Mi Contrato</h1>
        <p className="text-sm text-zinc-500 mt-1">Contrato individual de trabajo</p>
      </div>

      {/* Resumen */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="Cargo" value={contrato.cargo ?? '—'} />
          <Field label="Tipo" value={contrato.tipo_contrato === 'plazo_fijo' ? 'Plazo fijo' : 'Indefinido'} />
          <Field label="Sueldo base" value={fmt(contrato.sueldo_base)} />
          <Field label="Horas/semana" value={`${contrato.horas_semanales ?? 45}h`} />
          <Field label="Inicio" value={fmtFecha(contrato.fecha_inicio)} />
          {contrato.fecha_termino && <Field label="Término" value={fmtFecha(contrato.fecha_termino)} />}
          <Field label="Modalidad" value={contrato.puertas_adentro ? 'Puertas adentro' : 'Puertas afuera'} />
          {contrato.lugar_servicios && <Field label="Lugar" value={contrato.lugar_servicios} />}
        </div>
      </div>

      {/* PDF + firma */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-500" />
          <h2 className="text-sm font-semibold text-zinc-800">Documento del contrato</h2>
        </div>

        <a href={`/api/contratos/${contrato.id}/pdf`} target="_blank" rel="noreferrer"
          className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-[#1a2e6e] text-[#1a2e6e] font-medium hover:bg-blue-50 transition">
          <Download className="w-4 h-4" />
          Ver / Descargar PDF
        </a>

        {/* Estado de firmas */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className={`rounded-lg p-3 ${firmadoPorEmpleador ? 'bg-emerald-50 border border-emerald-200' : 'bg-zinc-50 border border-zinc-200'}`}>
            <div className="flex items-center gap-1.5">
              {firmadoPorEmpleador ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-zinc-400" />}
              <span className="font-semibold text-zinc-800">Empleador</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {firmadoPorEmpleador ? `Firmado el ${fmtFecha(contrato.fecha_firma_empleador)}` : 'Pendiente'}
            </p>
          </div>
          <div className={`rounded-lg p-3 ${firmadoPorMi ? 'bg-emerald-50 border border-emerald-200' : 'bg-zinc-50 border border-zinc-200'}`}>
            <div className="flex items-center gap-1.5">
              {firmadoPorMi ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
              <span className="font-semibold text-zinc-800">Yo (trabajador/a)</span>
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {firmadoPorMi ? `Firmado el ${fmtFecha(contrato.fecha_firma_trabajador)}` : 'Pendiente — firma abajo'}
            </p>
          </div>
        </div>

        {/* Firma trabajador */}
        {!firmadoPorMi && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-900 leading-snug">
                Lee con atención el contrato antes de firmar. Tu firma electrónica registra la fecha,
                tu dirección IP y dispositivo como prueba de aceptación.
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)} className="mt-1" />
              <span className="text-zinc-800">
                He leído el contrato y acepto sus términos. Confirmo que mis datos son correctos.
              </span>
            </label>
            <button
              onClick={firmar}
              disabled={!acepto || firmando}
              className="w-full sm:w-auto text-sm px-5 py-2.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {firmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Firmar electrónicamente
            </button>
          </div>
        )}

        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{err}</div>}
      </div>

      {/* Anexos */}
      {anexos.length > 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-semibold text-zinc-800">Anexos del contrato ({anexos.length})</h2>
          </div>
          <div className="space-y-2">
            {anexos.map(a => (
              <div key={a.id} className="rounded-xl border border-zinc-200 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Anexo N° {a.numero_anexo} — {a.motivo}</p>
                  <p className="text-[11px] text-zinc-500">{fmtFecha(a.fecha_anexo)}</p>
                </div>
                <a href={`/api/contratos/anexos/${a.id}/pdf`} target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
                  Ver PDF
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-zinc-400 font-semibold">{label}</p>
      <p className="text-sm text-zinc-800 mt-0.5">{value}</p>
    </div>
  );
}
