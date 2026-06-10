'use client';

import { useEffect, useState } from 'react';
import { FileText, Loader2, CheckCircle2, AlertCircle, Pencil, Trash2, Download } from 'lucide-react';

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

interface Props {
  contratoId: string;
  pdfUrl?: string | null;
  fechaFirmaEmpleador?: string | null;
  fechaFirmaTrabajador?: string | null;
  onEditar: () => void;
  onTerminar: () => void;
  contratoActivo: boolean;
}

const fmtFecha = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-CL') : '—';

export default function ContratoAnexosTab({ contratoId, pdfUrl, fechaFirmaEmpleador, fechaFirmaTrabajador, onEditar, onTerminar, contratoActivo }: Props) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [firmando, setFirmando] = useState(false);

  useEffect(() => {
    fetch(`/api/contratos/${contratoId}/anexos-list`).then(r => r.json()).then(d => {
      if (d.ok) setAnexos(d.anexos);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [contratoId]);

  async function firmarEmpleador() {
    setFirmando(true);
    try {
      await fetch(`/api/contratos/${contratoId}/firma`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rol: 'empleador' }),
      });
      window.location.reload();
    } finally { setFirmando(false); }
  }

  return (
    <div className="space-y-4">
      {/* Contrato principal */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-500" />
            <h3 className="text-sm font-semibold text-zinc-800">Contrato individual</h3>
          </div>
          <div className="flex gap-2">
            <a href={`/api/contratos/${contratoId}/pdf`} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
              <Download className="w-3 h-3" /> PDF
            </a>
            {contratoActivo && (
              <button onClick={onEditar}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
                <Pencil className="w-3 h-3" /> Editar
              </button>
            )}
            {contratoActivo && (
              <button onClick={onTerminar}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-700 hover:bg-red-50">
                <Trash2 className="w-3 h-3" /> Terminar
              </button>
            )}
          </div>
        </div>

        {/* Estado de firmas */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <FirmaPill rol="Empleador" fecha={fechaFirmaEmpleador ?? null} />
          <FirmaPill rol="Trabajador(a)" fecha={fechaFirmaTrabajador ?? null} />
        </div>

        {!fechaFirmaEmpleador && contratoActivo && (
          <button onClick={firmarEmpleador} disabled={firmando}
            className="w-full text-sm px-4 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {firmando ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Firmar contrato como empleador
          </button>
        )}
      </div>

      {/* Anexos */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-500" />
          <h3 className="text-sm font-semibold text-zinc-800">Anexos ({anexos.length})</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-zinc-400" /></div>
        ) : anexos.length === 0 ? (
          <p className="text-xs text-zinc-400 py-2">
            Sin anexos. Se crean automáticamente cuando editas sueldo, jornada, cargo u otros campos legales.
          </p>
        ) : (
          <div className="space-y-2">
            {anexos.map(a => (
              <div key={a.id} className="rounded-xl border border-zinc-200 p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-800">Anexo N° {a.numero_anexo} — {a.motivo.replace('_', ' ')}</p>
                  <p className="text-[11px] text-zinc-500">
                    {fmtFecha(a.fecha_anexo)} · {Object.keys(a.cambios).length} cambio(s)
                  </p>
                </div>
                <a href={`/api/contratos/anexos/${a.id}/pdf`} target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
                  Ver PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function FirmaPill({ rol, fecha }: { rol: string; fecha: string | null }) {
  const firmado = !!fecha;
  return (
    <div className={`rounded-lg p-2.5 ${firmado ? 'bg-emerald-50 border border-emerald-200' : 'bg-zinc-50 border border-zinc-200'}`}>
      <div className="flex items-center gap-1.5">
        {firmado ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-zinc-400" />}
        <span className="text-[11px] font-semibold text-zinc-800">{rol}</span>
      </div>
      <p className="text-[10px] text-zinc-500 mt-0.5">
        {firmado ? `Firmado ${fmtFecha(fecha)}` : 'Pendiente'}
      </p>
    </div>
  );
}
