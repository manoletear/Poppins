import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: subir documento (contrato PDF, etc.) al storage de Supabase
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const tipo = (formData.get('tipo') as string) || 'contrato';
  const empleadorId = formData.get('empleador_id') as string | null;
  const trabajadorId = formData.get('trabajador_id') as string | null;
  const contratoId = formData.get('contrato_id') as string | null;

  if (!file) {
    return NextResponse.json({ error: 'Archivo requerido' }, { status: 400 });
  }

  // Validar tipo de archivo
  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: 'Solo se permiten PDF e imágenes' }, { status: 400 });
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Archivo máximo 10MB' }, { status: 400 });
  }

  // Upload a Supabase Storage
  const ext = file.name.split('.').pop() || 'pdf';
  const path = `documentos/${empleadorId || user.id}/${Date.now()}_${tipo}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from('documentos')
    .upload(path, buffer, { contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  // Obtener URL pública
  const { data: urlData } = supabase.storage.from('documentos').getPublicUrl(path);

  // Guardar registro en tabla documentos
  const { data: doc, error } = await supabase
    .from('documentos')
    .insert({
      empleador_id: empleadorId || null,
      trabajador_id: trabajadorId || null,
      contrato_id: contratoId || null,
      tipo,
      nombre: file.name,
      url: urlData.publicUrl,
      mime_type: file.type,
      tamano_bytes: file.size,
      subido_por: user.id,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(doc, { status: 201 });
}
