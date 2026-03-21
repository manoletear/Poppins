'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
  Droplets,
  Zap,
  Flame,
  Wifi,
  Plus,
  Pencil,
  Trash2,
  Settings,
  CalendarDays,
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
  arriendo:         { icon: Home,       iconColor: 'text-blue-500 bg-blue-50',     label: 'Arriendo' },
  gastos_comunes:   { icon: Building2,  iconColor: 'text-zinc-500 bg-zinc-100',    label: 'Gastos Comunes' },
  sueldo_empleado:  { icon: User,       iconColor: 'text-rose-500 bg-rose-50',     label: 'Sueldo Empleado' },
  leyes_sociales:   { icon: Shield,     iconColor: 'text-violet-500 bg-violet-50', label: 'Leyes Sociales' },
  servicio_poppins: { icon: Sparkles,   iconColor: 'text-amber-500 bg-amber-50',   label: 'Servicio Poppins' },
  agua:             { icon: Droplets,   iconColor: 'text-cyan-500 bg-cyan-50',     label: 'Agua' },
  luz:              { icon: Zap,        iconColor: 'text-yellow-500 bg-yellow-50', label: 'Electricidad' },
  gas:              { icon: Flame,      iconColor: 'text-orange-500 bg-orange-50', label: 'Gas' },
  internet:         { icon: Wifi,       iconColor: 'text-indigo-500 bg-indigo-50', label: 'Internet / TV' },
  otro:             { icon: CreditCard, iconColor: 'text-zinc-500 bg-zinc-100',    label: 'Otro' },
};

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-700',
  procesado: 'bg-blue-50 text-blue-700',
  pagado:    'bg-emerald-50 text-emerald-700',
  rechazado: 'bg-red-50 text-red-700',
};

const TIPOS_CUENTA = [
  { value: 'arriendo', label: 'Arriendo' },
  { value: 'gastos_comunes', label: 'Gastos Comunes' },
  { value: 'agua', label: 'Agua' },
  { value: 'luz', label: 'Electricidad' },
  { value: 'gas', label: 'Gas' },
  { value: 'internet', label: 'Internet / TV' },
  { value: 'sueldo_empleado', label: 'Sueldo Empleado' },
  { value: 'leyes_sociales', label: 'Leyes Sociales' },
  { value: 'servicio_poppins', label: 'Servicio Poppins' },
  { value: 'otro', label: 'Otro' },
];

// ── Types ──────────────────────────────────────────────────────────────
interface Pago {
  id: string;
  empleador_id: string;
  tipo: string;
  monto: number;
  estado: string;
  periodo: string;
  flow_order_id: string | null;
  flow_token: string | null;
  cuenta_pago_id: string | null;
  puntos_acumulados: number | null;
  fecha_pago: string | null;
  descripcion: string | null;
  created_at: string;
  cuenta_pago?: CuentaPago | null;
}

interface CuentaPago {
  id: string;
  empleador_id: string;
  tipo: string;
  alias: string;
  proveedor: string | null;
  numero_cuenta: string | null;
  monto_fijo: number | null;
  dia_vencimiento: number | null;
  referencia_trabajador_id: string | null;
  activa: boolean;
  notas: string | null;
  created_at: string;
  trabajador?: { nombre: string; apellido_paterno: string } | null;
}

interface Trabajador {
  id: string;
  nombre: string;
  apellido_paterno: string;
}

interface CuentaFormData {
  tipo: string;
  alias: string;
  proveedor: string;
  numero_cuenta: string;
  monto_fijo: string;
  dia_vencimiento: string;
  referencia_trabajador_id: string;
  notas: string;
}

const EMPTY_CUENTA_FORM: CuentaFormData = {
  tipo: 'arriendo',
  alias: '',
  proveedor: '',
  numero_cuenta: '',
  monto_fijo: '',
  dia_vencimiento: '5',
  referencia_trabajador_id: '',
  notas: '',
};

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

