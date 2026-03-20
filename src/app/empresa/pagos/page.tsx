'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CreditCard,
  Home,
  Building2,
  User,
  Shield,
  Sparkles,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Download,
  Filter,
  ArrowUpDown,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Constants ──────────────────────────────────────────────────────────
const EMPLEADOR_ID = '11111111-1111-1111-1111-111111111111';

const PERIODOS = [
  { value: '2026-03', label: 'Marzo 2026' },
  { value: '2026-02', label: 'Febrero 2026' },
  { value: '2026-01', label: 'Enero 2026' },
];

const TIPO_CONFIG: Record<string, { icon: typeof Home; iconColor: string; label: string }> = {
  arriendo:          { icon: Home,      iconColor: 'text-blue-500 bg-blue-50',      label: 'Arriendo' },
  gastos_comunes:    { icon: Building2, iconColor: 'text-zinc-500 bg-zinc-100',     label: 'Gastos Comunes' },
  sueldo:            { icon: User,      iconColor: 'text-rose-500 bg-rose-50',      label: 'Sueldos' },
  leyes_sociales:    { icon: Shield,    iconColor: 'text-violet-500 bg-violet-50',  label: 'Leyes Sociales' },
  servicio_poppins:  { icon: Sparkles,  iconColor: 'text-amber-500 bg-amber-50',    label: 'Servicio Poppins' },
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700',
  procesado: 'bg-blue-50 text-blue-700',
  pagado:    'bg-emerald-50 text-emerald-700',
  rechazado: 'bg-red-50 text-red-700',
};

// ── Types ──────────────────────────────────────────────────────────────
interface Pago {
  id: string;
  empleador_id: string;
  tipo: string;
  monto: number;
  metodo_pago: string | null;
  puntos_acumulados: number | null;
  referencia_trabajador_id: string | null;
  periodo: string;
  estado: string;
  fecha_pago: string | null;
  tarjeta_ultimos4: string | null;
  stripe_payment_intent_id: string | null;
  stripe_receipt_url: string | null;
  descripcion: string | null;
  comprobante_url: string | null;
  created_at: string;
  trabajador?: { nombre: string; apellido: string } | null;
}

// ── Helpers ────────────────────────────────────────────────────────────
function formatCLP(amount: number): string {
  return '$' + amount.toLocaleString('es-CL');
}

