// POST /api/payroll/finiquito
// Body: {
//   trabajador_id, fecha_termino: 'YYYY-MM-DD', causal: '161-1'|...,
//   dias_vacaciones_pendientes?: number, dias_vacaciones_proporcionales?: number,
//   aviso_previo_dado?: boolean, ultima_remuneracion?: number, observaciones?: string,
//   mode?: 'preview' | 'final' | 'pdf'   (default 'preview')
// }
//
// - preview: solo calcula y devuelve el resultado (no persiste).
// - final:   persiste en finiquitos + marca contrato como inactivo + setea causal/terminado_at.
// - pdf:     descarga el PDF del finiquito ya persistido (busca por trabajador_id + fecha).
//
// Usa el engine puro src/lib/payroll/finiquito-engine.ts.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';
import { calcularFiniquito } from '@/lib/payroll/finiquito-engine';
import { FiniquitoDocument, type FiniquitoPdfData } from '@/lib/payroll-cl/finiquito-pdf';
import { buildSnapshotForPeriod } from '@/lib/payroll-cl/snapshot-builder';
import type { CausalTermino } from '@/lib/payroll/finiquito-types';

export const runtime = 'nodejs';

function fmtFecha(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : '')) : iso;
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  return `${dd} ${meses[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatRut(rut: string | null | undefined): string {
  if (!rut) return '';
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return rut;
  const dv = clean.slice(-1);
  const num = clean.slice(0, -1);
  return `${num.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

function dedupeWords(s: string): string {
  const parts = (s || '').trim().split(/\s+/);
  for (let len = Math.floor(parts.length / 2); len > 0; len--) {
    const a = parts.slice(parts.length - 2 * len, parts.length - len).join(' ').toLowerCase();
    const b = parts.slice(parts.length - len).join(' ').toLowerCase();
    if (a && a === b) return parts.slice(0, parts.length - len).join(' ');
  }
  return parts.join(' ');
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'sin_empleador' }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body?.trabajador_id || !body?.fecha_termino || !body?.causal) {
    return NextResponse.json({ ok: false, error: 'campos_requeridos: trabajador_id, fecha_termino, causal' }, { status: 422 });
  }
  const mode = (body.mode ?? 'preview') as 'preview' | 'final' | 'pdf';

  // Trabajador + contrato activo
  const { data: trab } = await supabase
    .from('trabajadores')
    .select('id, rut, nombre, apellido_paterno, apellido_materno, cargo')
    .eq('id', body.trabajador_id).single();
  if (!trab) return NextResponse.json({ ok: false, error: 'trabajador_no_encontrado' }, { status: 404 });

  const { data: contrato } = await supabase
    .from('contratos')
    .select('id, fecha_inicio, sueldo_base, tipo_contrato, tipo_gratificacion')
    .eq('trabajador_id', body.trabajador_id)
    .eq('empleador_id', empleadorId)
    .eq('estado', 'activo')
    .maybeSingle();
  if (!contrato) return NextResponse.json({ ok: false, error: 'sin_contrato_activo' }, { status: 404 });

  const { data: empData } = await supabase
    .from('empleadores').select('nombre, apellido, rut').eq('id', empleadorId).single();

  // mode=pdf → buscar finiquito persistido y renderizar
  if (mode === 'pdf') {
    const { data: fin } = await supabase
      .from('finiquitos')
      .select('*')
      .eq('trabajador_id', body.trabajador_id)
      .eq('empleador_id', empleadorId)
      .eq('voided', false)
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    if (!fin) return NextResponse.json({ ok: false, error: 'finiquito_no_encontrado' }, { status: 404 });
    return renderPdf({
      fin, trab, empData,
      contratoFechaInicio: contrato.fecha_inicio,
    });
  }

  // Snapshot para IMM
  const periodoFin = body.fecha_termino.slice(0, 7); // 'YYYY-MM'
  const snapshot = await buildSnapshotForPeriod(periodoFin);
  const imm = snapshot.minimumIncomeHouseholdWorker ?? snapshot.minimumIncomeGeneral ?? 500000;

  const ultimaRemuneracion = Number(body.ultima_remuneracion ?? contrato.sueldo_base);

  const fechaTermino = new Date(body.fecha_termino + 'T00:00:00Z');
  const fechaInicio  = new Date(contrato.fecha_inicio + 'T00:00:00Z');

  const result = calcularFiniquito({
    empleado: {
      rut: trab.rut,
      nombre: trab.nombre,
      apellido_paterno: trab.apellido_paterno,
      apellido_materno: trab.apellido_materno ?? '',
      fecha_ingreso: fechaInicio,
    },
    contrato: {
      tipo: (contrato.tipo_contrato === 'plazo_fijo' ? 'plazo_fijo'
            : contrato.tipo_contrato === 'obra_faena' ? 'obra_faena'
            : 'indefinido'),
      fecha_inicio: fechaInicio,
      sueldo_base: contrato.sueldo_base,
      tipo_gratificacion: (contrato.tipo_gratificacion === 'art_47' ? 'art_47' : 'art_50'),
      inicio_antes_1981: fechaInicio < new Date('1981-08-14T00:00:00Z'),
    },
    fecha_termino: fechaTermino,
    causal: body.causal as CausalTermino,
    dias_vacaciones_pendientes: Number(body.dias_vacaciones_pendientes ?? 0),
    dias_vacaciones_proporcionales: Number(body.dias_vacaciones_proporcionales ?? 0),
    ultima_remuneracion: ultimaRemuneracion,
    aviso_previo_dado: !!body.aviso_previo_dado,
    imm,
  });

  if (mode === 'preview') {
    return NextResponse.json({ ok: true, mode, result });
  }

  // mode=final: persistir + terminar contrato
  const { data: inserted, error: insErr } = await supabase
    .from('finiquitos')
    .insert({
      empleador_id: empleadorId,
      trabajador_id: trab.id,
      contrato_id: contrato.id,
      fecha_termino: body.fecha_termino,
      causal: body.causal,
      aviso_previo_dado: !!body.aviso_previo_dado,
      sueldo_base: contrato.sueldo_base,
      ultima_remuneracion: ultimaRemuneracion,
      dias_vacaciones_pendientes: Number(body.dias_vacaciones_pendientes ?? 0),
      dias_vacaciones_proporcionales: Number(body.dias_vacaciones_proporcionales ?? 0),
      imm_periodo: imm,
      remuneracion_dias_trabajados: result.remuneracion_dias_trabajados,
      dias_trabajados_mes: result.dias_trabajados_mes,
      vacaciones_pendientes_monto: result.vacaciones_pendientes,
      vacaciones_proporcionales_monto: result.vacaciones_proporcionales,
      gratificacion_proporcional: result.gratificacion_proporcional,
      meses_trabajados_ano: result.meses_trabajados_ano,
      indemnizacion_aviso_previo: result.indemnizacion_aviso_previo,
      indemnizacion_anos_servicio: result.indemnizacion_anos_servicio,
      meses_indemnizacion: result.meses_indemnizacion,
      tope_11_anos_aplicado: result.tope_11_anos_aplicado,
      anos_servicio: result.anos_servicio,
      total_finiquito: result.total_finiquito,
      observaciones: body.observaciones ?? null,
      created_by: user.id,
    })
    .select('id').single();

  if (insErr) return NextResponse.json({ ok: false, error: insErr.message }, { status: 500 });

  // Marcar contrato como terminado
  await supabase
    .from('contratos')
    .update({
      estado: 'inactivo',
      fecha_termino: body.fecha_termino,
      causal_termino: body.causal,
      terminado_at: new Date().toISOString(),
      terminado_por: user.id,
    })
    .eq('id', contrato.id);

  await auditLog(supabase, {
    userId: user.id, empleadorId,
    action: 'finiquito.create',
    entity: 'trabajador', entityId: trab.id,
    payload: {
      causal: body.causal, fecha_termino: body.fecha_termino,
      total: result.total_finiquito, finiquito_id: inserted.id,
    },
    request,
  });

  return NextResponse.json({ ok: true, mode, finiquitoId: inserted.id, result });
}

