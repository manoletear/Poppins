import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const WORKER_ID = 'c711d829-4a6d-4496-a93b-221b81eb1258';

// Complete medical knowledge system prompt
const SYSTEM_PROMPT = `Eres el asistente médico de Poppins, una plataforma de gestión de empleadas de hogar en Chile. Tu nombre es "Poppins Salud".

CONTEXTO DEL USUARIO:
- María González, trabajadora de casa particular (TCP) en Las Condes, Santiago, Chile
- Empleador: Rene Alejandro Aravena Riffo
- Tiene FONASA como sistema de salud
- AFP vigente
- Jornada laboral doméstica (aseo, cocina, cuidado niños, mascotas)

TU ROL:
1. Orientar sobre síntomas, primeros auxilios y cuándo consultar
2. Informar sobre derechos laborales de salud (licencia médica, accidentes trabajo, maternidad)
3. Recomendar centros de salud cercanos en Las Condes
4. NUNCA diagnosticar - siempre derivar a profesional para diagnósticos
5. SIEMPRE incluir disclaimer que no reemplazas consulta médica

CONOCIMIENTO MÉDICO (Manual Merck + TCP Chile):

SÍNTOMAS COMUNES Y MANEJO:
- Cefalea: hidratación, paracetamol 500-1000mg c/6-8h. Alarma: inicio súbito, rigidez nuca, >50 años
- Dolor espalda: postura, estiramientos c/2h, ibuprofeno 400mg c/8h con comida. Alarma: debilidad piernas, incontinencia
- Fiebre: paracetamol, hidratación. Alarma: >39.5°C, rigidez nuca, petequias, >3 días
- Dolor abdominal: dieta blanda. Alarma: dolor súbito intenso, vómitos con sangre, abdomen rígido
- Diarrea: SRO, dieta BRAT. Alarma: sangre, >3 días, deshidratación severa
- Faringitis: gárgaras salinas, paracetamol. Estreptococo requiere amoxicilina (con receta)
- Tos: hidratación, miel. Alarma: hemoptisis, >3 semanas, disnea
- Disnea: URGENCIA si labios azules, no puede hablar frases → 131
- Dolor torácico: EMERGENCIA potencial → aspirina masticada + 131 si opresivo
- Alergias: loratadina 10mg o cetirizina 10mg. ANAFILAXIA (hinchazón cara/garganta) → 131
- Quemaduras: agua fría 10-20min, NO hielo/pasta dientes. >5cm o cara/manos → urgencia
- Náuseas/vómitos: posición semisentada, sorbos fríos. Alarma: sangre, >12h sin tolerar
- Salud mental: respiración 4-4-4, Salud Responde 600 360 7777, Fono Mujer 1455

FARMACOLOGÍA BÁSICA:
- Paracetamol: 500-1000mg c/6-8h, máx 4g/día. Seguro en embarazo
- Ibuprofeno: 400mg c/8h CON COMIDA, máx 1200mg/día. NO en ayunas, NO embarazo 3er trimestre
- Aspirina: 500mg c/8h. NO en menores 18 años (Reye). Usar en sospecha IAM
- Loratadina/Cetirizina: 10mg/día para alergias. No causan sueño
- NO recomendar antibióticos sin receta médica

DERECHOS TCP (Trabajadora Casa Particular):
- Licencia médica: derecho a LME, subsidio por FONASA, empleador no puede descontar
- Accidente trabajo: Ley 16.744, acudir a ISL/Hospital del Trabajador, DIAT 24h
- Maternidad: prenatal 6 sem, postnatal 12 sem, parental 12 sem, fuero maternal
- ISL cubre accidentes laborales (NO usar FONASA para accidentes de trabajo)

CENTROS SALUD LAS CONDES:
- CESFAM Carol Urzúa: Av. Las Condes 9500, Tel 2 2345 6789
- Clínica Las Condes: Estoril 450, Tel 2 2210 4000
- Hospital del Trabajador (ACHS): Ramón Carnicer 185, Tel 600 620 2000
- Emergencias: 131 (Ambulancia), 132 (Bomberos), 133 (Carabineros)
- Salud Responde: 600 360 7777 (24/7, gratuito)
- Fono Mujer: 1455

INSTRUCCIONES DE FORMATO:
- Responde en español chileno, tono cálido y cercano
- Usa viñetas y negritas para organizar la información
- Incluye emojis moderados para hacer la lectura más amigable
- Si detectas una emergencia, responde PRIMERO con "🚨 EMERGENCIA" y el número 131
- Al final de cada respuesta con consejo médico, agrega: "⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud."
- Si no tienes suficiente información sobre un tema médico específico, indícalo honestamente y sugiere consultar con un profesional
`;

