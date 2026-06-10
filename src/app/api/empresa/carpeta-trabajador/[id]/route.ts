// GET /api/empresa/carpeta-trabajador/[id]
// Devuelve la carpeta laboral digital consolidada del trabajador:
// contrato + anexos + finiquito + liquidaciones + recibos firmados + licencias + documentos manuales.
// Cumple con Art. 9 CT (deber del empleador de mantener documentación).

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: trabajadorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Verificar pertenencia
  const { data: own } = await supabase
    .from('contratos').select('id').eq('trabajador_id', trabajadorId).eq('empleador_id', empleadorId).limit(1);
  if (!own || own.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_acceso' }, { status: 403 });
  }

  const [
    { data: contratos },
    { data: anexos },
    { data: finiquitos },
    { data: liquidaciones },
    { data: licencias },
    { data: docs },
  ] = await Promise.all([
    supabase.from('contratos')
      .select('id, fecha_inicio, fecha_termino, tipo_contrato, estado, pdf_url, fecha_firma_empleador, fecha_firma_trabajador')
      .eq('trabajador_id', trabajadorId).eq('empleador_id', empleadorId)
      .order('fecha_inicio', { ascending: false }),
    supabase.from('contratos_anexos')
      .select('id, contrato_id, numero_anexo, fecha_anexo, motivo, pdf_url, fecha_firma_empleador, fecha_firma_trabajador')
      .eq('trabajador_id', trabajadorId).eq('empleador_id', empleadorId)
      .order('fecha_anexo', { ascending: false }),
    supabase.from('finiquitos')
      .select('id, fecha_termino, causal, total_finiquito, voided')
      .eq('trabajador_id', trabajadorId).eq('empleador_id', empleadorId).eq('voided', false)
      .order('fecha_termino', { ascending: false }),
    supabase.from('payroll_results')
      .select('id, payroll_period, net_pay, pagado_at, medio_pago, recibo_firmado_at')
      .eq('worker_id', trabajadorId).eq('empleador_id', empleadorId).eq('voided', false)
      .order('payroll_period', { ascending: false }),
    supabase.from('licencias_medicas')
      .select('id, periodo, tipo, fecha_inicio, fecha_fin, documento_url, documento_nombre')
      .eq('trabajador_id', trabajadorId).eq('empleador_id', empleadorId)
      .order('fecha_inicio', { ascending: false }),
    supabase.from('documentos_empleado')
      .select('id, tipo, nombre, archivo_url, created_at')
      .eq('trabajador_id', trabajadorId)
      .order('created_at', { ascending: false }),
  ]);

  return NextResponse.json({
    ok: true,
    carpeta: {
      contratos: contratos ?? [],
      anexos: anexos ?? [],
      finiquitos: finiquitos ?? [],
      liquidaciones: liquidaciones ?? [],
      licencias: licencias ?? [],
      documentos: docs ?? [],
    },
  });
}
