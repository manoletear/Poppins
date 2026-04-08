import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Webhook para recibir leads desde formularios externos
// Soporta: HubSpot form webhook, Typeform, Tally, Google Forms, Zapier, custom
// POST /api/webhook/leads

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function extractField(body: Record<string, any>, ...keys: string[]): string | null {
  for (const key of keys) {
    if (body[key] !== undefined && body[key] !== null && body[key] !== '') {
      return String(body[key]);
    }
  }
  return null;
}

// HubSpot sends form submissions in a specific format
// with properties nested or as flat fields
function normalizeHubSpotPayload(body: any): Record<string, any> {
  // HubSpot workflow webhook format: { properties: { email: { value: "..." }, ... } }
  if (body.properties && typeof body.properties === 'object') {
    const flat: Record<string, any> = { fuente: 'hubspot_form' };
    for (const [key, val] of Object.entries(body.properties)) {
      if (val && typeof val === 'object' && 'value' in (val as any)) {
        flat[key] = (val as any).value;
      } else {
        flat[key] = val;
      }
    }
    // Map HubSpot standard property names
    if (flat.firstname) flat.nombre = flat.firstname;
    if (flat.lastname) flat.apellido = flat.lastname;
    if (flat.phone) flat.telefono = flat.phone;
    if (flat.company) flat.empresa = flat.company;
    if (flat.message || flat.hs_lead_status) flat.notas = flat.message || flat.hs_lead_status;
    return flat;
  }

  // HubSpot form submission callback format (array of fields)
  // { "submittedAt": ..., "values": [{ "name": "email", "value": "..." }, ...] }
  if (Array.isArray(body.values)) {
    const flat: Record<string, any> = { fuente: 'hubspot_form' };
    for (const field of body.values) {
      if (field.name && field.value) {
        flat[field.name] = field.value;
      }
    }
    if (flat.firstname) flat.nombre = flat.firstname;
    if (flat.lastname) flat.apellido = flat.lastname;
    if (flat.phone) flat.telefono = flat.phone;
    if (flat.company) flat.empresa = flat.company;
    return flat;
  }

  // HubSpot v3 webhook (contact.creation or form submission workflow)
  // Array of events: [{ "objectId": ..., "properties": { ... } }]
  if (Array.isArray(body) && body.length > 0) {
    const first = body[0];
    if (first.properties) {
      return normalizeHubSpotPayload(first);
    }
  }

  return body;
}

export async function POST(request: NextRequest) {
  try {
    // Verificar API key simple (opcional)
    const apiKey = request.headers.get('x-api-key');
    const expectedKey = process.env.WEBHOOK_LEADS_API_KEY;
    if (expectedKey && apiKey !== expectedKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json();
    const body = normalizeHubSpotPayload(rawBody);

    // Extraer campos con múltiples nombres posibles
    const email = extractField(body, 'email', 'correo', 'email_address', 'mail');
    if (!email) {
      return NextResponse.json({ error: 'email es requerido' }, { status: 400 });
    }

    const fuentesValidas = ['formulario', 'whatsapp', 'email', 'referido', 'sitio_web', 'instagram', 'linkedin', 'google_ads', 'evento', 'hubspot_form', 'chatbot'];
    const rawFuente = extractField(body, 'fuente', 'source', 'origen') || 'formulario';
    const fuente = fuentesValidas.includes(rawFuente) ? rawFuente : 'formulario';

    const planesValidos = ['free', 'starter', 'premium', 'enterprise'];
    const rawPlan = extractField(body, 'plan_interes', 'plan', 'plan_tipo');
    const planInteres = rawPlan && planesValidos.includes(rawPlan) ? rawPlan : null;

    const supabase = getSupabaseAdmin();

    // Check if lead already exists by email
    const { data: existing } = await supabase
      .from('leads')
      .select('id, email, score')
      .eq('email', email)
      .single();

    const leadData = {
      email,
      nombre: extractField(body, 'nombre', 'name', 'first_name', 'firstName', 'firstname'),
      apellido: extractField(body, 'apellido', 'last_name', 'lastName', 'surname', 'lastname'),
      telefono: extractField(body, 'telefono', 'phone', 'tel', 'celular', 'mobile'),
      empresa: extractField(body, 'empresa', 'company', 'organization', 'hogar', 'familia'),
      fuente,
      cargo_interes: extractField(body, 'cargo_interes', 'cargo', 'servicio', 'service'),
      num_trabajadores: parseInt(extractField(body, 'num_trabajadores', 'workers', 'trabajadores') || '1') || 1,
      plan_interes: planInteres,
      notas: extractField(body, 'notas', 'notes', 'mensaje', 'message', 'comentario'),
    };

    if (existing) {
      // Update existing lead — bump score, update fields that are non-null
      const updates: Record<string, any> = {};
      for (const [key, val] of Object.entries(leadData)) {
        if (val !== null && val !== undefined && key !== 'email') {
          updates[key] = val;
        }
      }
      // Bump score on repeat interaction
      updates.score = (existing.score || 0) + 5;

      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', existing.id)
        .select('id, email, nombre')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'updated',
        lead: { id: data.id, email: data.email, nombre: data.nombre },
      }, { status: 200 });
    }

    // Create new lead
    const { data, error } = await supabase
      .from('leads')
      .insert({ ...leadData, estado: 'nuevo', temperatura: 'frio', score: 10 })
      .select('id, email, nombre')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      lead: { id: data.id, email: data.email, nombre: data.nombre },
    }, { status: 201 });
  } catch (err: any) {
    console.error('Webhook leads error:', err);
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 });
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'webhook/leads' });
}
