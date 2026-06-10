// PATCH /api/contratos/[id]
// Edita el contrato. Valida según Art. 9-11 + 146-152 CT.
// Si cambian campos legales clave (sueldo, jornada, cargo, beneficios, etc.)
// auto-crea anexo versionado en `contratos_anexos` con el diff.
//
// DELETE /api/contratos/[id] → marca contrato como 'inactivo'. Para terminación
// con causal + finiquito legal, usar POST /api/payroll/finiquito.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';
import { buildSnapshotForPeriod } from '@/lib/payroll-cl/snapshot-builder';

export const runtime = 'nodejs';

const EDITABLE_FIELDS = [
  'sueldo_base', 'horas_semanales', 'fecha_termino', 'fecha_inicio',
  'cargo', 'tipo_gratificacion', 'tiene_gratificacion', 'tipo_contrato',
  'tipo_jornada',
  // Campos nuevos TCP
  'puertas_adentro', 'lugar_servicios', 'distribucion_horaria',
  'beneficios', 'viajes_familia', 'descanso_semanal',
] as const;

// Cambios en estos campos disparan creación automática de anexo legal
const FIELDS_THAT_TRIGGER_ANEXO = new Set([
  'sueldo_base', 'horas_semanales', 'fecha_termino', 'cargo',
  'tipo_contrato', 'puertas_adentro', 'distribucion_horaria',
  'beneficios', 'viajes_familia', 'descanso_semanal', 'lugar_servicios',
]);

function getClientIp(request: Request): string | null {
  const h = request.headers;
  return h.get('x-forwarded-for')?.split(',')[0]?.trim()
    || h.get('cf-connecting-ip')
    || h.get('x-real-ip')
    || null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  // Trae contrato actual completo para detectar diffs
  const { data: existing } = await supabase
    .from('contratos')
    .select('*')
    .eq('id', id).eq('empleador_id', empleadorId).maybeSingle();
  if (!existing) return NextResponse.json({ ok: false, error: 'no_encontrado' }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const update: Record<string, any> = {};
  for (const f of EDITABLE_FIELDS) if (f in body) update[f] = body[f];
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: false, error: 'sin_cambios' }, { status: 422 });
  }

  // ── Validaciones legales TCP ─────────────────────────────────────────────
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validación 1: sueldo bajo mínimo TCP
  const sueldoFinal = Number(update.sueldo_base ?? existing.sueldo_base);
  if (sueldoFinal > 0) {
    try {
      const today = new Date().toISOString().slice(0, 7);
      const snapshot = await buildSnapshotForPeriod(today);
      const minimo = (snapshot as any).minimumIncomeHouseholdWorker ?? (snapshot as any).minimumIncomeGeneral ?? 500000;
      if (sueldoFinal < minimo) {
        errors.push(`Sueldo $${sueldoFinal.toLocaleString('es-CL')} es menor al mínimo TCP $${minimo.toLocaleString('es-CL')} (infracción DT).`);
      }
    } catch { /* snapshot opcional */ }
  }

  // Validación 2: plazo fijo exige fecha_termino
  const tipoFinal = update.tipo_contrato ?? existing.tipo_contrato;
  const fechaTerminoFinal = update.fecha_termino ?? existing.fecha_termino;
  if (tipoFinal === 'plazo_fijo' && !fechaTerminoFinal) {
    errors.push('Contrato a plazo fijo requiere fecha de término (Art. 10 N°6 CT).');
  }

  // Validación 3: horas semanales TCP máx 45 (Art. 22 + 149 CT)
  const horasFinal = Number(update.horas_semanales ?? existing.horas_semanales ?? 45);
  if (horasFinal > 45) {
    errors.push(`Horas semanales (${horasFinal}) exceden el máximo legal de 45 horas (Art. 22 CT).`);
  }

  // Validación 4: plazo fijo > 1 año → warning (Art. 159 N°4: máx 1 año TCP)
  if (tipoFinal === 'plazo_fijo' && fechaTerminoFinal) {
    const inicio = new Date(update.fecha_inicio ?? existing.fecha_inicio);
    const termino = new Date(fechaTerminoFinal);
    const dias = (termino.getTime() - inicio.getTime()) / 86400000;
    if (dias > 365) {
      warnings.push('Plazo fijo > 1 año. Si se renueva, se transforma en indefinido (Art. 159 N°4 CT).');
    }
  }

  // Validación 5: si puertas_adentro=true → descanso_semanal puede ser 'domingo' (Art. 151)
  // (informativo, no bloqueante)

  if (errors.length > 0) {
    return NextResponse.json({
      ok: false, error: 'validacion_legal', detalles: errors, warnings,
    }, { status: 422 });
  }

  // ── Detectar cambios que requieren anexo ─────────────────────────────────
  const cambiosLegales: Record<string, { antes: any; despues: any }> = {};
  for (const f of Object.keys(update)) {
    if (!FIELDS_THAT_TRIGGER_ANEXO.has(f)) continue;
    const antes = existing[f];
    const despues = update[f];
    const eq = JSON.stringify(antes) === JSON.stringify(despues);
    if (!eq) cambiosLegales[f] = { antes, despues };
  }

  // ── Aplicar update ───────────────────────────────────────────────────────
  const { error } = await supabase.from('contratos').update(update).eq('id', id);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // ── Crear anexo automático si hubo cambios legales ──────────────────────
  let anexoId: string | null = null;
  if (Object.keys(cambiosLegales).length > 0) {
    const { data: maxAnexo } = await supabase
      .from('contratos_anexos')
      .select('numero_anexo').eq('contrato_id', id)
      .order('numero_anexo', { ascending: false }).limit(1).maybeSingle();
    const numero = (maxAnexo?.numero_anexo ?? 0) + 1;

    // Inferir motivo principal del primer campo modificado
    const firstField = Object.keys(cambiosLegales)[0];
    const motivoMap: Record<string, string> = {
      sueldo_base: 'cambio_sueldo', horas_semanales: 'cambio_jornada',
      cargo: 'cambio_cargo', tipo_contrato: 'cambio_tipo',
      puertas_adentro: 'cambio_modalidad', beneficios: 'cambio_beneficios',
    };
    const motivo = motivoMap[firstField] ?? 'otro';

    const { data: anexo } = await supabase
      .from('contratos_anexos')
      .insert({
        contrato_id: id,
        empleador_id: empleadorId,
        trabajador_id: existing.trabajador_id,
        numero_anexo: numero,
        motivo,
        cambios: cambiosLegales,
        ip_firma_empleador: getClientIp(request),
        fecha_firma_empleador: new Date().toISOString(),
        created_by: user.id,
      })
      .select('id').single();
    anexoId = anexo?.id ?? null;
  }

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'contrato.update',
    entity: 'contrato', entityId: id,
    payload: { update, cambiosLegales, anexoId },
    request,
  });

  return NextResponse.json({
    ok: true,
    ...(warnings.length > 0 && { warnings }),
    ...(anexoId && { anexoCreado: anexoId }),
  });
}
