'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import { FileText, Download, PenTool, CheckCircle, X, Eye } from 'lucide-react';


// Matches actual `liquidaciones` table columns
interface Liquidacion {
  id: string;
  trabajador_id: string;
  periodo: string;
  sueldo_base: number;
  gratificacion_legal: number;
  horas_extras_50: number;
  horas_extras_100: number;
  bonos_imponibles: number;
  colacion: number;
  movilizacion: number;
  viatico: number;
  comisiones: number;
  total_haberes: number;
  total_haberes_imponibles: number;
  total_haberes_no_imponibles: number;
  afp_trabajador: number;
  salud_trabajador: number;
  salud_adicional: number;
  afc_trabajador: number;
  impuesto_unico: number;
  total_descuentos: number;
  liquido_pagar: number;
  asignacion_familiar: number;
  estado: string;
  dias_trabajados: number;
  created_at: string;
  pdf_url: string | null;
  [key: string]: unknown;
}

const fmt = (n: number) => '$' + (n ?? 0).toLocaleString('es-CL');

function formatPeriodo(periodo: string): string {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const [year, month] = periodo.split('-');
  return `${meses[parseInt(month, 10) - 1]} ${year}`;
}

function LiquidacionDetail({ liq, onClose }: { liq: Liquidacion; onClose: () => void }) {
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
            <div className="flex justify-between"><span className="text-gray-500">Gratificacion Legal</span><span className="font-medium">{fmt(liq.gratificacion_legal)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Horas Extra 50%</span><span className="font-medium">{fmt(liq.horas_extras_50)}</span></div>
            {(liq.horas_extras_100 ?? 0) > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Horas Extra 100%</span><span className="font-medium">{fmt(liq.horas_extras_100)}</span></div>
            )}
            <div className="flex justify-between"><span className="text-gray-500">Bonos Imponibles</span><span className="font-medium">{fmt(liq.bonos_imponibles)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Colacion</span><span className="font-medium">{fmt(liq.colacion)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Movilizacion</span><span className="font-medium">{fmt(liq.movilizacion)}</span></div>
            {(liq.comisiones ?? 0) > 0 && (
              <div className="flex justify-between"><span className="text-gray-500">Comisiones</span><span className="font-medium">{fmt(liq.comisiones)}</span></div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
              <span>Total Haberes</span><span>{fmt(liq.total_haberes)}</span>
            </div>
          </div>

          <div className="font-semibold text-gray-700 text-xs uppercase tracking-wide mt-3">Descuentos</div>
          <div className="space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">AFP</span><span className="font-medium text-red-500">-{fmt(liq.afp_trabajador)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Salud</span><span className="font-medium text-red-500">-{fmt(liq.salud_trabajador)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">AFC (Cesantia)</span><span className="font-medium text-red-500">-{fmt(liq.afc_trabajador)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Impuesto Unico</span><span className="font-medium text-red-500">-{fmt(liq.impuesto_unico)}</span></div>
            <div className="flex justify-between border-t border-gray-100 pt-1 font-semibold">
              <span>Total Descuentos</span><span className="text-red-500">-{fmt(liq.total_descuentos)}</span>
            </div>
          </div>

          <div className="flex justify-between border-t-2 border-gray-200 pt-2 text-base font-bold">
            <span>Liquido a Pagar</span>
            <span className="text-emerald-600">{fmt(liq.liquido_pagar)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FirmaModal({ liq, onClose, onFirma }: { liq: Liquidacion; onClose: () => void; onFirma: () => void }) {
  const [checked, setChecked] = useState(false);
  const [firmado, setFirmado] = useState(false);

  const handleFirmar = async () => {
    const supabase = createClient();
    await supabase
      .from('liquidaciones')
      .update({ estado: 'aprobado', firmada_por_empleado: true, fecha_firma_empleado: new Date().toISOString() })
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

async function downloadLiquidacionPDF(liq: Liquidacion, mode: 'preview' | 'download' = 'preview') {
  try {
    const r = await fetch(`/api/portal/liquidacion-pdf?period=${liq.periodo}`);
    if (!r.ok) {
      alert(r.status === 404
        ? 'No hay liquidación disponible para este período. Contacta a tu empleador.'
        : `No se pudo generar el PDF (HTTP ${r.status}).`);
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    if (mode === 'download') {
      const a = document.createElement('a');
      a.href = url;
      a.download = `liquidacion_${liq.periodo.replace('-', '')}.pdf`;
      a.click();
    } else {
      const w = window.open(url, '_blank');
      if (!w) {
        alert('Tu navegador bloqueó la ventana. Permite popups e intenta de nuevo.');
        return;
      }
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    console.error('downloadLiquidacionPDF', e);
    alert('Error al obtener el PDF.');
  }
}

export default function MisLiquidacionesPage() {
  const { profile } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const [payroll, setPayroll] = useState<Liquidacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Liquidacion | null>(null);
  const [firmaTarget, setFirmaTarget] = useState<Liquidacion | null>(null);

  const loadPayroll = async () => {
    if (!trabajadorId) return;
    try {
      const supabase = createClient();
      // Lee de payroll_results (sistema Poppins) y mapea a la interface Liquidacion
      // para reutilizar el UI existente. RLS worker_lee_payroll_results filtra.
      const { data: results, error: err } = await supabase
        .from('payroll_results')
        .select('id, payroll_period, gross_income, taxable_income, net_pay, deduction_afp10, deduction_afp_commission, deduction_health7, deduction_income_tax, deduction_advances, deduction_other, pagado_at, medio_pago, recibo_firmado_at')
        .eq('worker_id', trabajadorId)
        .eq('voided', false)
        .order('payroll_period', { ascending: false });
      if (err) throw err;
      const liqs: Liquidacion[] = (results ?? []).map((r: any) => ({
        id: r.id, trabajador_id: trabajadorId, periodo: r.payroll_period,
        pagado_at: r.pagado_at, medio_pago: r.medio_pago, recibo_firmado_at: r.recibo_firmado_at,
        sueldo_base: 0, gratificacion_legal: 0,
        horas_extras_50: 0, horas_extras_100: 0, bonos_imponibles: 0,
        colacion: 0, movilizacion: 0, viatico: 0, comisiones: 0,
        total_haberes: r.gross_income ?? 0,
        total_haberes_imponibles: r.taxable_income ?? 0,
        total_haberes_no_imponibles: Math.max(0, (r.gross_income ?? 0) - (r.taxable_income ?? 0)),
        afp_trabajador: (r.deduction_afp10 ?? 0) + (r.deduction_afp_commission ?? 0),
        salud_trabajador: r.deduction_health7 ?? 0,
        salud_adicional: 0,
        afc_trabajador: r.deduction_other ?? 0,
        impuesto_unico: r.deduction_income_tax ?? 0,
        total_descuentos: (r.gross_income ?? 0) - (r.net_pay ?? 0),
        liquido_pagar: r.net_pay ?? 0,
        estado: 'pagado',
      } as any));
      setPayroll(liqs);
    } catch (e: unknown) {
      console.error('Error loading liquidaciones:', e);
      setError(e instanceof Error ? e.message : 'Error al cargar liquidaciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (trabajadorId) loadPayroll();
  }, [trabajadorId]);

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
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
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
                    <div className="text-3xl font-bold text-emerald-600 mt-1">{fmt(latest.liquido_pagar)}</div>
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
                      onClick={() => downloadLiquidacionPDF(latest, 'preview')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Eye size={14} />
                      Ver PDF
                    </button>
                    <button
                      onClick={() => downloadLiquidacionPDF(latest, 'download')}
                      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Download size={14} />
                      Descargar
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
                        <td className="px-3 py-3 text-right font-bold text-emerald-600">{fmt(liq.liquido_pagar)}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelected(liq)}
                              className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                            >
                              Ver
                            </button>
                            <button
                              onClick={() => downloadLiquidacionPDF(liq, 'preview')}
                              className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                              title="Ver PDF"
                            >
                              PDF
                            </button>
                            <button
                              onClick={() => downloadLiquidacionPDF(liq, 'download')}
                              className="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition font-medium"
                              title="Descargar PDF"
                            >
                              <Download size={12} />
                            </button>
                            {liq.estado !== 'aprobado' && liq.estado !== 'pagado' ? (
                              <button
                                onClick={() => setFirmaTarget(liq)}
                                className="text-xs px-3 py-1 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition font-medium"
                              >
                                Firmar
                              </button>
                            ) : (
                              <span className="text-xs px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 font-medium">✓</span>
                            )}
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
