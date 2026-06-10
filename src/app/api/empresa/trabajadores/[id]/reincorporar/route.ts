// POST /api/empresa/trabajadores/[id]/reincorporar
// Body: { sueldo_base, fecha_inicio, cargo?, horas_semanales?, tipo_contrato? }
// Crea un nuevo contrato activo para un trabajador previamente terminado.
// La antigüedad NO es continua: cada contrato es independiente legalmente.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: trabajadorId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  if (!body.sueldo_base || !body.fecha_inicio) {
    return NextResponse.json({ ok: false, error: 'campos_requeridos: sueldo_base, fecha_inicio' }, { status: 422 });
  }

  // Verifica que el trabajador exista y haya tenido contrato con este empleador
  const { data: contratosPrev } = await supabase
    .from('contratos').select('id, estado, cargo, horas_semanales, tipo_contrato, tipo_gratificacion')
    .eq('trabajador_id', trabajadorId).eq('empleador_id', empleadorId)
    .order('created_at', { ascending: false });
  if (!contratosPrev || contratosPrev.length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_historial' }, { status: 404 });
  }

  // No reincorporar si ya tiene contrato activo
  if (contratosPrev.some(c => c.estado === 'activo')) {
    return NextResponse.json({ ok: false, error: 'ya_tiene_contrato_activo' }, { status: 409 });
  }

  const ultimoContrato = contratosPrev[0];

  // Crear contrato nuevo (independiente)
  const { data: nuevo, error } = await supabase
    .from('contratos')
    .insert({
      trabajador_id: trabajadorId,
      empleador_id: empleadorId,
      numero_contrato: `PA-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
      sueldo_base: Number(body.sueldo_base),
      fecha_inicio: body.fecha_inicio,
      cargo: body.cargo ?? ultimoContrato.cargo ?? null,
      horas_semanales: Number(body.horas_semanales ?? ultimoContrato.horas_semanales ?? 45),
      tipo_contrato: body.tipo_contrato ?? ultimoContrato.tipo_contrato ?? 'indefinido',
      tipo_gratificacion: ultimoContrato.tipo_gratificacion ?? 'art_50',
      tiene_gratificacion: true,
      estado: 'activo',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'trabajador.reincorporar',
    entity: 'trabajador', entityId: trabajadorId,
    payload: { nuevoContratoId: nuevo.id, sueldoBase: body.sueldo_base },
    request,
  });

  return NextResponse.json({ ok: true, contratoId: nuevo.id });
}
