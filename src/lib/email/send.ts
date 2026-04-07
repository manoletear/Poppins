/**
 * Poppins Email Service
 *
 * Usa Resend para enviar emails transaccionales.
 * Setup: 1) crear cuenta en resend.com 2) agregar RESEND_API_KEY al .env.local
 * Free tier: 3.000 emails/mes, 100/día
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Poppins <notificaciones@poppins.cl>';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY no configurada — email no enviado');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
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

export function emailLiquidacionLista(nombre: string, periodo: string, monto: string): EmailPayload {
  return {
    to: '', // se completa al llamar
    subject: `Tu liquidación de ${periodo} está lista — Poppins`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;padding:30px">
        <h2 style="color:#2D2D90">Poppins</h2>
        <p>Hola ${nombre},</p>
        <p>Tu liquidación del período <strong>${periodo}</strong> por <strong>${monto}</strong> está lista para revisar y firmar.</p>
        <a href="https://poppins-erp-2026.vercel.app/portal/liquidaciones" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
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
        <a href="https://poppins-erp-2026.vercel.app/portal/solicitudes" style="display:inline-block;background:#2D2D90;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
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
        <a href="https://poppins-erp-2026.vercel.app/portal/liquidaciones" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
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
        <a href="https://poppins-erp-2026.vercel.app/empresa/pagos" style="display:inline-block;background:#16a34a;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
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
        <a href="https://poppins-erp-2026.vercel.app/empresa/pagos" style="display:inline-block;background:#E91E8C;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0">
          Pagar Ahora
        </a>
        <p style="color:#999;font-size:12px;margin-top:30px">Poppins — Magia en tu casa</p>
      </div>`,
  };
}
