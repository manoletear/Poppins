import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook para recibir leads desde formularios externos
// Soporta: Typeform, Tally, Google Forms, Zapier, custom
// POST /api/webhook/leads
// Body: { nombre, apellido, email, telefono, empresa, fuente, notas, cargo_interes, num_trabajadores, plan_interes }
// También soporta campos en español o inglés

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function extractField(body: Record<string, any>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      return String(body[key]);
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar API key simple (opcional)
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.WEBHOOK_LEADS_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Extraer campos con múltiples nombres posibles
    const email = extractField(body, 'email', 'correo', 'email_address', 'mail');
    if (!email) {
      return NextResponse.json({ error: 'email es requerido' }, { status: 400 });
    }

    const fuentesValidas = ['formulario', 'whatsapp', 'email', 'referido', 'sitio_web', 'instagram', 'linkedin', 'google_ads', 'evento'];
    const rawFuente = extractField(body, 'fuente', 'source', 'origen') || 'formulario';
    const fuente = fuentesValidas.includes(rawFuente) ? rawFuente : 'formulario';

    const planesValidos = ['free', 'starter', 'premium', 'enterprise'];
    const rawPlan = extractField(body, 'plan_interes', 'plan', 'plan_tipo');
    const planInteres = rawPlan && planesValidos.includes(rawPlan) ? rawPlan : null;

    const lead = {
      email,
      nombre: extractField(body, 'nombre', 'name', 'first_name', 'firstName'),
      apellido: extractField(body, 'apellido', 'last_name', 'lastName', 'surname'),
      telefono: extractField(body, 'telefono', 'phone', 'tel', 'celular', 'mobile'),
      empresa: extractField(body, 'empresa', 'company', 'organization', 'hogar', 'familia'),
      fuente,
      estado: 'nuevo',
      temperatura: 'frio',
      score: 0,
      cargo_interes: extractField(body, 'cargo_interes', 'cargo', 'servicio', 'service'),
      num_trabajadores: parseInt(extractField(body, 'num_trabajadores', 'workers', 'trabajadores') || '1') || 1,
      plan_interes: planInteres,
      notas: extractField(body, 'notas', 'notes', 'mensaje', 'message', 'comentario'),
    };

    const { data, error } = await supabaseAdmin
      .from('leads')
      .insert(lead)
      .select('id, email, nombre')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      lead: { id: data.id, email: data.email, nombre: data.nombre },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'webhook/leads' });
}
