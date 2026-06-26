/**
 * Poppins Email Service
 *
 * Usa Resend para enviar emails transaccionales.
 * Setup: 1) crear cuenta en resend.com 2) agregar RESEND_API_KEY al .env.local
 * Free tier: 3.000 emails/mes, 100/día
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Poppins <notificaciones@poppins.cl>';

export interface EmailAttachment {
  filename: string;
  content: string;     // base64
  contentType?: string;
}

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export async function sendEmail({ to, subject, html, attachments }: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY no configurada — email no enviado');
    return false;
  }

  try {
    const body: Record<string, any> = { from: FROM_EMAIL, to, subject, html };
    if (attachments && attachments.length > 0) {
      body.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content,
        ...(a.contentType && { content_type: a.contentType }),
      }));
    }
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('[Email] Error:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Email] Error:', err);
    return false;
  }
}

// ── Templates ──

export function emailInvitacionHogar(opts: {
  nombreInvitante: string;
  etiqueta: string;
  activationUrl: string;
}): EmailPayload {
  const { nombreInvitante, etiqueta, activationUrl } = opts;
  return {
    to: '',
    subject: `${nombreInvitante} te invitó a su hogar en Poppins 🏡`,
    html: `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#18181b 0%,#3f3f46 100%);padding:36px 40px;text-align:center">
            <p style="margin:0;font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px">Poppins</p>
            <p style="margin:6px 0 0;font-size:13px;color:#a1a1aa;letter-spacing:1px;text-transform:uppercase">La magia en tu casa</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px">
            <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b">
              ¡Te están esperando! 🎉
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#52525b;line-height:1.6">
              <strong style="color:#18181b">${nombreInvitante}</strong> te invitó a unirte a su hogar en Poppins
              como <strong style="color:#18181b">${etiqueta}</strong>.
            </p>

            <div style="background:#f9fafb;border:1px solid #e4e4e7;border-radius:12px;padding:20px 24px;margin-bottom:28px">
              <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#71717a;text-transform:uppercase;letter-spacing:0.5px">¿Qué es Poppins?</p>
              <p style="margin:0;font-size:14px;color:#3f3f46;line-height:1.6">
                Una app para gestionar todo lo de tu hogar: empleados domésticos, liquidaciones, tareas, compras y mucho más.
                Ahora podés ver lo que tu familia comparte contigo — todo en un solo lugar.
              </p>
            </div>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr><td align="center" style="padding-bottom:28px">
                <a href="${activationUrl}"
                   style="display:inline-block;background:#18181b;color:#ffffff;font-size:15px;font-weight:700;
                          padding:14px 36px;border-radius:10px;text-decoration:none;letter-spacing:0.3px">
                  Activar mi cuenta →
                </a>
              </td></tr>
            </table>

            <div style="border-top:1px solid #e4e4e7;padding-top:20px">
              <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.5">
                Este link es personal y expira en 24 horas.<br>
                Si no esperabas esta invitación, puedes ignorar este mensaje sin problema.
              </p>
            </div>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e4e4e7;padding:20px 40px;text-align:center">
            <p style="margin:0;font-size:12px;color:#a1a1aa">
              Poppins — Hecho con ♥ para familias chilenas
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`,
  };
}

export function emailLiquidacionLista(nombre: string, periodo: string, monto: string): EmailPayload {
  return {
    to: '', // se completa al llamar
    subject: `Tu liquidación de ${periodo} está lista — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu liquidación del período <strong>${periodo}</strong> por <strong>${monto}</strong> está lista para revisar y firmar.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/portal/liquidaciones" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Ver Liquidación
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Este email fue enviado por Poppins. Si no esperabas este mensaje, puedes ignorarlo.</p>
      </div>`,
  };
}

export function emailSolicitudAprobada(nombre: string, tipo: string, estado: string): EmailPayload {
  const esAprobada = estado === 'aprobada';
  return {
    to: '',
    subject: `Solicitud ${esAprobada ? 'aprobada' : 'rechazada'} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu solicitud de <strong>${tipo}</strong> ha sido <strong style="color:${esAprobada ? '#16a34a' : '#dc2626'}">${estado}</strong> por tu empleador.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/portal/solicitudes" style="display:inline-block;background:#2D2D90;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Ver Detalles
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}

export function emailRecordatorioFirma(nombre: string, periodo: string): EmailPayload {
  return {
    to: '',
    subject: `Recuerda firmar tu liquidación de ${periodo} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu empleador te recuerda firmar la liquidación del período <strong>${periodo}</strong>.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/portal/liquidaciones" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Firmar Ahora
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}

export function emailPagoConfirmado(nombre: string, monto: string, cuentas: number): EmailPayload {
  return {
    to: '',
    subject: `Pago confirmado por ${monto} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu pago por <strong>${monto}</strong> (${cuentas} cuenta${cuentas > 1 ? 's' : ''}) ha sido procesado exitosamente.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/hogar/pagos" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Ver Comprobante
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}

export function emailAlertaVencimiento(nombre: string, cuenta: string, diasRestantes: number): EmailPayload {
  return {
    to: '',
    subject: `⚠️ ${cuenta} vence en ${diasRestantes} día${diasRestantes > 1 ? 's' : ''} — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu cuenta <strong>${cuenta}</strong> vence en <strong>${diasRestantes} día${diasRestantes > 1 ? 's' : ''}</strong>.</p>
        <a href="https://poppins.tooxs-fperez.workers.dev/hogar/pagos" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Pagar Ahora
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}
