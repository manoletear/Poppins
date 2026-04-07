import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, emailSolicitudAprobada } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const { email, nombre, tipo, estado } = await request.json();
    if (!email) return NextResponse.json({ error: 'email requerido' }, { status: 400 });

    const tmpl = emailSolicitudAprobada(nombre || 'Empleado', tipo || 'solicitud', estado || 'resuelta');
    tmpl.to = email;
    const sent = await sendEmail(tmpl);

    return NextResponse.json({ sent });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
