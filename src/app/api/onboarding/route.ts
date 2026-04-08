import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET: obtener estado del onboarding del usuario actual
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: onboarding } = await supabase
    .from('onboarding')
    .select('*')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!onboarding) {
    // Crear onboarding nuevo
    const { data: nuevo, error } = await supabase
      .from('onboarding')
      .insert({ auth_user_id: user.id })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(nuevo);
  }

  return NextResponse.json(onboarding);
}

// POST: actualizar paso del onboarding
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const { paso, datos } = body;

  // Obtener onboarding actual
  const { data: onboarding } = await supabase
    .from('onboarding')
    .select('*')
    .eq('auth_user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!onboarding) {
    return NextResponse.json({ error: 'Onboarding no encontrado' }, { status: 404 });
  }

  const updates: Record<string, any> = {
    paso_actual: paso,
    estado: 'en_progreso',
    updated_at: new Date().toISOString(),
  };

  // Paso 1: Datos del empleador
  if (paso === 1 && datos) {
    const empleadorData: Record<string, any> = {
      auth_user_id: user.id,
      rut: datos.rut,
      nombre: datos.nombre,
      apellido: datos.apellido || null,
      email: datos.email || user.email,
      telefono: datos.telefono || null,
      direccion: datos.direccion || null,
      comuna: datos.comuna || null,
      region: datos.region || null,
      tipo_vivienda: datos.tipo_vivienda || null,
      cantidad_trabajadores: datos.cantidad_trabajadores || 1,
      fuente_registro: datos.fuente || 'web',
    };

    let empleadorId = onboarding.empleador_id;

    if (empleadorId) {
      await supabase.from('empleadores').update(empleadorData).eq('id', empleadorId);
    } else {
      const { data: emp, error } = await supabase
        .from('empleadores')
        .insert(empleadorData)
        .select('id')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      empleadorId = emp.id;
      updates.empleador_id = empleadorId;
    }

    // Actualizar profile
    await supabase
      .from('user_profiles')
      .update({ empleador_id: empleadorId, nombre: datos.nombre, apellido: datos.apellido })
      .eq('auth_user_id', user.id);

    updates.datos_empleador_completos = true;
    updates.cantidad_trabajadores = datos.cantidad_trabajadores || 1;
  }

  // Paso 2: Datos de trabajadores
  if (paso === 2 && datos?.trabajadores) {
    for (const t of datos.trabajadores) {
      const trabajadorData = {
        cliente_id: onboarding.empleador_id,
        rut: t.rut,
        nombre: t.nombre,
        apellido_paterno: t.apellido_paterno,
        apellido_materno: t.apellido_materno || null,
        email: t.email || null,
        telefono: t.telefono || null,
        cargo: t.cargo || 'Trabajadora de casa particular',
        sueldo_base: t.sueldo_base || 0,
        fecha_ingreso: t.fecha_ingreso || null,
        tipo_contrato: t.tipo_contrato || 'Indefinido',
        puertas_adentro: t.puertas_adentro || false,
        estado: 'activo' as const,
      };

      // Upsert por RUT dentro del mismo empleador
      const { data: existente } = await supabase
        .from('trabajadores')
        .select('id')
        .eq('cliente_id', onboarding.empleador_id)
        .eq('rut', t.rut)
        .single();

      if (existente) {
        await supabase.from('trabajadores').update(trabajadorData).eq('id', existente.id);
      } else {
        await supabase.from('trabajadores').insert(trabajadorData);
      }
    }

    updates.datos_trabajadores_completos = true;
    updates.cantidad_trabajadores = datos.trabajadores.length;
  }

  // Paso 3: Contrato PDF
  if (paso === 3 && datos) {
    if (datos.contrato_url) {
      updates.contrato_subido = true;
      updates.contrato_url = datos.contrato_url;

      // Guardar documento
      await supabase.from('documentos').insert({
        empleador_id: onboarding.empleador_id,
        tipo: 'contrato',
        nombre: datos.nombre_archivo || 'Contrato.pdf',
        url: datos.contrato_url,
        mime_type: 'application/pdf',
        subido_por: user.id,
      });
    }
    if (datos.sin_contrato) {
      // Crear invitación para que la empleada complete datos
      updates.contrato_generado = false;
      updates.contrato_subido = false;
    }
  }

  // Paso 4: Método de pago configurado
  if (paso === 4) {
    updates.metodo_pago_configurado = true;
  }

  // Completar onboarding
  if (paso === 5 || datos?.completar) {
    updates.estado = 'completado';
    updates.completado_at = new Date().toISOString();
  }

  const { data: updated, error } = await supabase
    .from('onboarding')
    .update(updates)
    .eq('id', onboarding.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(updated);
}
