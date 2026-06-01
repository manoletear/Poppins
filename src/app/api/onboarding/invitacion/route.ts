import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST: crear invitación para que una empleada complete sus datos
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const body = await request.json();
  const { email, telefono, nombre } = body;

  // Obtener empleador
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('empleador_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile?.empleador_id) {
    return NextResponse.json({ error: 'Empleador no encontrado' }, { status: 404 });
  }

  const { data: invitacion, error } = await supabase
    .from('invitaciones')
    .insert({
      empleador_id: profile.empleador_id,
      tipo: 'trabajador',
      email: email || null,
      telefono: telefono || null,
      nombre: nombre || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // URL del link de onboarding
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://poppins.tooxs-fperez.workers.dev';
  const link = `${baseUrl}/onboarding/empleada?token=${invitacion.token}`;

  return NextResponse.json({
    invitacion,
    link,
  }, { status: 201 });
}

// GET: listar invitaciones del empleador
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('empleador_id')
    .eq('auth_user_id', user.id)
    .single();

  if (!profile?.empleador_id) {
    return NextResponse.json({ invitaciones: [] });
  }

  const { data } = await supabase
    .from('invitaciones')
    .select('*')
    .eq('empleador_id', profile.empleador_id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ invitaciones: data || [] });
}
