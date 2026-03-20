'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { FileText, Download, PenTool, CheckCircle, X } from 'lucide-react';
import type { Payroll } from '@/types/database';

const WORKER_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';

const fmt = (n: number) => '$' + n.toLocaleString('es-CL');

function formatPeriodo(periodo: string): string {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const [year, month] = periodo.split('-');
  return `${meses[parseInt(month, 10) - 1]} ${year}`;
}

function LiquidacionDetail({ liq, onClose }: { liq: Payroll; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-bold">Liquidacion de Sueldo</div>
              <div className="text-emerald-100 text-sm">{formatPeriodo(liq.periodo)}</div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3 text-sm">
          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide">Haberes</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Sueldo Base</span><span className="font-medium">{fmt(liq.sueldo_base)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Horas Extra</span><span className="font-medium">{fmt(liq.monto_horas_extra)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Bonos</span><span className="font-medium">{fmt(liq.bonos)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Gratificacion</span><span className="font-medium">{fmt(liq.gratificacion)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Colacion</span><span className="font-medium">{fmt(liq.colacion)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Movilizacion</span><span className="font-medium">{fmt(liq.movilizacion)}</span></div>
            {liq.otros_haberes > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Otros Haberes</span><span className="font-medium">{fmt(liq.otros_haberes)}</span></div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
              <span>Total Haberes</span><span>{fmt(liq.total_haberes)}</span>
            </div>
          </div>

          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mt-3">Descuentos</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">AFP</span><span className="font-medium text-red-500">-{fmt(liq.desc_afp)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Salud</span><span className="font-medium text-red-500">-{fmt(liq.desc_salud)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Cesantia</span><span className="font-medium text-red-500">-{fmt(liq.desc_cesantia)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Impuesto Unico</span><span className="font-medium text-red-500">-{fmt(liq.impuesto_unico)}</span></div>
            {liq.otros_descuentos > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Otros Descuentos</span><span className="font-medium text-red-500">-{fmt(liq.otros_descuentos)}</span></div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
              <span>Total Descuentos</span><span className="text-red-500">-{fmt(liq.total_descuentos)}</span>
            </div>
          </div>

          <div className="flex justify-between border-t-2 border-gray-200 pt-2 text-base font-bold">
            <span>Liquido a Pagar</span>
            <span className="text-emerald-600">{fmt(liq.sueldo_liquido)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FirmaModal({ liq, onClose, onFirma }: { liq: Payroll; onClose: () => void; onFirma: () => void }) {
  const [checked, setChecked] = useState(false);
  const [firmado, setFirmado] = useState(false);

  const handleFirmar = async () => {
    const supabase = createClient();
    await supabase
      .from('liquidaciones')
      .update({ estado: 'aprobado' as const })
      .eq('id', liq.id);
    setFirmado(true);
    setTimeout(() => {
      onFirma();
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-[#1B1564] to-[#3730A3] p-5 text-white">
          <div className="flex justify-between items-start">
            <div>
              <div className="text-lg font-bold">Firma Digital</div>
              <div className="text-white/60 text-sm">{formatPeriodo(liq.periodo)}</div>
            </div>
            <button onClick={onClose} className="text-white/70 hover:text-white">
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {firmado ? (
            <div className="text-center py-6">
              <CheckCircle size={48} className="text-emerald-500 mx-auto mb-3" />
              <div className="font-semibold text-gray-900">Liquidacion firmada exitosamente</div>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Al firmar, confirma que ha recibido y revisado su liquidacion de sueldo correspondiente al periodo <strong>{formatPeriodo(liq.periodo)}</strong>.
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={e => setChecked(e.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                />
                <span className="text-sm text-gray-700">He leido y acepto la liquidacion</span>
              </label>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg bg-gray-100 text-sm font-medium text-gray-600 hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleFirmar}
                  disabled={!checked}
                  className="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Firmar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function downloadLiquidacionPDF(liq: Payroll) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  printWindow.document.write(`
    <html>
      <head><title>Liquidacion ${liq.periodo}</title>
      <style>
        body{font-family:Arial,sans-serif;padding:40px;color:#333;max-width:600px;margin:0 auto}
        h1{font-size:20px;margin-bottom:4px}
        h2{font-size:14px;color:#666;margin-bottom:20px}
        .section{font-size:12px;font-weight:bold;color:#888;text-transform:uppercase;letter-spacing:1px;margin:16px 0 8px}
        .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f0f0f0;font-size:14px}
        .label{color:#888}.value{font-weight:600}
        .neg{color:#dc2626}
        .total{border-top:2px solid #333;font-size:16px;font-weight:bold;padding-top:10px;margin-top:10px}
        .green{color:#059669}
      </style>
      </head>
      <body>
        <h1>Liquidacion de Sueldo</h1>
        <h2>${formatPeriodo(liq.periodo)}</h2>
        <div class="section">Haberes</div>
        <div class="row"><span class="label">Sueldo Base</span><span class="value">$${liq.sueldo_base.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Horas Extra</span><span class="value">$${liq.monto_horas_extra.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Bonos</span><span class="value">$${liq.bonos.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Gratificacion</span><span class="value">$${liq.gratificacion.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Total Haberes</span><span class="value">$${liq.total_haberes.toLocaleString('es-CL')}</span></div>
        <div class="section">Descuentos</div>
        <div class="row"><span class="label">AFP</span><span class="value neg">-$${liq.desc_afp.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Salud</span><span class="value neg">-$${liq.desc_salud.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Cesantia</span><span class="value neg">-$${liq.desc_cesantia.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Impuesto Unico</span><span class="value neg">-$${liq.impuesto_unico.toLocaleString('es-CL')}</span></div>
        <div class="row"><span class="label">Total Descuentos</span><span class="value neg">-$${liq.total_descuentos.toLocaleString('es-CL')}</span></div>
        <div class="row total"><span>Liquido a Pagar</span><span class="green">$${liq.sueldo_liquido.toLocaleString('es-CL')}</span></div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.print();
}

export default function MisLiquidacionesPage() {
  const [payroll, setPayroll] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Payroll | null>(null);
  const [firmaTarget, setFirmaTarget] = useState<Payroll | null>(null);

  const loadPayroll = async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from('liquidaciones')
      .select('*')
      .eq('trabajador_id', WORKER_ID)
      .order('periodo', { ascending: false });
    setPayroll(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadPayroll();
  }, []);

  const latest = payroll[0];
  const history = payroll.slice(1);

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Mis Liquidaciones</h1>
        <p className="text-sm text-gray-500 mt-1">Historial de remuneraciones</p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-400">Cargando liquidaciones...</div>
      ) : payroll.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
          <FileText size={48} className="text-gray-300 mx-auto mb-3" />
          <div className="font-semibold text-gray-500">No hay liquidaciones disponibles</div>
        </div>
      ) : (
        <>
          {/* Current Month Card */}
          {latest && (
            <div className="bg-white rounded-xl shadow-sm border-2 border-emerald-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="text-xl font-bold text-gray-900">{formatPeriodo(latest.periodo)}</div>
                    <div className="text-3xl font-bold text-emerald-600 mt-1">{fmt(latest.sueldo_liquido)}</div>
                    <div className="flex gap-4 mt-3 text-sm text-gray-500">
                      <span>Haberes <strong className="text-gray-700">{fmt(latest.total_haberes)}</strong></span>
                      <span>Descuentos <strong className="text-red-500">-{fmt(latest.total_descuentos)}</strong></span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelected(latest)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      <FileText size={14} />
                      Ver Detalle
                    </button>
                    <button
                      onClick={() => downloadLiquidacionPDF(latest)}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Download size={14} />
                      Descargar PDF
                    </button>
                    {latest.estado !== 'aprobado' && latest.estado !== 'pagado' && (
                      <button
                        onClick={() => setFirmaTarget(latest)}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-lg text-sm font-medium text-white hover:bg-emerald-600 transition"
                      >
                        <PenTool size={14} />
                        Firmar Digitalmente
                      </button>
                    )}
                    {(latest.estado === 'aprobado' || latest.estado === 'pagado') && (
                      <span className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-emerald-700 bg-emerald-100 rounded-lg">
                        <CheckCircle size={14} />
                        Firmada
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* History Table */}
          {history.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Historial</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      <th className="px-5 py-3">Periodo</th>
                      <th className="px-3 py-3 text-right">Sueldo Base</th>
                      <th className="px-3 py-3 text-right">Haberes</th>
                      <th className="px-3 py-3 text-right">Descuentos</th>
                      <th className="px-3 py-3 text-right">Liquido</th>
                      <th className="px-3 py-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(liq => (
                      <tr key={liq.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                        <td className="px-5 py-3 font-medium text-gray-800">{formatPeriodo(liq.periodo)}</td>
                        <td className="px-3 py-3 text-right">{fmt(liq.sueldo_base)}</td>
                        <td className="px-3 py-3 text-right">{fmt(liq.total_haberes)}</td>
                        <td className="px-3 py-3 text-right text-red-500">-{fmt(liq.total_descuentos)}</td>
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">{fmt(liq.sueldo_liquido)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelected(liq)}
                              className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => downloadLiquidacionPDF(liq)}
                              className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                            >
                              PDF
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {selected && <LiquidacionDetail liq={selected} onClose={() => setSelected(null)} />}

      {/* Firma Modal */}
      {firmaTarget && (
        <FirmaModal
          liq={firmaTarget}
          onClose={() => setFirmaTarget(null)}
          onFirma={() => loadPayroll()}
        />
      )}
    </div>
  );
}