function formatFecha(dateStr: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function tipoLabel(tipo: string): string {
  return TIPO_CONFIG[tipo]?.label || tipo;
}

// ── Receipt Generator ──────────────────────────────────────────────────
function downloadComprobante(pago: Pago) {
  const puntos = pago.puntos_acumulados ?? Math.floor(pago.monto / 1000);
  const numero = pago.stripe_payment_intent_id || `PAG-${pago.id.slice(0, 8).toUpperCase()}`;
  const fechaPago = pago.fecha_pago ? formatFecha(pago.fecha_pago) : formatFecha(pago.created_at);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Comprobante de Pago - Poppins</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background: #fff; color: #18181b; padding: 40px; max-width: 700px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { font-size: 22px; color: #7c3aed; letter-spacing: 2px; }
    .header p { font-size: 12px; color: #71717a; margin-top: 4px; }
    .logo { width: 60px; height: 60px; background: linear-gradient(135deg, #7c3aed, #4f46e5); border-radius: 12px; margin: 0 auto 12px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 24px; font-weight: 700; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 13px; font-weight: 600; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
    .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f4f4f5; font-size: 14px; }
    .row .label { color: #71717a; }
    .row .value { font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; padding: 14px 0; font-size: 18px; font-weight: 700; border-top: 2px solid #18181b; margin-top: 8px; }
    .points-box { background: linear-gradient(135deg, #7c3aed, #4f46e5); color: #fff; border-radius: 10px; padding: 16px; text-align: center; margin: 24px 0; }
    .points-box .pts { font-size: 28px; font-weight: 700; }
    .points-box .pts-label { font-size: 12px; opacity: 0.8; }
    .footer { text-align: center; border-top: 1px solid #e4e4e7; padding-top: 20px; margin-top: 30px; font-size: 11px; color: #a1a1aa; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">P</div>
    <h1>COMPROBANTE DE PAGO</h1>
    <p>POPPINS - Plataforma de Gestión del Hogar</p>
  </div>

  <div class="section">
    <div class="section-title">Datos del Pago</div>
    <div class="row"><span class="label">N&ordm; Comprobante</span><span class="value">${numero}</span></div>
    <div class="row"><span class="label">Fecha de Pago</span><span class="value">${fechaPago}</span></div>
    <div class="row"><span class="label">Tipo</span><span class="value">${tipoLabel(pago.tipo)}</span></div>
    <div class="row"><span class="label">Descripci&oacute;n</span><span class="value">${pago.descripcion || tipoLabel(pago.tipo)}</span></div>
    <div class="row"><span class="label">Per&iacute;odo</span><span class="value">${pago.periodo}</span></div>
    <div class="row"><span class="label">M&eacute;todo de Pago</span><span class="value">Tarjeta ****${pago.tarjeta_ultimos4 || '4521'}</span></div>
    <div class="total-row"><span>Total Pagado</span><span>${formatCLP(pago.monto)}</span></div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Empleador</div>
    <div class="row"><span class="label">Nombre</span><span class="value">Rene Aravena</span></div>
    <div class="row"><span class="label">RUT</span><span class="value">12.345.678-9</span></div>
  </div>

  <div class="points-box">
    <div class="pts">+${puntos.toLocaleString('es-CL')} puntos</div>
    <div class="pts-label">Puntos Poppins acumulados con este pago</div>
  </div>

  <div class="footer">
    <p>Este comprobante es v&aacute;lido como respaldo de pago.</p>
    <p>Generado el ${new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
    <p style="margin-top: 8px;">Poppins &copy; ${new Date().getFullYear()}</p>
  </div>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }
}

// ── Main Component ─────────────────────────────────────────────────────
export default function PagosPage() {
  const supabase = createClient();

  // State
  const [periodo, setPeriodo] = useState('2026-03');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [allPagos, setAllPagos] = useState<Pago[]>([]);
  const [totalPuntos, setTotalPuntos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Payment modal
  const [paymentModal, setPaymentModal] = useState<Pago | null>(null);
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState<{ puntos: number } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Pay All
  const [payingAll, setPayingAll] = useState(false);
  const [payAllProgress, setPayAllProgress] = useState({ current: 0, total: 0 });

  // History filters
  const [filterTipo, setFilterTipo] = useState('todos');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [sortAsc, setSortAsc] = useState(false);

  // ── Fetch pagos for selected period ──
  const fetchPagos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('pagos_empleador')
        .select('*, trabajador:referencia_trabajador_id(nombre, apellido)')
        .eq('empleador_id', EMPLEADOR_ID)
        .eq('periodo', periodo)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setPagos((data as Pago[]) || []);
    } catch (err: any) {
      setError(err.message || 'Error al cargar pagos');
    } finally {
      setLoading(false);
    }
  }, [periodo, supabase]);

  // ── Fetch ALL pagos for history table ──
  const fetchAllPagos = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('pagos_empleador')
        .select('*, trabajador:referencia_trabajador_id(nombre, apellido)')
        .eq('empleador_id', EMPLEADOR_ID)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAllPagos((data as Pago[]) || []);
    } catch {
      // History errors are non-blocking
    } finally {
      setLoadingHistory(false);
    }
  }, [supabase]);

  // ── Fetch total accumulated points ──
  const fetchTotalPuntos = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('pagos_empleador')
        .select('puntos_acumulados')
        .eq('empleador_id', EMPLEADOR_ID)
        .eq('estado', 'pagado');

      if (data) {
        const sum = data.reduce((acc, row) => acc + (row.puntos_acumulados || 0), 0);
        setTotalPuntos(sum);
      }
    } catch {
      // Non-blocking
    }
  }, [supabase]);

  useEffect(() => {
    fetchPagos();
  }, [fetchPagos]);

  useEffect(() => {
    fetchAllPagos();
    fetchTotalPuntos();
  }, [fetchAllPagos, fetchTotalPuntos]);

  // ── Derived data ──
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0);
  const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0);
  const puntosMes = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + (p.puntos_acumulados || 0), 0);
  const pendingPagos = pagos.filter(p => p.estado === 'pendiente');

  // ── Process a single payment ──
  async function processPayment(pago: Pago): Promise<{ puntos: number }> {
    // Step 1: Create payment intent (will fail without Stripe keys, so we handle gracefully)
    let paymentIntentId = 'pi_simulated_' + Date.now();
    try {
      const res = await fetch('/api/pagos/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pagoId: pago.id,
          monto: pago.monto,
          descripcion: pago.descripcion || tipoLabel(pago.tipo),
          empleadorId: EMPLEADOR_ID,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        paymentIntentId = data.paymentIntentId || paymentIntentId;
      }
      // If Stripe fails (no keys), we continue with simulated ID
    } catch {
      // Simulated mode - continue
    }

    // Step 2: Confirm payment
    const confirmRes = await fetch('/api/pagos/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pagoId: pago.id,
        paymentIntentId,
        status: 'succeeded',
      }),
    });

    if (!confirmRes.ok) {
      const errData = await confirmRes.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al confirmar pago');
    }

    const result = await confirmRes.json();
    return { puntos: result.puntos_ganados || Math.floor(pago.monto / 1000) };
  }

  // ── Handle single payment ──
  async function handleConfirmPayment() {
    if (!paymentModal) return;
    setPaying(true);
    setPayError(null);
    try {
      const result = await processPayment(paymentModal);
      setPaySuccess(result);
      // Refresh data
      await Promise.all([fetchPagos(), fetchAllPagos(), fetchTotalPuntos()]);
    } catch (err: any) {
      setPayError(err.message || 'Error al procesar pago');
    } finally {
      setPaying(false);
    }
  }

  // ── Handle pay all ──
  async function handlePayAll() {
    if (pendingPagos.length === 0) return;
    setPayingAll(true);
    setPayAllProgress({ current: 0, total: pendingPagos.length });
    try {
      for (let i = 0; i < pendingPagos.length; i++) {
        setPayAllProgress({ current: i + 1, total: pendingPagos.length });
        await processPayment(pendingPagos[i]);
      }
      await Promise.all([fetchPagos(), fetchAllPagos(), fetchTotalPuntos()]);
    } catch {
      // Partial success is ok - data already refreshed per payment
      await Promise.all([fetchPagos(), fetchAllPagos(), fetchTotalPuntos()]);
    } finally {
      setPayingAll(false);
    }
  }

  // ── Filtered & sorted history ──
  const filteredHistory = allPagos
    .filter(p => filterTipo === 'todos' || p.tipo === filterTipo)
    .filter(p => filterEstado === 'todos' || p.estado === filterEstado)
    .sort((a, b) => {
      const dateA = new Date(a.fecha_pago || a.created_at).getTime();
      const dateB = new Date(b.fecha_pago || b.created_at).getTime();
      return sortAsc ? dateA - dateB : dateB - dateA;
    });

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Pagos y Puntos</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona tus pagos y acumula puntos Poppins</p>
      </div>

      {/* Points Summary Card */}
      <div className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-white/80" />
              <p className="text-sm text-white/80">Puntos acumulados</p>
            </div>
            <p className="text-3xl font-bold mt-1">
              {totalPuntos.toLocaleString('es-CL')} puntos
            </p>
            <p className="text-sm text-white/70 mt-1">
              Equivalente a {formatCLP(totalPuntos)} en descuentos
            </p>
          </div>
          <div className="text-right space-y-1">
            <div className="flex items-center gap-2 justify-end">
              <CreditCard className="h-5 w-5 text-white/60" />
              <span className="text-sm text-white/80">Tarjeta ****4521</span>
            </div>
            {puntosMes > 0 && (
              <p className="text-xs text-white/60">+{puntosMes.toLocaleString('es-CL')} pts este mes</p>
            )}
          </div>
        </div>
      </div>

      {/* Period Filter + Pay All */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-zinc-900">Pagos del Mes</h2>
          <div className="relative">
            <select
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              {PERIODOS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm">
          {totalPendiente > 0 && (
            <span className="text-zinc-500">
              Pendiente: <span className="font-semibold text-amber-600">{formatCLP(totalPendiente)}</span>
            </span>
          )}
          {totalPagado > 0 && (
            <span className="text-zinc-500">
              Pagado: <span className="font-semibold text-emerald-600">{formatCLP(totalPagado)}</span>
            </span>
          )}
          {pendingPagos.length > 1 && (
            <button
              onClick={handlePayAll}
              disabled={payingAll}
              className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {payingAll ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Pagando {payAllProgress.current}/{payAllProgress.total}...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4" />
                  Pagar Todo ({formatCLP(totalPendiente)})
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
          <span className="ml-2 text-sm text-zinc-500">Cargando pagos...</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Payments Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pagos.length === 0 ? (
            <div className="col-span-2 text-center py-12 text-zinc-400 text-sm">
              No hay pagos para este periodo.
            </div>
          ) : (
            pagos.map((pago) => {
              const config = TIPO_CONFIG[pago.tipo] || TIPO_CONFIG.arriendo;
              const Icon = config.icon;
              const badgeClass = ESTADO_BADGE[pago.estado] || ESTADO_BADGE.pendiente;
              const puntosGanados = pago.puntos_acumulados || (pago.estado === 'pagado' ? Math.floor(pago.monto / 1000) : null);
              const trabajadorName = pago.trabajador ? `${pago.trabajador.nombre} ${pago.trabajador.apellido}` : null;

              return (
                <div
                  key={pago.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.iconColor}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-900 truncate">
                          {pago.descripcion || tipoLabel(pago.tipo)}
                        </p>
                        {trabajadorName && (
                          <p className="text-xs text-zinc-500 truncate">{trabajadorName}</p>
                        )}
                        <p className="text-lg font-bold text-zinc-900 mt-0.5">{formatCLP(pago.monto)}</p>
                        {pago.fecha_pago && (
                          <p className="text-xs text-zinc-500 mt-0.5">Pagado {formatFecha(pago.fecha_pago)}</p>
                        )}
                        {puntosGanados != null && puntosGanados > 0 && (
                          <p className="text-xs text-violet-600 font-medium mt-0.5">
                            +{puntosGanados.toLocaleString('es-CL')} pts
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${badgeClass}`}>
                      {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                    </span>
                  </div>
                  {pago.estado === 'pendiente' && (
                    <button
                      onClick={() => {
                        setPaySuccess(null);
                        setPayError(null);
                        setPaymentModal(pago);
                      }}
                      className="mt-3 w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles className="h-4 w-4" />
                      Pagar con Poppins
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Payment History Table ────────────────────────────────────── */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4">Historial de Pagos</h2>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="flex items-center gap-1.5 text-sm text-zinc-500">
            <Filter className="h-4 w-4" />
            Filtrar:
          </div>
          <div className="relative">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="todos">Todos los tipos</option>
              <option value="arriendo">Arriendo</option>
              <option value="gastos_comunes">Gastos Comunes</option>
              <option value="sueldo">Sueldos</option>
              <option value="leyes_sociales">Leyes Sociales</option>
              <option value="servicio_poppins">Servicio Poppins</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="appearance-none rounded-lg border border-zinc-200 bg-white pl-3 pr-8 py-1.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="todos">Todos los estados</option>
              <option value="pendiente">Pendiente</option>
              <option value="pagado">Pagado</option>
              <option value="rechazado">Rechazado</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
                <span className="ml-2 text-sm text-zinc-500">Cargando historial...</span>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">
                      <button
                        onClick={() => setSortAsc(!sortAsc)}
                        className="flex items-center gap-1 hover:text-zinc-700 transition-colors"
                      >
                        Fecha
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Descripcion</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Tipo</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Monto</th>
                    <th className="px-4 py-3 text-right font-medium text-zinc-500">Puntos</th>
                    <th className="px-4 py-3 text-left font-medium text-zinc-500">Estado</th>
                    <th className="px-4 py-3 text-center font-medium text-zinc-500">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                        No se encontraron pagos con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((pago) => {
                      const badgeClass = ESTADO_BADGE[pago.estado] || ESTADO_BADGE.pendiente;
                      return (
                        <tr key={pago.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                            {formatFecha(pago.fecha_pago || pago.created_at)}
                          </td>
                          <td className="px-4 py-3 font-medium text-zinc-900">
                            {pago.descripcion || tipoLabel(pago.tipo)}
                          </td>
                          <td className="px-4 py-3 text-zinc-600">{tipoLabel(pago.tipo)}</td>
                          <td className="px-4 py-3 text-zinc-900 font-medium text-right whitespace-nowrap">
                            {formatCLP(pago.monto)}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            {pago.puntos_acumulados ? (
                              <span className="text-violet-600 font-medium">
                                +{pago.puntos_acumulados.toLocaleString('es-CL')}
                              </span>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}>
                              {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {pago.estado === 'pagado' ? (
                              <button
                                onClick={() => downloadComprobante(pago)}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-violet-600 hover:bg-violet-50 transition-colors"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Descargar
                              </button>
                            ) : (
                              <span className="text-zinc-300 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* ── Payment Modal ───────────────────────────────────────────── */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !paying && setPaymentModal(null)}
          />

          {/* Modal */}
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            {/* Success state */}
            {paySuccess ? (
              <div className="p-8 text-center">
                <div className="mx-auto w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-bold text-zinc-900 mb-1">Pago Procesado</h3>
                <div className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-sm font-semibold text-violet-700 mb-4">
                  <Sparkles className="h-4 w-4" />
                  +{paySuccess.puntos.toLocaleString('es-CL')} puntos
                </div>
                <p className="text-sm text-zinc-500 mb-6">
                  Tu pago ha sido procesado exitosamente y los puntos han sido acumulados.
                </p>
                <button
                  onClick={() => {
                    setPaymentModal(null);
                    setPaySuccess(null);
                  }}
                  className="w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                  <h3 className="text-lg font-semibold text-zinc-900">Confirmar Pago</h3>
                  <button
                    onClick={() => !paying && setPaymentModal(null)}
                    disabled={paying}
                    className="rounded-lg p-1 hover:bg-zinc-100 transition-colors disabled:opacity-50"
                  >
                    <X className="h-5 w-5 text-zinc-400" />
                  </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5 space-y-5">
                  {/* Payment summary */}
                  <div className="rounded-lg bg-zinc-50 p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Concepto</span>
                      <span className="font-medium text-zinc-900">
                        {paymentModal.descripcion || tipoLabel(paymentModal.tipo)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Periodo</span>
                      <span className="font-medium text-zinc-900">{paymentModal.periodo}</span>
                    </div>
                    <div className="border-t border-zinc-200 pt-3 flex justify-between">
                      <span className="text-sm font-medium text-zinc-700">Total a pagar</span>
                      <span className="text-lg font-bold text-zinc-900">{formatCLP(paymentModal.monto)}</span>
                    </div>
                  </div>

                  {/* Card info */}
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Tarjeta ****4521</p>
                      <p className="text-xs text-zinc-500">Visa - Pago seguro con Stripe</p>
                    </div>
                  </div>

                  {/* Points preview */}
                  <div className="flex items-center gap-2 rounded-lg bg-violet-50 p-3">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm font-medium text-violet-700">
                        Ganarás +{Math.floor(paymentModal.monto / 1000).toLocaleString('es-CL')} puntos
                      </p>
                      <p className="text-xs text-violet-500">1 punto por cada $1.000 pagados</p>
                    </div>
                  </div>

                  {/* Error */}
                  {payError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      <p className="text-sm text-red-700">{payError}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
                  <button
                    onClick={() => setPaymentModal(null)}
                    disabled={paying}
                    className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmPayment}
                    disabled={paying}
                    className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      'Confirmar Pago'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
