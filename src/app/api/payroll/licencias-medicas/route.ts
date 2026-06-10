// GET  /api/payroll/licencias-medicas?period=YYYY-MM
// POST /api/payroll/licencias-medicas
//      multipart/form-data: { trabajador_id, periodo, tipo, fecha_inicio, fecha_fin, observacion, documento? (PDF/img) }
//      application/json:    { ...mismos campos sin documento }
// DELETE /api/payroll/licencias-medicas?id=uuid

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getActiveEmpleadorId } from '@/lib/auth/active-empleador';

export const runtime = 'nodejs';

async function getEmpleadorId(supabase: Awaited<ReturnType<typeof createClient>>, user: any) {
  // Wrapper retrocompat: usa el helper N:M nuevo
  const { empleadorId } = await getActiveEmpleadorId(supabase, user);
  return empleadorId ?? undefined;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await getEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const period = new URL(request.url).searchParams.get('period');
  if (!period) return NextResponse.json({ ok: false, error: 'period_required' }, { status: 400 });

  const { data, error } = await supabase
    .from('licencias_medicas')
    .select(`
      id, trabajador_id, periodo, tipo, fecha_inicio, fecha_fin, observacion,
      documento_url, documento_nombre,
      trabajadores ( nombre, apellido_paterno, rut )
    `)
    .eq('empleador_id', empleadorId)
    .eq('periodo', period)
    .order('fecha_inicio');

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // Calcular días en JS ya que la columna es nullable
  const enriched = (data ?? []).map((lic: any) => ({
    ...lic,
    dias: lic.fecha_inicio && lic.fecha_fin
      ? Math.round((new Date(lic.fecha_fin).getTime() - new Date(lic.fecha_inicio).getTime()) / 86400000) + 1
      : null,
  }));

  return NextResponse.json({ ok: true, data: enriched });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await getEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const contentType = request.headers.get('content-type') ?? '';
  let trabajador_id: string, periodo: string, tipo: string | null,
      fecha_inicio: string, fecha_fin: string, observacion: string | null;
  let documento: File | null = null;

  if (contentType.includes('multipart/form-data')) {
    const fd = await request.formData();
    trabajador_id = String(fd.get('trabajador_id') ?? '');
    periodo       = String(fd.get('periodo') ?? '');
    tipo          = String(fd.get('tipo') ?? 'MEDICA');
    fecha_inicio  = String(fd.get('fecha_inicio') ?? '');
    fecha_fin     = String(fd.get('fecha_fin') ?? '');
    observacion   = (fd.get('observacion') as string) ?? null;
    const doc = fd.get('documento');
    if (doc instanceof File && doc.size > 0) documento = doc;
  } else {
    const body = await request.json();
    ({ trabajador_id, periodo, tipo, fecha_inicio, fecha_fin, observacion } = body);
  }

  if (!trabajador_id || !periodo || !fecha_inicio || !fecha_fin) {
    return NextResponse.json({ ok: false, error: 'campos_requeridos' }, { status: 400 });
  }

  const dias = Math.round((new Date(fecha_fin).getTime() - new Date(fecha_inicio).getTime()) / 86400000) + 1;

  // Subir documento si vino (bucket 'documentos', carpeta licencias/{empleador}/)
  let documento_url: string | null = null;
  let documento_nombre: string | null = null;
  if (documento) {
    const ext = (documento.name.split('.').pop() ?? 'pdf').toLowerCase();
    const safeName = `${Date.now()}_${trabajador_id.slice(0, 8)}.${ext}`;
    const path = `licencias/${empleadorId}/${safeName}`;
    const buf = Buffer.from(await documento.arrayBuffer());
    const { error: upErr } = await supabase.storage
      .from('documentos').upload(path, buf, {
        contentType: documento.type || 'application/octet-stream',
        upsert: false,
      });
    if (!upErr) {
      const { data: pub } = supabase.storage.from('documentos').getPublicUrl(path);
      documento_url = pub.publicUrl;
      documento_nombre = documento.name;
    }
  }

  const { data, error } = await supabase
    .from('licencias_medicas')
    .insert({
      empleador_id: empleadorId,
      trabajador_id,
      periodo,
      tipo: tipo ?? 'MEDICA',
      fecha_inicio,
      fecha_fin,
      fecha_desde: fecha_inicio,
      fecha_hasta: fecha_fin,
      dias_totales: dias,
      observacion,
      ...(documento_url && { documento_url, documento_nombre }),
    })
    .select('id, fecha_inicio, fecha_fin, documento_url')
    .single();

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, data: { ...data, dias } });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'no_auth' }, { status: 401 });

  const empleadorId = await getEmpleadorId(supabase, user);
  if (!empleadorId) return NextResponse.json({ ok: false, error: 'no_empleador' }, { status: 403 });

  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ ok: false, error: 'id_required' }, { status: 400 });

  const { error } = await supabase
    .from('licencias_medicas')
    .delete()
    .eq('id', id)
    .eq('empleador_id', empleadorId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
