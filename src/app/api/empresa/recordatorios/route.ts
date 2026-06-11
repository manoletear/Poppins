// GET /api/empresa/recordatorios
// Devuelve recordatorios proactivos para la dueña del hogar:
//  - cierre del mes (Art. 55 CT: pagar antes del día 5 del mes siguiente)
//  - contratos por vencer en <= 30 días
//  - anexos sin firma del trabajador hace > 7 días
//  - vacaciones acumuladas > 20 días
//  - trabajadores con datos legales incompletos
//  - período abierto sin cerrar
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { validarCamposTrabajador } from '@/lib/validaciones/trabajador';

export const runtime = 'nodejs';

type Severity = 'urgent' | 'warning' | 'info';
interface Recordatorio {
  id: string;
  severity: Severity;
  titulo: string;
  detalle: string;
  cta?: { label: string; href: string };
  icon: 'calendar' | 'file' | 'user' | 'umbrella' | 'alert';
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const recordatorios: Recordatorio[] = [];
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const periodoActual = `${yyyy}-${mm}`;
  const mesAnterior = new Date(yyyy, now.getMonth() - 1, 1);
  const periodoAnterior = `${mesAnterior.getFullYear()}-${String(mesAnterior.getMonth() + 1).padStart(2, '0')}`;

  // 1) Cierre del mes anterior — Art. 55 CT: pagar a más tardar el día 5 del mes siguiente.
  const diaDelMes = now.getDate();
  const diasParaVencer = 5 - diaDelMes;
  const { data: liqMesAnterior } = await supabase
    .from('payroll_results')
    .select('id, pagado_at')
    .eq('empleador_id', empleadorId)
    .eq('payroll_period', periodoAnterior)
    .eq('voided', false);
  const totalLiq = liqMesAnterior?.length ?? 0;
  const totalPagadas = (liqMesAnterior ?? []).filter(r => r.pagado_at).length;
  const pendientes = totalLiq - totalPagadas;
  if (totalLiq === 0 && diaDelMes > 1) {
    // No se cerró el mes anterior: urgente
    recordatorios.push({
      id: `cierre-${periodoAnterior}`,
      severity: diasParaVencer < 0 ? 'urgent' : diasParaVencer <= 2 ? 'warning' : 'info',
      titulo: `Aún no has cerrado ${nombreMes(periodoAnterior)}`,
      detalle: diasParaVencer < 0
        ? `Plazo vencido hace ${-diasParaVencer} días. Cierra ahora para evitar multas (Art. 55 CT).`
        : diasParaVencer === 0
        ? 'Vence HOY. Cierra el mes antes de medianoche.'
        : `Te quedan ${diasParaVencer} día${diasParaVencer === 1 ? '' : 's'} para cerrar (vence el 5 de ${nombreMes(periodoActual)}).`,
      cta: { label: 'Cerrar el mes', href: '/hogar/remuneraciones' },
      icon: 'calendar',
    });
  } else if (pendientes > 0) {
    recordatorios.push({
      id: `pago-${periodoAnterior}`,
      severity: diasParaVencer < 0 ? 'urgent' : diasParaVencer <= 2 ? 'warning' : 'info',
      titulo: `${pendientes} liquidación${pendientes === 1 ? '' : 'es'} sin marcar como pagada${pendientes === 1 ? '' : 's'}`,
      detalle: `Período ${nombreMes(periodoAnterior)}. Marca el pago cuando lo hagas para que el trabajador firme el recibo.`,
      cta: { label: 'Ver liquidaciones', href: '/hogar/liquidaciones' },
      icon: 'file',
    });
  }