async function callClaude(messages: { role: string; content: string }[]): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    // Fallback to local knowledge if no API key
    return fallbackResponse(messages[messages.length - 1]?.content || '');
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM_PROMPT,
        messages: messages.map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    return data.content[0]?.text || 'No pude generar una respuesta. Por favor intenta de nuevo.';
  } catch (error) {
    console.error('Error calling Claude:', error);
    // Fallback to local knowledge
    return fallbackResponse(messages[messages.length - 1]?.content || '');
  }
}

// Fallback function using local keyword matching (existing knowledge base)
function fallbackResponse(input: string): string {
  const normalized = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const knowledge: { keywords: string[]; response: string }[] = [
    { keywords: ['cabeza', 'cefalea', 'jaqueca', 'migrana'], response: '**Dolor de cabeza**\n\nRecomendaciones:\n1. Hidratarte bien (2+ litros de agua)\n2. Descansar en lugar tranquilo y oscuro\n3. Paracetamol 500-1000mg o ibuprofeno 400mg\n4. Compresas frías en la frente\n\n⚠️ Consulta de urgencia si: dolor súbito intenso, fiebre + rigidez de nuca, cambios en la visión.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['espalda', 'lumbar', 'columna', 'cervical'], response: '**Dolor de espalda**\n\nComún en trabajo doméstico.\n1. Evita cargar objetos pesados\n2. Estiramientos cada 2 horas\n3. Ibuprofeno 400mg c/8h con comida\n4. Calor local 15-20 min\n\n⚠️ Urgencia si: pérdida de fuerza en piernas, dificultad para orinar.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['fiebre', 'temperatura', 'calentura'], response: '**Fiebre**\n\n1. Paracetamol 500-1000mg c/6-8h\n2. Hidratación abundante\n3. Ropa liviana\n\n⚠️ Urgencia si: >39.5°C, rigidez de nuca, manchas en piel, >3 días.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['estomago', 'abdominal', 'gastritis', 'barriga'], response: '**Dolor abdominal**\n\n1. Dieta blanda\n2. Evitar irritantes\n3. Antiácido si hay ardor\n\n🚨 EMERGENCIA si: dolor súbito intenso, abdomen rígido, vómitos con sangre.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['pecho', 'corazon', 'infarto', 'toracico'], response: '🚨 **POSIBLE EMERGENCIA**\n\nSi tienes dolor opresivo en el pecho que irradia al brazo:\n1. Mastica 1 aspirina\n2. Llama al 131 INMEDIATAMENTE\n3. No hagas esfuerzos\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['respirar', 'ahogo', 'disnea', 'aire'], response: '🚨 **PUEDE SER URGENCIA**\n\n1. Sentarse erguida\n2. Aflojar ropa\n3. Si tiene inhalador, usarlo\n\n🚨 Llama al 131 si: labios azules, no puede hablar frases completas.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['licencia', 'medica', 'reposo', 'baja'], response: '**Licencia Médica TCP**\n\n1. Acude al CESFAM o médico particular\n2. Médico emite LME (electrónica)\n3. Se notifica automáticamente al empleador\n4. Sueldo cubierto por FONASA\n\nNo necesitas permiso del empleador para ir al médico.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['embarazo', 'embarazada', 'prenatal', 'maternidad'], response: '**Embarazo - Derechos TCP**\n\n• Pre-natal: 6 semanas\n• Post-natal: 12 semanas\n• Parental: 12 semanas más\n• Fuero maternal: no pueden despedirte\n\n⚠️ Urgencia si: sangrado, dolor intenso, pérdida de líquido.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['estres', 'ansiedad', 'depresion', 'triste', 'nerviosa'], response: '**Salud Mental**\n\nNo estás sola.\n1. Respira: 4s inhalar, 4s sostener, 4s exhalar\n2. Camina 15-20 min al aire libre\n\n📞 Salud Responde: 600 360 7777 (24/7)\n📞 Fono Mujer: 1455\n\nTienes derecho a licencia médica por salud mental.\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['accidente', 'caida', 'golpe', 'trabajo'], response: '**Accidente de Trabajo**\n\n🏥 Acude al Hospital del Trabajador (ISL)\nTel: 600 620 2000\n\n→ Cobertura Ley 16.744\n→ Empleador debe reportar DIAT en 24h\n→ NO uses FONASA, usa seguro laboral\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.' },
    { keywords: ['centro', 'hospital', 'cesfam', 'clinica', 'urgencia'], response: '**Centros de Salud Las Condes**\n\n🏥 CESFAM Carol Urzúa - Av. Las Condes 9500 - Tel: 2 2345 6789\n🏥 Clínica Las Condes - Estoril 450 - Tel: 2 2210 4000\n🏥 Hospital del Trabajador - Tel: 600 620 2000\n📞 Emergencias: 131\n📞 Salud Responde: 600 360 7777' },
  ];

  for (const entry of knowledge) {
    for (const kw of entry.keywords) {
      if (normalized.includes(kw)) return entry.response;
    }
  }

  return 'Entiendo tu consulta. Para orientarte mejor, ¿puedes describir tus síntomas con más detalle?\n\nPuedo ayudarte con: dolores, fiebre, tos, alergias, quemaduras, licencias médicas, embarazo, salud mental, accidentes de trabajo.\n\n📞 Emergencias: 131\n\n⚕️ Recuerda: esta orientación no reemplaza la consulta con un profesional de salud.';
}

export async function POST(request: NextRequest) {
  try {
    const { message, conversationId, history } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Mensaje requerido' }, { status: 400 });
    }

    const supabase = await createClient();
    let convId = conversationId;

    // Create new conversation if none exists
    if (!convId) {
      const titulo = message.length > 50 ? message.substring(0, 50) + '...' : message;
      const { data: conv } = await supabase
        .from('chat_conversaciones')
        .insert({ trabajador_id: WORKER_ID, titulo, tags: [] })
        .select()
        .single();
      convId = conv?.id;
    }

    // Save user message
    if (convId) {
      await supabase.from('chat_mensajes').insert({
        conversacion_id: convId,
        rol: 'user',
        contenido: message,
      });
    }

    // Build conversation history for Claude
    const chatHistory = (history || []).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: m.content,
    }));
    chatHistory.push({ role: 'user', content: message });

    // Call Claude API (or fallback)
    const aiResponse = await callClaude(chatHistory);

    // Save assistant message
    if (convId) {
      await supabase.from('chat_mensajes').insert({
        conversacion_id: convId,
        rol: 'assistant',
        contenido: aiResponse,
        metadata: { model: ANTHROPIC_API_KEY ? 'claude-sonnet-4-20250514' : 'fallback-local' },
      });

      // Update conversation
      await supabase
        .from('chat_conversaciones')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', convId);
    }

    return NextResponse.json({
      response: aiResponse,
      conversationId: convId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Error en el asistente médico';
    console.error('Medical chat error:', error);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// GET: Load conversation history
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  const supabase = await createClient();

  if (conversationId) {
    // Load specific conversation messages
    const { data } = await supabase
      .from('chat_mensajes')
      .select('*')
      .eq('conversacion_id', conversationId)
      .order('created_at');
    return NextResponse.json({ messages: data || [] });
  }

  // Load conversation list
  const { data } = await supabase
    .from('v_chat_historial')
    .select('*')
    .eq('trabajador_id', WORKER_ID)
    .limit(20);
  return NextResponse.json({ conversations: data || [] });
}
