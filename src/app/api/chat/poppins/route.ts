import { NextRequest, NextResponse } from 'next/server';

// "Habla con Poppins" — asistente IA (Gemini) del hogar.
// Responde conversacional y, si corresponde, sugiere una acción (crear tarea/recordatorio)
// como bloque JSON que el frontend ofrece confirmar. No ejecuta nada por sí mismo.

export const runtime = 'nodejs';

const SYSTEM = `Sos "Poppins", la asistente del hogar de la app Poppins (Chile). Tono cálido, cercano, simple y divertido, en español chileno neutro. Ayudás a la familia a pensar, decidir y organizar su casa: tareas del hogar, compras, recordatorios, cuidado de niños y mascotas, y dudas sobre la app.

Reglas:
- Respondé breve y útil. Nada de relleno.
- Si el usuario quiere CREAR una tarea o un recordatorio, ofrecélo y al FINAL del mensaje agregá EXACTAMENTE un bloque:
\`\`\`accion
{"tipo":"tarea","titulo":"...","categoria":"aseo|cocina|compras|mascotas|otro"}
\`\`\`
o
\`\`\`accion
{"tipo":"recordatorio","titulo":"...","hora":"08:00"}
\`\`\`
- Usá el bloque accion SOLO cuando haya una acción concreta y clara. Si no, no lo incluyas.
- No inventes datos privados. Si no sabés algo de la cuenta, decilo simple.`;

export async function POST(request: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    return NextResponse.json({ reply: 'El asistente todavía no está configurado (falta la API key de Gemini). Avisá al admin. 🙏', accion: null });
  }

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const mensajes: { role: string; text: string }[] = Array.isArray(body?.mensajes) ? body.mensajes : [];
  const contexto: string = typeof body?.contexto === 'string' ? body.contexto.slice(0, 1500) : '';

  const contents = mensajes.slice(-12).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: String(m.text || '').slice(0, 4000) }],
  }));

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM + (contexto ? `\n\nContexto de la cuenta:\n${contexto}` : '') }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
        }),
      },
    );
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data: any = await res.json();
    const raw: string = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude responder ahora, probá de nuevo.';

    // Extraer bloque de acción si existe
    let accion: any = null;
    let reply = raw;
    const m = raw.match(/```accion\s*([\s\S]*?)```/);
    if (m) {
      try { accion = JSON.parse(m[1].trim()); } catch { accion = null; }
      reply = raw.replace(m[0], '').trim();
    }
    return NextResponse.json({ reply, accion });
  } catch {
    return NextResponse.json({ reply: 'Uy, no me pude conectar al asistente ahora mismo. Probá en un rato. 🙈', accion: null });
  }
}
