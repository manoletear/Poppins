import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEstadoSuscripcion } from '@/lib/pagos/estado-suscripcion';

/** Estado de suscripción del empleador del usuario actual (para banner/modal). */
export async function GET() {
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

  const estado = await getEstadoSuscripcion(supabase, perfil.empleador_id);
  return NextResponse.json(estado);
}
