import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email/send';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  let body;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const { empleadorId } = body;
  if (!empleadorId) {
    return NextResponse.json({ error: 'empleadorId requerido' }, { status: 400 });
  }

  // Get employer data
  const { data: emp } = await supabase
    .from('empleadores')
    .select('nombre, apellido, email')
    .eq('id', empleadorId)
    .single();

  if (!emp?.email) {
    return NextResponse.json({ error: 'Empleador no encontrado' }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins.tooxs-fperez.workers.dev';
  const completarHogarUrl = `${siteUrl}/hogar/completar-hogar`;

  const sent = await sendEmail({
    to: emp.email,
    subject: '¡Bienvenido a Poppins! 🎉 Tu cuenta está activa',
    html: `
      <div style="font-family:'Segoe UI',Arial,sans-serif;max-width:600px;margin:0 auto;padding:0;background:#fcfdfe">
        <!-- Header -->
        <div style="background:#2D2D90;padding:40px 30px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="color:white;font-size:28px;margin:0;font-weight:800;letter-spacing:-0.5px">Poppins</h1>
          <p style="color:rgba(255,255,255,0.7);font-size:14px;margin:8px 0 0">Magia en tu casa</p>
        </div>

        <!-- Body -->
        <div style="padding:40px 30px;background:white;border:1px solid #f0f0f0;border-top:none">
          <h2 style="color:#2D2D90;font-size:24px;margin:0 0 8px;font-weight:800">
            ¡Hola ${emp.nombre}! 👋
          </h2>
          <p style="color:#666;font-size:16px;line-height:1.6;margin:0 0 24px">
            Tu cuenta Poppins ha sido activada exitosamente. Estamos listos para ayudarte a gestionar tu hogar de forma simple y profesional.
          </p>

          <!-- Next Steps -->
          <div style="background:#f7f8fc;border-radius:16px;padding:24px;margin:0 0 24px;border:1px solid #eee">
            <h3 style="color:#2D2D90;font-size:16px;margin:0 0 16px;font-weight:700">📋 Próximos Pasos</h3>

            <div style="margin:0 0 12px;padding-left:0">
              <p style="color:#333;font-size:14px;margin:0 0 4px"><strong>1. Completa los datos de tu hogar</strong></p>
              <p style="color:#888;font-size:13px;margin:0">Tipo de vivienda, metros cuadrados, habitaciones y más.</p>
            </div>

            <div style="margin:0 0 12px;padding-left:0">
              <p style="color:#333;font-size:14px;margin:0 0 4px"><strong>2. Registra a tu(s) trabajador(as)</strong></p>
              <p style="color:#888;font-size:13px;margin:0">Datos personales, cargo y condiciones de trabajo.</p>
            </div>

            <div style="margin:0;padding-left:0">
              <p style="color:#333;font-size:14px;margin:0 0 4px"><strong>3. Tu ejecutivo te contactará</strong></p>
              <p style="color:#888;font-size:13px;margin:0">Para coordinar el inicio del servicio y resolver dudas.</p>
            </div>
          </div>

          <!-- CTA: Completar datos del hogar -->
          <div style="text-align:center;margin:32px 0">
            <a href="${completarHogarUrl}" style="display:inline-block;background:#E91E8C;color:white;padding:16px 40px;border-radius:50px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 20px rgba(233,30,140,0.3)">
              Completar Datos del Hogar →
            </a>
          </div>

          <p style="color:#999;font-size:13px;line-height:1.5;margin:24px 0 0;text-align:center">
            También puedes acceder desde tu panel en <a href="${siteUrl}/hogar" style="color:#2D2D90;text-decoration:underline">${siteUrl}/hogar</a>
          </p>
        </div>

        <!-- Footer -->
        <div style="padding:24px 30px;text-align:center;background:#f9fafb;border-radius:0 0 16px 16px;border:1px solid #f0f0f0;border-top:none">
          <p style="color:#bbb;font-size:11px;margin:0;text-transform:uppercase;letter-spacing:1px;font-weight:600">
            Poppins Chile · Plataforma de Gestión Doméstica
          </p>
          <p style="color:#ccc;font-size:11px;margin:8px 0 0">
            Si no solicitaste este servicio, puedes ignorar este correo.
          </p>
        </div>
      </div>
    `,
  });

  return NextResponse.json({ sent });
}
