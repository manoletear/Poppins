import { NextRequest, NextResponse } from 'next/server';

// Estructura una lista de compras en texto libre a items {nombre, cantidad, unidad, categoria}.
// Usa Gemini si hay GEMINI_API_KEY; si no, cae a un parser heurístico.

// Categorías válidas en la DB (CHECK de items_lista_compras.categoria), en lowercase.
const CATEGORIAS = [
  'frutas', 'verduras', 'carnes', 'lacteos', 'abarrotes', 'bebidas', 'limpieza', 'mascotas', 'otros',
];

interface ItemEstructurado {
  nombre: string;
  cantidad: number;
  unidad: string;
  categoria: string;
}

const KEYWORDS: Record<string, string[]> = {
  frutas: ['manzana', 'platano', 'plátano', 'naranja', 'limon', 'limón', 'fruta', 'frutilla', 'uva', 'pera', 'kiwi', 'palta'],
  verduras: ['tomate', 'lechuga', 'cebolla', 'papa', 'zanahoria', 'verdura', 'choclo', 'zapallo', 'pepino', 'brocoli', 'espinaca', 'morron', 'ajo'],
  carnes: ['pollo', 'carne', 'vacuno', 'cerdo', 'pescado', 'salmon', 'salmón', 'pavo', 'molida', 'churrasco', 'longaniza', 'jamon', 'jamón'],
  lacteos: ['leche', 'queso', 'yogur', 'yoghurt', 'mantequilla', 'huevo', 'crema', 'manjar', 'mantecoso'],
  bebidas: ['agua', 'bebida', 'jugo', 'cerveza', 'vino', 'coca', 'cafe', 'café', 'te', 'té', 'nectar', 'energetica'],
  limpieza: ['detergente', 'cloro', 'lavaloza', 'limpiador', 'esponja', 'toalla nova', 'confort', 'papel higienico', 'papel higiénico', 'bolsa basura', 'shampoo', 'jabon', 'jabón', 'pasta dental', 'cepillo', 'desodorante', 'pañal', 'pañales'],
  mascotas: ['perro', 'gato', 'mascota', 'croqueta', 'arena'],
  abarrotes: ['arroz', 'fideo', 'tallarin', 'tallarín', 'azucar', 'azúcar', 'sal', 'aceite', 'harina', 'atun', 'atún', 'conserva', 'salsa', 'lenteja', 'poroto', 'pan', 'marraqueta', 'hallulla', 'galleta', 'cereal', 'mermelada'],
};

function categorizar(nombre: string): string {
  const n = nombre.toLowerCase();
  for (const [cat, kws] of Object.entries(KEYWORDS)) {
    // Match por palabra (inicio o tras espacio) para evitar falsos positivos
    // como "te" dentro de "detergente".
    if (kws.some((k) => new RegExp('(^|\\s)' + k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(n))) return cat;
  }
  return 'otros';
}

// Parser heurístico: una línea por item, intenta extraer cantidad/unidad.
function parseHeuristico(texto: string): ItemEstructurado[] {
  return texto
    .split(/\n|,|;/)
    // Quita viñetas/checkboxes y marcadores de lista "1)" "1." al inicio, pero NO una cantidad suelta.
    .map((l) => l.replace(/^[\s\-•*✅⬜]+/, '').replace(/^\d+[).]\s*/, '').trim())
    .filter((l) => l.length > 1)
    .map((linea) => {
      const m = linea.match(/(\d+(?:[.,]\d+)?)\s*(kg|kilos?|gr?|grs?|lt?|litros?|cc|ml|unidades?|un|paquetes?|docenas?)?\b/i);
      const cantidad = m ? parseFloat(m[1].replace(',', '.')) : 1;
      const unidad = m && m[2] ? m[2].toLowerCase() : 'un';
      let nombre = (m ? linea.replace(m[0], '') : linea).replace(/^\s*de\s+/i, '').replace(/\s+/g, ' ').trim() || linea;
      nombre = nombre.charAt(0).toUpperCase() + nombre.slice(1);
      return { nombre, cantidad: cantidad || 1, unidad, categoria: categorizar(nombre) };
    });
}

async function parseGemini(texto: string, apiKey: string): Promise<ItemEstructurado[]> {
  const prompt = `Eres un asistente de compras chileno. Convierte esta lista de compras en texto libre a JSON.
Devuelve SOLO un array JSON (sin markdown) de objetos con: nombre (string), cantidad (number), unidad (string: un/kg/lt/gr/paquete/docena), categoria (una de: ${CATEGORIAS.join(', ')}).
Lista del usuario:
"""${texto}"""`;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data: any = await res.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const json = raw.replace(/```json|```/g, '').trim();
  const arr = JSON.parse(json);
  return (Array.isArray(arr) ? arr : []).map((x: any) => ({
    nombre: String(x.nombre || '').trim(),
    cantidad: Number(x.cantidad) || 1,
    unidad: String(x.unidad || 'un'),
    categoria: CATEGORIAS.includes(x.categoria) ? x.categoria : categorizar(String(x.nombre || '')),
  })).filter((x: ItemEstructurado) => x.nombre);
}

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }); }
  const texto = String(body?.texto || '').trim();
  if (!texto) return NextResponse.json({ error: 'Falta el texto de la lista' }, { status: 400 });

  const key = process.env.GEMINI_API_KEY;
  let items: ItemEstructurado[];
  let fuente = 'heuristico';
  if (key) {
    try { items = await parseGemini(texto, key); fuente = 'gemini'; }
    catch { items = parseHeuristico(texto); }
  } else {
    items = parseHeuristico(texto);
  }
  return NextResponse.json({ items, fuente, categorias: CATEGORIAS });
}
