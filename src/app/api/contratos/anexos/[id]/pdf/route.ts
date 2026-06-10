// GET /api/contratos/anexos/[id]/pdf
// Genera el PDF del anexo y lo sirve. Sube a storage y persiste pdf_url.

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { AnexoDocument, type AnexoPdfData } from '@/lib/contratos/anexo-pdf';
import { auditLog } from '@/lib/audit/log';

export const runtime = 'nodejs';

function formatRut(rut: string | null | undefined): string {
  if (!rut) return '';
  const clean = rut.replace(/[^0-9kK]/g, '').toUpperCase();
  if (clean.length < 2) return rut;
  const dv = clean.slice(-1);
  return `${clean.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${dv}`;
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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const { data: a } = await supabase
    .from('contratos_anexos')
    .select('id, contrato_id, empleador_id, trabajador_id, numero_anexo, fecha_anexo, motivo, cambios, fecha_firma_empleador, fecha_firma_trabajador')
    .eq('id', id).maybeSingle();
  if (!a) return NextResponse.json({ ok: false, error: 'no_encontrado' }, { status: 404 });

  const [{ data: emp }, { data: t }, { data: c }] = await Promise.all([
    supabase.from('empleadores').select('nombre, apellido, rut').eq('id', a.empleador_id).single(),
    supabase.from('trabajadores').select('nombre, apellido_paterno, apellido_materno, rut').eq('id', a.trabajador_id).single(),
    supabase.from('contratos').select('fecha_inicio').eq('id', a.contrato_id).single(),
  ]);

  const data: AnexoPdfData = {
    numero: a.numero_anexo,
    fechaAnexo: a.fecha_anexo,
    motivo: a.motivo ?? 'otro',
    empleadorNombre: dedupeWords(`${emp?.nombre ?? ''} ${emp?.apellido ?? ''}`.trim()) || 'Empleador',
    empleadorRut: formatRut(emp?.rut),
    trabajadorNombre: [t?.nombre, t?.apellido_paterno, t?.apellido_materno].filter(Boolean).join(' '),
    trabajadorRut: formatRut(t?.rut),
    contratoFechaInicio: c?.fecha_inicio ?? '',
    cambios: a.cambios ?? {},
    fechaFirmaEmpleador: a.fecha_firma_empleador,
    fechaFirmaTrabajador: a.fecha_firma_trabajador,
  };

  const buffer = await renderToBuffer(React.createElement(AnexoDocument, { data }) as any);

  const storagePath = `contratos/${a.empleador_id}/anexo_${a.contrato_id}_${a.numero_anexo}.pdf`;
  try {
    await supabase.storage.from('documentos').upload(storagePath, buffer, {
      contentType: 'application/pdf', upsert: true,
    });
    const { data: pub } = supabase.storage.from('documentos').getPublicUrl(storagePath);
    await supabase.from('contratos_anexos').update({ pdf_url: pub.publicUrl }).eq('id', a.id);
  } catch { /* opcional */ }

  await auditLog(supabase, {
    userId: user.id, empleadorId: a.empleador_id,
    action: 'anexo.pdf_generated',
    entity: 'contratos_anexos', entityId: a.id,
    payload: { numero: a.numero_anexo, motivo: a.motivo },
    request,
  });

  return new Response(buffer.buffer as unknown as ArrayBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="anexo_${a.numero_anexo}.pdf"`,
    },
  });
}
