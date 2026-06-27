import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email/send';

// Cron: envía por correo los recordatorios cuya fecha/hora ya llegó (una sola vez).
// Disparar cada ~15 min con un cron externo (cron-job.org) o Cloudflare Cron Trigger,
// con header Authorization: Bearer <CRON_SECRET>.

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins.tooxs-fperez.workers.dev';

  const now = new Date();
  const hoy = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const horaNow = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const { data: recs, error } = await supabase
    .from('recordatorios')
    .select('id, titulo, hora, empleador_id, empleadores(email, nombre)')
    .eq('fecha', hoy)
    .eq('activo', true)
    .or('email_enviado.is.null,email_enviado.eq.false');

  if (error) return NextResponse.json({ error: 'query' }, { status: 500 });

  let sent = 0;
  for (const r of recs || []) {
    if (r.hora && String(r.hora).slice(0, 5) > horaNow) continue; // todavía no es la hora
    const emp: any = Array.isArray(r.empleadores) ? r.empleadores[0] : r.empleadores;
    const email = emp?.email;
    if (email) {
      await sendEmail({
        to: email,
        subject: `🔔 Recordatorio: ${r.titulo}`,
        html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:28px">
          <div style="font-size:24px;font-weight:800;color:#2D2D90">Poppins</div>
          <p style="font-size:15px;color:#18181b;margin-top:16px">Hola${emp?.nombre ? ' ' + emp.nombre : ''} 👋, te recordamos:</p>
          <p style="font-size:18px;font-weight:700;color:#E91E8C">${r.titulo}</p>
          <a href="${siteUrl}/hogar/recordatorios" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#E91E8C);color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:12px">Ver en Poppins</a>
          <p style="font-size:12px;color:#a1a1aa;margin-top:20px">Con cariño, Poppins 💜</p>
        </div>`,
      });
    }
    await supabase.from('recordatorios').update({ email_enviado: true }).eq('id', r.id);
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
