'use client';

import { useEffect, useState } from 'react';
import { FileText, Folder, Loader2, CheckCircle2, AlertCircle, Stethoscope, Wallet, Briefcase } from 'lucide-react';

interface Carpeta {
  contratos: any[];
  anexos: any[];
  finiquitos: any[];
  liquidaciones: any[];
  licencias: any[];
  documentos: any[];
}

interface Props {
  trabajadorId: string;
}

const fmtFecha = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('es-CL') : '—';
const fmt = (n: number) => '$ ' + (n ?? 0).toLocaleString('es-CL');

export default function CarpetaLaboralTab({ trabajadorId }: Props) {
  const [carpeta, setCarpeta] = useState<Carpeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/empresa/carpeta-trabajador/${trabajadorId}`)
      .then(r => r.json())
      .then(d => { if (d.ok) setCarpeta(d.carpeta); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [trabajadorId]);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-zinc-400" /></div>;
  }
  if (!carpeta) return <p className="text-sm text-zinc-500 text-center py-8">No se pudo cargar la carpeta.</p>;

  const total = carpeta.contratos.length + carpeta.anexos.length + carpeta.finiquitos.length
              + carpeta.liquidaciones.length + carpeta.licencias.length + carpeta.documentos.length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4 flex items-center gap-3">
        <Folder className="w-6 h-6 text-zinc-500" />
        <div>
          <p className="text-sm font-semibold text-zinc-800">Carpeta laboral digital</p>
          <p className="text-xs text-zinc-500">Cumplimiento Art. 9 CT · {total} documento(s)</p>
        </div>
      </div>

      {/* Contratos */}
      <Section title="Contratos" icon={Briefcase} count={carpeta.contratos.length}>
        {carpeta.contratos.map(c => (
          <Item key={c.id}
            label={`${c.tipo_contrato} · desde ${fmtFecha(c.fecha_inicio)}${c.fecha_termino ? ` hasta ${fmtFecha(c.fecha_termino)}` : ''}`}
            sub={`Estado: ${c.estado}`}
            firmas={{ empleador: c.fecha_firma_empleador, trabajador: c.fecha_firma_trabajador }}
            url={`/api/contratos/${c.id}/pdf`}
          />
        ))}
      </Section>

      {/* Anexos */}
      {carpeta.anexos.length > 0 && (
        <Section title="Anexos de contrato" icon={FileText} count={carpeta.anexos.length}>
          {carpeta.anexos.map(a => (
            <Item key={a.id}
              label={`Anexo N° ${a.numero_anexo} — ${a.motivo}`}
              sub={fmtFecha(a.fecha_anexo)}
              firmas={{ empleador: a.fecha_firma_empleador, trabajador: a.fecha_firma_trabajador }}
              url={`/api/contratos/anexos/${a.id}/pdf`}
            />
          ))}
        </Section>
      )}

      {/* Liquidaciones */}
      <Section title="Liquidaciones" icon={Wallet} count={carpeta.liquidaciones.length}>
        {carpeta.liquidaciones.map(l => (
          <Item key={l.id}
            label={`Período ${l.payroll_period} — ${fmt(l.net_pay)}`}
            sub={l.pagado_at ? `Pagado el ${fmtFecha(l.pagado_at)} vía ${l.medio_pago}` : 'Sin registro de pago'}
            firmas={{ trabajador: l.recibo_firmado_at }}
            url={`/api/payroll/liquidacion-pdf?period=${l.payroll_period}&workerId=${trabajadorId}`}
          />
        ))}
      </Section>

      {/* Licencias */}
      {carpeta.licencias.length > 0 && (
        <Section title="Licencias médicas" icon={Stethoscope} count={carpeta.licencias.length}>
          {carpeta.licencias.map(lic => (
            <div key={lic.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-zinc-800">
                  {lic.tipo} · {lic.periodo}
                </p>
                <p className="text-[11px] text-zinc-500">{fmtFecha(lic.fecha_inicio)} → {fmtFecha(lic.fecha_fin)}</p>
              </div>
              {lic.documento_url && (
                <a href={lic.documento_url} target="_blank" rel="noreferrer"
                  className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
                  {lic.documento_nombre ?? 'Ver documento'}
                </a>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Finiquitos */}
      {carpeta.finiquitos.length > 0 && (
        <Section title="Finiquitos" icon={FileText} count={carpeta.finiquitos.length}>
          {carpeta.finiquitos.map(f => (
            <Item key={f.id}
              label={`Finiquito ${f.causal} — ${fmt(f.total_finiquito)}`}
              sub={fmtFecha(f.fecha_termino)}
            />
          ))}
        </Section>
      )}

      {/* Documentos manuales */}
      {carpeta.documentos.length > 0 && (
        <Section title="Documentos adicionales" icon={FileText} count={carpeta.documentos.length}>
          {carpeta.documentos.map(d => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-zinc-800">{d.tipo}: {d.nombre}</p>
                <p className="text-[11px] text-zinc-500">{fmtFecha(d.created_at)}</p>
              </div>
              <a href={d.archivo_url} target="_blank" rel="noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50">
                Ver
              </a>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon: Icon, count, children }: { title: string; icon: any; count: number; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-zinc-500" />
        <h3 className="text-sm font-semibold text-zinc-800">{title} ({count})</h3>
      </div>
      <div className="space-y-2">
        {count === 0 ? <p className="text-xs text-zinc-400">Sin registros</p> : children}
      </div>
    </div>
  );
}

function Item({ label, sub, firmas, url }: { label: string; sub: string; firmas?: { empleador?: string | null; trabajador?: string | null }; url?: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2.5 gap-3">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-zinc-800 truncate">{label}</p>
        <p className="text-[11px] text-zinc-500">{sub}</p>
        {firmas && (
          <div className="flex gap-2 mt-1">
            {firmas.empleador !== undefined && (
              <FirmaTag rol="Empleador" fecha={firmas.empleador} />
            )}
            {firmas.trabajador !== undefined && (
              <FirmaTag rol="Trabajador" fecha={firmas.trabajador} />
            )}
          </div>
        )}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noreferrer"
          className="text-xs px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 shrink-0">
          PDF
        </a>
      )}
    </div>
  );
}

function FirmaTag({ rol, fecha }: { rol: string; fecha: string | null | undefined }) {
  const firmado = !!fecha;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full ${firmado ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
      {firmado ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
      {rol}: {firmado ? fmtFecha(fecha!) : 'pendiente'}
    </span>
  );
}
