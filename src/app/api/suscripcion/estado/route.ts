import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getEstadoSuscripcion, estadoStarterTrial } from '@/lib/pagos/estado-suscripcion';

/** Estado de suscripción del empleador del usuario actual (para banner/modal). */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('empleador_id, created_at')
    .eq('auth_user_id', user.id)
    .single();

  // Sin empleador asociado todavía (recién registrado) → Starter en trial,
  // contando desde la creación del perfil/usuario. Así el portal es usable como
  // Starter sin necesidad de tener empleador ni suscripción aún.
  if (!perfil?.empleador_id) {
    const alta = new Date(perfil?.created_at || user.created_at || new Date().toISOString());
    return NextResponse.json(estadoStarterTrial(alta));
  }

  const estado = await getEstadoSuscripcion(supabase, perfil.empleador_id, perfil.created_at || user.created_at);
  return NextResponse.json(estado);
}
