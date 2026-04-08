import { NextRequest, NextResponse } from 'next/server';
import { appendToGoogleSheet } from '@/lib/integrations/google-sheets';
import { createOrUpdateHubSpotContact, createHubSpotDeal } from '@/lib/integrations/hubspot';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

const SYSTEM_PROMPT = `Eres el asistente de ventas y soporte de Poppins, la primera app chilena que organiza todos los pagos del hogar y empleo domestico.

TU ROL:
- Resolver dudas sobre Poppins de forma amable, concisa y profesional
- Capturar datos del prospecto naturalmente durante la conversacion (nombre, email, telefono, empresa)
- Derivar a soporte humano cuando sea necesario

SOBRE POPPINS:
- Plataforma SaaS para gestion de empleadas de casa particular (TCP) en Chile
- Automatiza: sueldos, cotizaciones (AFP, FONASA), contratos, liquidaciones, vacaciones
- Integra con BUK (HR), PREVIRED (cotizaciones), DT (contratos)
- Plan unico: $24.770/mes por trabajador
- Incluye: liquidaciones automaticas, calculo cotizaciones, alertas de pago, portal trabajador
- Prueba gratuita disponible
- Pago con tarjeta de credito/debito (Visa, Mastercard, Amex)

FLUJO DE CAPTURA DE DATOS:
1. Si el usuario muestra interes, pregunta su nombre de forma natural
2. Luego pide email para enviar mas info o activar prueba
3. Opcionalmente pide telefono
4. NO seas agresivo con los datos - fluye naturalmente en la conversacion

FORMATO DE RESPUESTA:
- Responde en espanol chileno, tono cercano pero profesional
- Maximo 2-3 oraciones por respuesta
- Si detectas datos del usuario (nombre, email, telefono), incluyelos en un bloque JSON al final:
  <!--CONTACT_DATA:{"nombre":"...","email":"...","telefono":"..."}-->
- El bloque JSON es invisible para el usuario, solo para el sistema

INSTRUCCIONES CRITICAS:
- NUNCA inventes informacion sobre Poppins
- Si no sabes algo, di "Deja que te contacte con nuestro equipo para eso"
- Si piden hablar con una persona, responde que alguien los contactara pronto
- Se breve y directo. No hagas listas largas a menos que te lo pidan`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Extract contact data from assistant response
function extractContactData(text: string): Record<string, string> | null {
  const match = text.match(/<!--CONTACT_DATA:(.*?)-->/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

// Remove hidden data block from visible response
function cleanResponse(text: string): string {
  return text.replace(/<!--CONTACT_DATA:.*?-->/g, '').trim();
}

// Generate a simple session ID
function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

async function callClaude(messages: ChatMessage[]): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    return 'Gracias por tu interes en Poppins! En este momento no puedo procesar tu consulta. Dejanos tu email en [nuestro formulario de contacto](#contact) y te responderemos pronto.';
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    console.error('Claude API error:', response.status);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content[0]?.text || 'Lo siento, intenta de nuevo.';
}

export async function POST(request: NextRequest) {
  try {
    const { message, sessionId: incomingSessionId, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const sessionId = incomingSessionId || generateSessionId();

    // Build conversation for Claude
    const chatHistory: ChatMessage[] = (history || []).map((m: ChatMessage) => ({
      role: m.role,
      content: m.content,
    }));
    chatHistory.push({ role: 'user', content: message });

    // Call Claude
    const rawResponse = await callClaude(chatHistory);
    const contactData = extractContactData(rawResponse);
    const cleanedResponse = cleanResponse(rawResponse);

    // Background tasks: Google Sheets + HubSpot (non-blocking)
    const bgTasks: Promise<void>[] = [];

    // Log every exchange to Google Sheets
    bgTasks.push(
      appendToGoogleSheet({
        sessionId,
        timestamp: new Date().toISOString(),
        userMessage: message,
        assistantResponse: cleanedResponse,
        contactName: contactData?.nombre || '',
        contactEmail: contactData?.email || '',
        contactPhone: contactData?.telefono || '',
      }).catch((err) => console.error('Google Sheets error:', err))
    );

    // If contact data captured, sync to HubSpot + Supabase CRM
    if (contactData?.email) {
      bgTasks.push(
        (async () => {
          try {
            const contactId = await createOrUpdateHubSpotContact({
              email: contactData.email!,
              firstname: contactData.nombre || undefined,
              phone: contactData.telefono || undefined,
              source: 'chatbot_landing',
            });
            if (contactId) {
              await createHubSpotDeal({
                contactId,
                dealName: `Chat Lead - ${contactData.nombre || contactData.email}`,
                pipeline: 'default',
                stage: 'appointmentscheduled',
              });
            }
          } catch (err) {
            console.error('HubSpot error:', err);
          }
        })()
      );

      // Also save to Supabase CRM
      bgTasks.push(
        fetch(new URL('/api/webhook/leads', request.url).toString(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: contactData.email,
            nombre: contactData.nombre || undefined,
            telefono: contactData.telefono || undefined,
            fuente: 'chatbot',
            notas: `Lead capturado via chatbot. Session: ${sessionId}`,
          }),
        }).then(() => {}).catch((err) => console.error('CRM sync error:', err))
      );
    }

    // Don't await background tasks - respond immediately
    Promise.allSettled(bgTasks);

    return NextResponse.json({
      response: cleanedResponse,
      sessionId,
    });
  } catch (error: unknown) {
    console.error('Landing chat error:', error);
    return NextResponse.json(
      { error: 'Error en el chat' },
      { status: 500 }
    );
  }
}
