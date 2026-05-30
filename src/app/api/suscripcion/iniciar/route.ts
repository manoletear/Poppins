import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { iniciarSuscripcion } from '@/lib/pagos/suscripcion-service';

const Schema = z.object({
  plan: z.enum(['pro', 'pro_plus']),
  ciclo: z.enum(['mensual', 'anual']),
  camino: z.enum(['A_inmediato', 'B_post_trial']),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 });
  }

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('empleador_id, nombre, apellido, email')
    .eq('auth_user_id', user.id)
    .single();
  if (!perfil?.empleador_id) {
    return NextResponse.json({ error: 'Empleador no encontrado para este usuario' }, { status: 400 });
  }

  try {
    const res = await iniciarSuscripcion({
      empleadorId: perfil.empleador_id,
      plan: parsed.data.plan,
      ciclo: parsed.data.ciclo,
      camino: parsed.data.camino,
      nombre: [perfil.nombre, perfil.apellido].filter(Boolean).join(' ') || 'Cliente Poppins',
      email: perfil.email || user.email || '',
    });
    return NextResponse.json(res);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error interno' }, { status: 500 });
  }
}
