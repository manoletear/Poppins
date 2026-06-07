/**
 * Envío de WhatsApp vía Meta Cloud API. Server-side only.
 *
 * Tolerante: si faltan credenciales (WHATSAPP_TOKEN / WHATSAPP_PHONE_ID) entra en
 * MODO SIMULACIÓN — no envía, solo loguea y devuelve { simulated: true }. Así la
 * Fase 2 (cron + detección) funciona end-to-end antes de tener la cuenta de
 * WhatsApp Business y la plantilla aprobada.
 *
 * Mensajes business-initiated (como un recordatorio) REQUIEREN plantilla aprobada.
 */

export type WhatsAppResult = { ok: boolean; simulated?: boolean; error?: string };

/** Normaliza un número chileno a formato Meta (sin +): 569XXXXXXXX. */
export function normalizeClPhone(raw?: string | null): string | null {
  if (!raw) return null;
  const d = raw.replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('56')) return d;                    // ya trae código país
  if (d.length === 9 && d.startsWith('9')) return '56' + d; // celular 9XXXXXXXX
  if (d.length === 8) return '569' + d;                // sin el 9 inicial
  return '56' + d;
}

export async function sendWhatsAppTemplate(opts: {
  to: string | null;
  template: string;          // nombre de la plantilla aprobada
  params?: string[];         // variables {{1}}, {{2}}...
  lang?: string;             // código de idioma de la plantilla (ej. 'es', 'es_CL')
}): Promise<WhatsAppResult> {
  const to = normalizeClPhone(opts.to);
  if (!to) return { ok: false, error: 'numero_invalido' };

  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const params = opts.params || [];

  if (!token || !phoneId) {
    console.log(`[whatsapp:SIMULADO] -> ${to} | ${opts.template}(${params.join(' | ')})`);
    return { ok: true, simulated: true };
  }

  try {
    const r = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: opts.template,
          language: { code: opts.lang || 'es' },
          components: params.length
            ? [{ type: 'body', parameters: params.map(t => ({ type: 'text', text: t })) }]
            : [],
        },
      }),
    });
    if (!r.ok) {
      const e = await r.text().catch(() => '');
      return { ok: false, error: `wa_${r.status}: ${e.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