function getCurrentPeriodo(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Receipt Generator ──────────────────────────────────────────────────
function downloadComprobante(pago: Pago) {
  const puntos = pago.puntos_acumulados ?? Math.floor(pago.monto / 1000);
  const numero = pago.flow_order_id
    ? `FLOW-${pago.flow_order_id}`
    : `PAG-${pago.id.slice(0, 8).toUpperCase()}`;
  const fechaPago = pago.fecha_pago ? formatFecha(pago.fecha_pago) : formatFecha(pago.created_at);
  const alias = pago.cuenta_pago?.alias || pago.descripcion || tipoLabel(pago.tipo);

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
    <p>POPPINS - Plataforma de Gesti&oacute;n del Hogar</p>
  </div>
  <div class="section">
    <div class="section-title">Datos del Pago</div>
    <div class="row"><span class="label">N&ordm; Comprobante</span><span class="value">${numero}</span></div>
    <div class="row"><span class="label">Fecha de Pago</span><span class="value">${fechaPago}</span></div>
    <div class="row"><span class="label">Concepto</span><span class="value">${alias}</span></div>
    <div class="row"><span class="label">Per&iacute;odo</span><span class="value">${pago.periodo}</span></div>
    <div class="row"><span class="label">M&eacute;todo de Pago</span><span class="value">Flow.cl</span></div>
    <div class="total-row"><span>Total Pagado</span><span>${formatCLP(pago.monto)}</span></div>
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
function PagosContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();

  // Tabs
  const [activeTab, setActiveTab] = useState<'pagos' | 'cuentas'>('pagos');

  // ════════════════════════════════════════════════════════════════════
  //  TAB 1: MIS PAGOS
  // ════════════════════════════════════════════════════════════════════

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

  // ════════════════════════════════════════════════════════════════════
  //  TAB 2: CONFIGURAR CUENTAS
  // ════════════════════════════════════════════════════════════════════

  const [cuentas, setCuentas] = useState<CuentaPago[]>([]);
  const [loadingCuentas, setLoadingCuentas] = useState(true);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);

  // Cuenta modal (add/edit)
  const [cuentaModal, setCuentaModal] = useState<'add' | 'edit' | null>(null);
  const [editingCuenta, setEditingCuenta] = useState<CuentaPago | null>(null);
  const [cuentaForm, setCuentaForm] = useState<CuentaFormData>(EMPTY_CUENTA_FORM);
  const [savingCuenta, setSavingCuenta] = useState(false);
  const [cuentaError, setCuentaError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingCuenta, setDeletingCuenta] = useState<CuentaPago | null>(null);

  // Generate pagos
  const [generatingPagos, setGeneratingPagos] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  // ── Check flow_status on mount ──
  useEffect(() => {
    const flowStatus = searchParams.get('flow_status');
    if (flowStatus === 'completed') {
      // Recargar datos despues de retorno de Flow
      fetchPagos();
      fetchAllPagos();
      fetchTotalPuntos();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Fetch pagos for selected period ──
  const fetchPagos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('pagos_empleador')
        .select('*, cuenta_pago:cuenta_pago_id(id, alias, proveedor, tipo)')
        .eq('empleador_id', EMPLEADOR_ID)
        .eq('periodo', periodo)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setPagos((data as Pago[]) || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cargar pagos';
      setError(message);
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
        .select('*, cuenta_pago:cuenta_pago_id(id, alias, proveedor, tipo)')
        .eq('empleador_id', EMPLEADOR_ID)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setAllPagos((data as Pago[]) || []);
    } catch {
      // Non-blocking
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
        const sum = data.reduce((acc: number, row: { puntos_acumulados: number | null }) => acc + (row.puntos_acumulados || 0), 0);
        setTotalPuntos(sum);
      }
    } catch {
      // Non-blocking
    }
  }, [supabase]);

  // ── Fetch cuentas de pago ──
  const fetchCuentas = useCallback(async () => {
    setLoadingCuentas(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('cuentas_pago')
        .select('*, trabajador:referencia_trabajador_id(nombre, apellido_paterno)')
        .eq('empleador_id', EMPLEADOR_ID)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;
      setCuentas((data as CuentaPago[]) || []);
    } catch {
      // Non-blocking
    } finally {
      setLoadingCuentas(false);
    }
  }, [supabase]);

  // ── Fetch trabajadores ──
  const fetchTrabajadores = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('trabajadores')
        .select('id, nombre, apellido_paterno')
        .eq('empleador_id', EMPLEADOR_ID)
        .order('nombre');

      if (data) setTrabajadores(data as Trabajador[]);
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

  useEffect(() => {
    if (activeTab === 'cuentas') {
      fetchCuentas();
      fetchTrabajadores();
    }
  }, [activeTab, fetchCuentas, fetchTrabajadores]);

  // ── Derived data ──
  const totalPendiente = pagos.filter(p => p.estado === 'pendiente').reduce((s, p) => s + p.monto, 0);
  const totalPagado = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0);
  const puntosMes = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + (p.puntos_acumulados || 0), 0);
  const pendingPagos = pagos.filter(p => p.estado === 'pendiente');

  // ── Process a Flow payment ──
  async function processFlowPayment(pago: Pago): Promise<{ puntos: number; redirected?: boolean }> {
    const alias = pago.cuenta_pago?.alias || pago.descripcion || tipoLabel(pago.tipo);

    const res = await fetch('/api/pagos/flow/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pagoId: pago.id,
        monto: pago.monto,
        descripcion: alias,
        email: 'manuel.aravenal@gmail.com',
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al crear pago en Flow');
    }

    const data = await res.json();

    if (data.url && !data.simulated) {
      // Flow real: redirigir a pagina de pago
      window.location.href = data.url + '?token=' + data.token;
      return { puntos: Math.floor(pago.monto / 1000), redirected: true };
    }

    // Modo simulado (sin claves Flow): confirmar localmente
    const confirmRes = await fetch('/api/pagos/flow/confirm-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pagoId: pago.id }),
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
      const result = await processFlowPayment(paymentModal);
      if (!result.redirected) {
        setPaySuccess(result);
        await Promise.all([fetchPagos(), fetchAllPagos(), fetchTotalPuntos()]);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al procesar pago';
      setPayError(message);
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
        const result = await processFlowPayment(pendingPagos[i]);
        if (result.redirected) break; // Flow redireccion activa, detener
      }
      await Promise.all([fetchPagos(), fetchAllPagos(), fetchTotalPuntos()]);
    } catch {
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

  // ══════════════════════════════════════════════════════════════════════
  //  CUENTAS handlers
  // ══════════════════════════════════════════════════════════════════════

  function openAddCuenta() {
    setCuentaForm(EMPTY_CUENTA_FORM);
    setEditingCuenta(null);
    setCuentaError(null);
    setCuentaModal('add');
  }

  function openEditCuenta(cuenta: CuentaPago) {
    setCuentaForm({
      tipo: cuenta.tipo,
      alias: cuenta.alias,
      proveedor: cuenta.proveedor || '',
      numero_cuenta: cuenta.numero_cuenta || '',
      monto_fijo: cuenta.monto_fijo ? String(cuenta.monto_fijo) : '',
      dia_vencimiento: cuenta.dia_vencimiento ? String(cuenta.dia_vencimiento) : '5',
      referencia_trabajador_id: cuenta.referencia_trabajador_id || '',
      notas: cuenta.notas || '',
    });
    setEditingCuenta(cuenta);
    setCuentaError(null);
    setCuentaModal('edit');
  }

  async function handleSaveCuenta() {
    if (!cuentaForm.alias.trim()) {
      setCuentaError('El alias es requerido');
      return;
    }
    setSavingCuenta(true);
    setCuentaError(null);
    try {
      const record = {
        empleador_id: EMPLEADOR_ID,
        tipo: cuentaForm.tipo,
        alias: cuentaForm.alias.trim(),
        proveedor: cuentaForm.proveedor.trim() || null,
        numero_cuenta: cuentaForm.numero_cuenta.trim() || null,
        monto_fijo: cuentaForm.monto_fijo ? Number(cuentaForm.monto_fijo) : null,
        dia_vencimiento: cuentaForm.dia_vencimiento ? Number(cuentaForm.dia_vencimiento) : null,
        referencia_trabajador_id: cuentaForm.referencia_trabajador_id || null,
        notas: cuentaForm.notas.trim() || null,
        activa: true,
      };

      if (cuentaModal === 'edit' && editingCuenta) {
        const { error } = await supabase
          .from('cuentas_pago')
          .update(record)
          .eq('id', editingCuenta.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cuentas_pago')
          .insert(record);
        if (error) throw error;
      }

      setCuentaModal(null);
      await fetchCuentas();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al guardar cuenta';
      setCuentaError(message);
    } finally {
      setSavingCuenta(false);
    }
  }

  async function handleToggleCuenta(cuenta: CuentaPago) {
    await supabase
      .from('cuentas_pago')
      .update({ activa: !cuenta.activa })
      .eq('id', cuenta.id);
    await fetchCuentas();
  }

  async function handleDeleteCuenta() {
    if (!deletingCuenta) return;
    await supabase.from('cuentas_pago').delete().eq('id', deletingCuenta.id);
    setDeletingCuenta(null);
    await fetchCuentas();
  }

  async function handleGenerarPagos() {
    setGeneratingPagos(true);
    setGenerateResult(null);
    try {
      const currentPeriodo = getCurrentPeriodo();
      const activeCuentas = cuentas.filter(c => c.activa);

      if (activeCuentas.length === 0) {
        setGenerateResult('No hay cuentas activas para generar pagos.');
        return;
      }

      // Verificar pagos existentes para este periodo
      const { data: existingPagos } = await supabase
        .from('pagos_empleador')
        .select('cuenta_pago_id')
        .eq('empleador_id', EMPLEADOR_ID)
        .eq('periodo', currentPeriodo);

      const existingCuentaIds = new Set(
        (existingPagos || []).map((p: { cuenta_pago_id: string | null }) => p.cuenta_pago_id)
      );

      const nuevos = activeCuentas.filter(c => !existingCuentaIds.has(c.id));

      if (nuevos.length === 0) {
        setGenerateResult(`Todos los pagos de ${currentPeriodo} ya fueron generados.`);
        return;
      }

      const records = nuevos.map(cuenta => ({
        empleador_id: EMPLEADOR_ID,
        tipo: cuenta.tipo,
        monto: cuenta.monto_fijo || 0,
        estado: 'pendiente',
        periodo: currentPeriodo,
        cuenta_pago_id: cuenta.id,
        descripcion: [cuenta.alias, cuenta.proveedor].filter(Boolean).join(' - '),
        referencia_trabajador_id: cuenta.referencia_trabajador_id || null,
      }));

      const { error } = await supabase
        .from('pagos_empleador')
        .insert(records);

      if (error) throw error;

      setGenerateResult(`${nuevos.length} pagos generados para ${currentPeriodo}.`);
      // Refrescar pagos si estamos viendo el periodo actual
      if (periodo === currentPeriodo) {
        await fetchPagos();
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar pagos';
      setGenerateResult(`Error: ${message}`);
    } finally {
      setGeneratingPagos(false);
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Pagos y Puntos</h1>
        <p className="text-sm text-zinc-500 mt-1">Gestiona tus pagos y acumula puntos Poppins</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-200">
        <button
          onClick={() => setActiveTab('pagos')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'pagos'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Mis Pagos
          </div>
        </button>
        <button
          onClick={() => setActiveTab('cuentas')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'cuentas'
              ? 'border-violet-600 text-violet-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurar Cuentas
          </div>
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  TAB: MIS PAGOS                                                */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pagos' && (
        <>
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
                  <span className="text-sm text-white/80">Flow.cl</span>
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
                  const config = TIPO_CONFIG[pago.tipo] || TIPO_CONFIG.otro;
                  const Icon = config.icon;
                  const badgeClass = ESTADO_BADGE[pago.estado] || ESTADO_BADGE.pendiente;
                  const puntosGanados = pago.puntos_acumulados || (pago.estado === 'pagado' ? Math.floor(pago.monto / 1000) : null);
                  const alias = pago.cuenta_pago?.alias || pago.descripcion || tipoLabel(pago.tipo);
                  const proveedor = pago.cuenta_pago?.proveedor;

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
                              {alias}
                            </p>
                            {proveedor && (
                              <p className="text-xs text-zinc-500 truncate">{proveedor}</p>
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
                          Pagar
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ── Payment History Table ────────────────────────────────── */}
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
                  {TIPOS_CUENTA.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
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
                                {pago.cuenta_pago?.alias || pago.descripcion || tipoLabel(pago.tipo)}
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
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  TAB: CONFIGURAR CUENTAS                                       */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'cuentas' && (
        <>
          {/* Top actions */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-zinc-900">Cuentas de Pago Configuradas</h2>
            <div className="flex items-center gap-3">
              <button
                onClick={handleGenerarPagos}
                disabled={generatingPagos}
                className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-1.5 text-sm font-medium text-violet-700 hover:bg-violet-100 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {generatingPagos ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CalendarDays className="h-4 w-4" />
                )}
                Generar Pagos del Mes
              </button>
              <button
                onClick={openAddCuenta}
                className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Cuenta
              </button>
            </div>
          </div>

          {/* Generate result message */}
          {generateResult && (
            <div className={`rounded-lg p-4 text-sm ${
              generateResult.startsWith('Error')
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
            }`}>
              {generateResult}
              <button
                onClick={() => setGenerateResult(null)}
                className="ml-2 text-xs underline"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* Loading */}
          {loadingCuentas && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <span className="ml-2 text-sm text-zinc-500">Cargando cuentas...</span>
            </div>
          )}

          {/* Cuentas Grid */}
          {!loadingCuentas && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cuentas.length === 0 ? (
                <div className="col-span-3 text-center py-12 text-zinc-400 text-sm">
                  No hay cuentas configuradas. Agrega tu primera cuenta para comenzar.
                </div>
              ) : (
                cuentas.map((cuenta) => {
                  const config = TIPO_CONFIG[cuenta.tipo] || TIPO_CONFIG.otro;
                  const Icon = config.icon;
                  const trabajadorName = cuenta.trabajador
                    ? `${cuenta.trabajador.nombre} ${cuenta.trabajador.apellido_paterno}`
                    : null;

                  return (
                    <div
                      key={cuenta.id}
                      className={`rounded-xl border bg-white p-4 transition-shadow hover:shadow-sm ${
                        cuenta.activa ? 'border-zinc-200' : 'border-zinc-100 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.iconColor}`}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-zinc-900 truncate">{cuenta.alias}</p>
                            {cuenta.proveedor && (
                              <p className="text-xs text-zinc-500 truncate">{cuenta.proveedor}</p>
                            )}
                            {trabajadorName && (
                              <p className="text-xs text-violet-600 truncate">{trabajadorName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => openEditCuenta(cuenta)}
                            className="rounded-lg p-1.5 hover:bg-zinc-100 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4 text-zinc-400" />
                          </button>
                          <button
                            onClick={() => setDeletingCuenta(cuenta)}
                            className="rounded-lg p-1.5 hover:bg-red-50 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-zinc-400 hover:text-red-500" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs text-zinc-500">
                        {cuenta.numero_cuenta && (
                          <div className="flex justify-between">
                            <span>N cuenta</span>
                            <span className="font-medium text-zinc-700">{cuenta.numero_cuenta}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Monto</span>
                          <span className="font-medium text-zinc-700">
                            {cuenta.monto_fijo ? formatCLP(cuenta.monto_fijo) : 'Variable'}
                          </span>
                        </div>
                        {cuenta.dia_vencimiento && (
                          <div className="flex justify-between">
                            <span>Vencimiento</span>
                            <span className="font-medium text-zinc-700">Dia {cuenta.dia_vencimiento}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-between">
                        <span className={`text-xs font-medium ${cuenta.activa ? 'text-emerald-600' : 'text-zinc-400'}`}>
                          {cuenta.activa ? 'Activa' : 'Inactiva'}
                        </span>
                        <button
                          onClick={() => handleToggleCuenta(cuenta)}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                            cuenta.activa ? 'bg-emerald-500' : 'bg-zinc-300'
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                              cuenta.activa ? 'translate-x-4' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  PAYMENT MODAL                                                  */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !paying && setPaymentModal(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
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

                <div className="px-6 py-5 space-y-5">
                  {/* Payment summary */}
                  <div className="rounded-lg bg-zinc-50 p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Concepto</span>
                      <span className="font-medium text-zinc-900">
                        {paymentModal.cuenta_pago?.alias || paymentModal.descripcion || tipoLabel(paymentModal.tipo)}
                      </span>
                    </div>
                    {paymentModal.cuenta_pago?.proveedor && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-500">Proveedor</span>
                        <span className="font-medium text-zinc-900">
                          {paymentModal.cuenta_pago.proveedor}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Periodo</span>
                      <span className="font-medium text-zinc-900">{paymentModal.periodo}</span>
                    </div>
                    <div className="border-t border-zinc-200 pt-3 flex justify-between">
                      <span className="text-sm font-medium text-zinc-700">Total a pagar</span>
                      <span className="text-lg font-bold text-zinc-900">{formatCLP(paymentModal.monto)}</span>
                    </div>
                  </div>

                  {/* Flow info */}
                  <div className="flex items-center gap-3 rounded-lg border border-zinc-200 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-400 to-orange-600">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-900">Pago seguro con Flow.cl</p>
                      <p className="text-xs text-zinc-500">Webpay, tarjetas de credito/debito</p>
                    </div>
                  </div>

                  {/* Points preview */}
                  <div className="flex items-center gap-2 rounded-lg bg-violet-50 p-3">
                    <Sparkles className="h-5 w-5 text-violet-500" />
                    <div>
                      <p className="text-sm font-medium text-violet-700">
                        Ganaras +{Math.floor(paymentModal.monto / 1000).toLocaleString('es-CL')} puntos
                      </p>
                      <p className="text-xs text-violet-500">1 punto por cada $1.000 pagados</p>
                    </div>
                  </div>

                  {payError && (
                    <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                      <p className="text-sm text-red-700">{payError}</p>
                    </div>
                  )}
                </div>

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
                      'Confirmar y Pagar'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  CUENTA ADD/EDIT MODAL                                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {cuentaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !savingCuenta && setCuentaModal(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-lg w-full mx-4 overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h3 className="text-lg font-semibold text-zinc-900">
                {cuentaModal === 'add' ? 'Agregar Cuenta de Pago' : 'Editar Cuenta de Pago'}
              </h3>
              <button
                onClick={() => !savingCuenta && setCuentaModal(null)}
                disabled={savingCuenta}
                className="rounded-lg p-1 hover:bg-zinc-100 transition-colors disabled:opacity-50"
              >
                <X className="h-5 w-5 text-zinc-400" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Tipo</label>
                <select
                  value={cuentaForm.tipo}
                  onChange={(e) => setCuentaForm(f => ({ ...f, tipo: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                >
                  {TIPOS_CUENTA.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              {/* Alias */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Alias</label>
                <input
                  type="text"
                  value={cuentaForm.alias}
                  onChange={(e) => setCuentaForm(f => ({ ...f, alias: e.target.value }))}
                  placeholder="Ej: Agua potable"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Proveedor */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Proveedor</label>
                <input
                  type="text"
                  value={cuentaForm.proveedor}
                  onChange={(e) => setCuentaForm(f => ({ ...f, proveedor: e.target.value }))}
                  placeholder="Ej: Aguas Andinas"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Numero cuenta */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Numero de cuenta (opcional)</label>
                <input
                  type="text"
                  value={cuentaForm.numero_cuenta}
                  onChange={(e) => setCuentaForm(f => ({ ...f, numero_cuenta: e.target.value }))}
                  placeholder="Ej: 123456789"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Monto fijo */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">
                  Monto fijo (opcional - dejar vacio para monto variable)
                </label>
                <input
                  type="number"
                  value={cuentaForm.monto_fijo}
                  onChange={(e) => setCuentaForm(f => ({ ...f, monto_fijo: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Dia vencimiento */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Dia de vencimiento (1-28)</label>
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={cuentaForm.dia_vencimiento}
                  onChange={(e) => setCuentaForm(f => ({ ...f, dia_vencimiento: e.target.value }))}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              </div>

              {/* Trabajador (solo para sueldo_empleado) */}
              {cuentaForm.tipo === 'sueldo_empleado' && (
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-1">Trabajador/a</label>
                  <select
                    value={cuentaForm.referencia_trabajador_id}
                    onChange={(e) => setCuentaForm(f => ({ ...f, referencia_trabajador_id: e.target.value }))}
                    className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar trabajador/a</option>
                    {trabajadores.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre} {t.apellido_paterno}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-1">Notas (opcional)</label>
                <textarea
                  value={cuentaForm.notas}
                  onChange={(e) => setCuentaForm(f => ({ ...f, notas: e.target.value }))}
                  rows={3}
                  placeholder="Notas adicionales..."
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                />
              </div>

              {cuentaError && (
                <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="text-sm text-red-700">{cuentaError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-zinc-100 flex gap-3">
              <button
                onClick={() => setCuentaModal(null)}
                disabled={savingCuenta}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveCuenta}
                disabled={savingCuenta}
                className="flex-1 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {savingCuenta ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  'Guardar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/*  DELETE CONFIRMATION MODAL                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {deletingCuenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDeletingCuenta(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-zinc-900 mb-2">Eliminar Cuenta</h3>
            <p className="text-sm text-zinc-500 mb-6">
              Estas seguro de que deseas eliminar <strong>{deletingCuenta.alias}</strong>?
              Esta accion no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingCuenta(null)}
                className="flex-1 rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteCuenta}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PagosPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" /></div>}>
      <PagosContent />
    </Suspense>
  );
}
