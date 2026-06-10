import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { confirmarTarjetaYSuscribir } from '@/lib/pagos/suscripcion-service';

/**
 * Tras registrar la tarjeta en Flow (camino A real), confirma el registro y crea
 * la suscripción. Lo llama la página de retorno /hogar/suscripcion/confirmar.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('empleador_id')
    .eq('auth_user_id', user.id)
    .single();
  if (!perfil?.empleador_id) {
    return NextResponse.json({ error: 'Empleador no encontrado' }, { status: 400 });
  }

  try {
    const res = await confirmarTarjetaYSuscribir(perfil.empleador_id);
    return NextResponse.json(res, { status: res.ok ? 200 : 409 });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 });
  }
}