async function renderPdf(args: { fin: any; trab: any; empData: any; contratoFechaInicio: string }) {
  const { fin, trab, empData } = args;
  const empleadorNombre = dedupeWords(`${empData?.nombre ?? ''} ${empData?.apellido ?? ''}`.trim()) || 'Empleador';
  const trabajadorNombre = [trab.nombre, trab.apellido_paterno, trab.apellido_materno].filter(Boolean).join(' ');

  const data: FiniquitoPdfData = {
    empleadorNombre,
    empleadorRut: formatRut(empData?.rut),
    trabajadorNombre,
    trabajadorRut: formatRut(trab.rut),
    cargo: trab.cargo ?? undefined,
    fechaInicio: fmtFecha(args.contratoFechaInicio),
    fechaTermino: fmtFecha(fin.fecha_termino),
    causal: fin.causal,
    anosServicio: fin.anos_servicio,
    sueldoBase: fin.sueldo_base,
    ultimaRemuneracion: fin.ultima_remuneracion,
    diasTrabajadosMes: fin.dias_trabajados_mes,
    diasVacacionesPendientes: Number(fin.dias_vacaciones_pendientes),
    diasVacacionesProporcionales: Number(fin.dias_vacaciones_proporcionales),
    mesesTrabajadosAno: fin.meses_trabajados_ano,
    mesesIndemnizacion: fin.meses_indemnizacion,
    tope11AnosAplicado: fin.tope_11_anos_aplicado,
    avisoPrevioDado: fin.aviso_previo_dado,
    remuneracionDiasTrabajados: fin.remuneracion_dias_trabajados,
    vacacionesPendientesMonto: fin.vacaciones_pendientes_monto,
    vacacionesProporcionalesMonto: fin.vacaciones_proporcionales_monto,
    gratificacionProporcional: fin.gratificacion_proporcional,
    indemnizacionAvisoPrevio: fin.indemnizacion_aviso_previo,
    indemnizacionAnosServicio: fin.indemnizacion_anos_servicio,
    totalFiniquito: fin.total_finiquito,
    observaciones: fin.observaciones ?? undefined,
  };

  const buffer = await renderToBuffer(React.createElement(FiniquitoDocument, { data }) as any);
  const rut = trab.rut?.replace(/\./g, '').replace('-', '') ?? 'trab';
  const filename = `finiquito_${rut}_${String(fin.fecha_termino).replace(/-/g, '')}.pdf`;

  return new Response(buffer.buffer as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
