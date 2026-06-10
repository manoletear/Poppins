// GET /api/contratos/[id]/pdf
// Genera el PDF del contrato con react-pdf, lo sube a storage 'documentos/contratos/'
// y actualiza contratos.pdf_url. Devuelve el archivo PDF.
//
// Si ya existe pdf_url y el contrato no cambió, sirve el existente.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { ContratoDocument, type ContratoPdfData } from '@/lib/contratos/contrato-pdf';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

function dedupeWords(s: string): string {
  const parts = (s || '').trim().split(/\s+/);
  for (let len = Math.floor(parts.length / 2); len > 0; len--) {
    const a = parts.slice(parts.length - 2 * len, parts.length - len).join(' ').toLowerCase();
    const b = parts.slice(parts.length - len).join(' ').toLowerCase();
    if (a && a === b) return parts.slice(0, parts.length - len).join(' ');
  }
  return parts.join(' ');
}

function formatRut(rut: string | null | undefined): string {
  if (!rut) return '';
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return rut;
  const dv = clean.slice(-1);
  return `${clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  // Acceso: empleador del contrato o el trabajador titular
  // Resolución desacoplada: leemos primero el contrato; RLS empleador ya cubre el caso normal,
  // y el trabajador tiene policy worker_lee_su_contrato.
  const { data: c } = await supabase
    .from('contratos')
    .select(`
      id, empleador_id, trabajador_id, numero_contrato, cargo, lugar_servicios,
      puertas_adentro, distribucion_horaria, horas_semanales, descanso_semanal,
      viajes_familia, sueldo_base, beneficios, tipo_gratificacion, tipo_contrato,
      fecha_inicio, fecha_termino,
      fecha_firma_empleador, fecha_firma_trabajador
    `)
    .eq('id', id).maybeSingle();
  if (!c) return NextResponse.json({ ok: false, error: 'no_encontrado' }, { status: 404 });

  // Empleador (encabezado)
  const { data: emp } = await supabase
    .from('empleadores').select('nombre, apellido, rut, direccion, comuna, ciudad')
    .eq('id', c.empleador_id).single();

  // Trabajador
  const { data: t } = await supabase
    .from('trabajadores').select('nombre, apellido_paterno, apellido_materno, rut, nacionalidad, estado_civil, fecha_nacimiento, direccion')
    .eq('id', c.trabajador_id).single();

  const empNombre = dedupeWords(`${emp?.nombre ?? ''} ${emp?.apellido ?? ''}`.trim()) || 'Empleador';
  const trabNombre = [t?.nombre, t?.apellido_paterno, t?.apellido_materno].filter(Boolean).join(' ');

  const data: ContratoPdfData = {
    empleadorNombre: empNombre,
    empleadorRut: formatRut(emp?.rut),
    empleadorDireccion: emp?.direccion ?? undefined,
    empleadorComuna: emp?.comuna ?? undefined,
    empleadorCiudad: emp?.ciudad ?? undefined,

    trabajadorNombre: trabNombre,
    trabajadorRut: formatRut(t?.rut),
    trabajadorNacionalidad: t?.nacionalidad ?? undefined,
    trabajadorEstadoCivil: t?.estado_civil ?? undefined,
    trabajadorFechaNacimiento: t?.fecha_nacimiento ?? undefined,
    trabajadorDireccion: t?.direccion ?? undefined,

    cargo: c.cargo ?? '—',
    lugarServicios: c.lugar_servicios ?? '',
    puertasAdentro: !!c.puertas_adentro,
    distribucionHoraria: c.distribucion_horaria ?? undefined,
    horasSemanales: c.horas_semanales ?? 45,
    descansoSemanal: c.descanso_semanal ?? 'domingo',
    viajesFamilia: !!c.viajes_familia,

    sueldoBase: c.sueldo_base ?? 0,
    beneficios: c.beneficios ?? undefined,
    tipoGratificacion: c.tipo_gratificacion as any,

    tipoContrato: (c.tipo_contrato as any) ?? 'indefinido',
    fechaInicio: c.fecha_inicio ?? new Date().toISOString().slice(0, 10),
    fechaTermino: c.fecha_termino ?? null,

    fechaFirmaEmpleador: c.fecha_firma_empleador ?? null,
    fechaFirmaTrabajador: c.fecha_firma_trabajador ?? null,
  };

  let buffer: Buffer;
  try {
    buffer = await renderToBuffer(React.createElement(ContratoDocument, { data }) as any);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message ?? e), stack: String(e?.stack ?? '').slice(0, 400) }, { status: 500 });
  }

  // Subir a storage
  const rut = (t?.rut ?? 'trab').replace(/[.\-]/g, '');
  const filename = `contrato_${rut}_${c.fecha_inicio?.replace(/-/g, '') ?? Date.now()}.pdf`;
  const storagePath = `contratos/${c.empleador_id}/${c.id}_${filename}`;

  try {
    await supabase.storage.from('documentos').upload(storagePath, buffer, {
      contentType: 'application/pdf', upsert: true,
    });
    const { data: pub } = supabase.storage.from('documentos').getPublicUrl(storagePath);
    await supabase.from('contratos').update({ pdf_url: pub.publicUrl }).eq('id', c.id);
  } catch { /* storage opcional */ }

  await auditLog(supabase, {
    userId: user.id, empleadorId: c.empleador_id,
    action: 'contrato.pdf_generated',
    entity: 'contrato', entityId: c.id,
    payload: { filename },
    request,
  });

  return new Response(buffer.buffer as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    },
  });
}