  // 2) Contratos por vencer en <= 30 días (sólo plazo fijo)
  const hoy30 = new Date(now);
  hoy30.setDate(hoy30.getDate() + 30);
  const hoy30Str = hoy30.toISOString().slice(0, 10);
  const { data: contratosPorVencer } = await supabase
    .from('contratos')
    .select('id, fecha_termino, tipo_contrato, trabajadores(nombre, apellido_paterno)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo')
    .not('fecha_termino', 'is', null)
    .lte('fecha_termino', hoy30Str);
  for (const c of (contratosPorVencer ?? []) as any[]) {
    const dias = Math.ceil(
      (new Date(c.fecha_termino).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (dias < 0) continue;
    const trab = c.trabajadores;
    const nombre = trab ? `${trab.nombre} ${trab.apellido_paterno}`.trim() : 'Trabajador';
    recordatorios.push({
      id: `contrato-vence-${c.id}`,
      severity: dias <= 7 ? 'urgent' : dias <= 15 ? 'warning' : 'info',
      titulo: `Contrato de ${nombre} vence en ${dias} día${dias === 1 ? '' : 's'}`,
      detalle: `${c.fecha_termino} (${c.tipo_contrato}). Decide si renuevas, conviertes a indefinido o terminas el contrato.`,
      cta: { label: 'Ver contrato', href: '/hogar/empleados' },
      icon: 'file',
    });
  }

  // 3) Anexos sin firma del trabajador hace > 7 días
  const hace7 = new Date(now);
  hace7.setDate(hace7.getDate() - 7);
  const hace7Str = hace7.toISOString();
  const { data: anexosSinFirmar } = await supabase
    .from('contratos_anexos')
    .select('id, created_at, fecha_firma_trabajador, trabajadores(nombre, apellido_paterno)')
    .eq('empleador_id', empleadorId)
    .is('fecha_firma_trabajador', null)
    .lt('created_at', hace7Str);
  for (const a of (anexosSinFirmar ?? []) as any[]) {
    const trab = a.trabajadores;
    const nombre = trab ? `${trab.nombre} ${trab.apellido_paterno}`.trim() : 'Trabajador';
    const dias = Math.floor((now.getTime() - new Date(a.created_at).getTime()) / 86400000);
    recordatorios.push({
      id: `anexo-${a.id}`,
      severity: 'warning',
      titulo: `Anexo sin firmar por ${nombre} hace ${dias} días`,
      detalle: 'El trabajador debe firmar el anexo. Recuérdaselo desde su portal.',
      cta: { label: 'Ver anexo', href: '/hogar/empleados' },
      icon: 'file',
    });
  }

  // 4) Vacaciones acumuladas > 20 días por trabajador
  const { data: contratosActivos } = await supabase
    .from('contratos')
    .select('id, fecha_inicio, trabajador_id, trabajadores(nombre, apellido_paterno)')
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo');
  for (const c of (contratosActivos ?? []) as any[]) {
    if (!c.fecha_inicio) continue;
    const inicio = new Date(c.fecha_inicio);
    const anios = (now.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const derecho = Math.floor(anios * 15);
    const { data: vacAprobadas } = await supabase
      .from('solicitudes_empleado')
      .select('dias')
      .eq('empleador_id', empleadorId)
      .eq('trabajador_id', c.trabajador_id)
      .eq('tipo', 'vacaciones')
      .eq('estado', 'aprobada');
    const tomados = (vacAprobadas ?? []).reduce((s, v: any) => s + (v.dias || 0), 0);
    const acumulados = derecho - tomados;
    if (acumulados >= 20) {
      const trab = c.trabajadores;
      const nombre = trab ? `${trab.nombre} ${trab.apellido_paterno}`.trim() : 'Trabajador';
      recordatorios.push({
        id: `vac-${c.id}`,
        severity: acumulados >= 30 ? 'warning' : 'info',
        titulo: `${nombre} acumula ${acumulados} días de vacaciones`,
        detalle: 'Vacaciones no tomadas suman día a día. Programen el descanso para evitar pago compensatorio al terminar el contrato.',
        cta: { label: 'Ver vacaciones', href: '/hogar/solicitudes' },
        icon: 'umbrella',
      });
    }
  }

  // 5) Trabajadores con datos legales incompletos
  const { data: todosLosTrab } = await supabase
    .from('trabajadores')
    .select(`id, rut, nombre, apellido_paterno, fecha_nacimiento, email,
             direccion, comuna, region, afp_id, salud_id, salud_tipo, salud_plan_uf,
             es_pensionado, banco, tipo_cuenta, numero_cuenta, payment_method,
             contratos!inner(empleador_id, estado)`)
    .eq('contratos.empleador_id', empleadorId)
    .eq('contratos.estado', 'activo');
  for (const t of (todosLosTrab ?? []) as any[]) {
    const v = validarCamposTrabajador(t);
    if (!v.ok) {
      recordatorios.push({
        id: `datos-${t.id}`,
        severity: 'warning',
        titulo: `Faltan datos de ${t.nombre} ${t.apellido_paterno}`,
        detalle: `Sin esto no se puede liquidar: ${v.faltantes.slice(0, 3).join(', ')}${v.faltantes.length > 3 ? '…' : ''}`,
        cta: { label: 'Completar', href: `/hogar/empleados/${t.id}` },
        icon: 'user',
      });
    }
  }

  // Ordenar por severidad: urgent → warning → info
  const orden: Record<Severity, number> = { urgent: 0, warning: 1, info: 2 };
  recordatorios.sort((a, b) => orden[a.severity] - orden[b.severity]);

  return NextResponse.json({ ok: true, data: recordatorios });
}

function nombreMes(periodo: string): string {
  const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const [y, m] = periodo.split('-');
  return `${MESES[Number(m) - 1]} ${y}`;
}
