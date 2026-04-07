import { createClient } from '@/lib/supabase/client';

export interface ProyeccionPuntosResult {
  programa: string;
  moneda: string;
  tasaPor1000: number;
  puntosEstimados: number;
  valorEstimadoCLP: number;
  banco: string;
  categoria: string;
  descripcion: string;
}

/**
 * Agente Poppins de Puntos
 *
 * Calcula los puntos/millas/dólares que el usuario acumulará
 * basándose en:
 * 1. La tarjeta registrada del empleador (banco, tipo, categoría)
 * 2. La tabla programas_puntos_banco (tasas actualizadas)
 * 3. El monto total del pago
 *
 * La tabla programas_puntos_banco se actualiza periódicamente
 * por el admin con datos de los portales bancarios.
 */
export async function calcularPuntosAgente(
  empleadorId: string,
  montoTotal: number
): Promise<ProyeccionPuntosResult | null> {
  const supabase = createClient();

  // 1. Obtener tarjeta principal del empleador
  const { data: tarjeta } = await supabase
    .from('tarjetas_cliente')
    .select('banco, tipo_tarjeta, categoria, programa_puntos, tasa_puntos')
    .eq('empleador_id', empleadorId)
    .eq('es_principal', true)
    .maybeSingle();

  if (!tarjeta) return null;

  // 2. Buscar programa de puntos en la base de datos
  const { data: programa } = await supabase
    .from('programas_puntos_banco')
    .select('*')
    .eq('banco', tarjeta.banco)
    .eq('tipo_tarjeta', tarjeta.tipo_tarjeta)
    .eq('categoria', tarjeta.categoria)
    .eq('activo', true)
    .maybeSingle();

  // 3. Calcular con datos del programa o fallback a tarjeta
  const tasaPor1000 = programa?.tasa_por_1000 ?? tarjeta.tasa_puntos ?? 1;
  const valorPuntoCLP = programa?.valor_punto_clp ?? 10;
  const moneda = programa?.moneda_puntos ?? 'puntos';
  const nombrePrograma = programa?.programa ?? tarjeta.programa_puntos ?? 'Puntos';

  const puntosEstimados = Math.floor((montoTotal / 1000) * tasaPor1000);
  const valorEstimadoCLP = puntosEstimados * valorPuntoCLP;

  return {
    programa: nombrePrograma,
    moneda,
    tasaPor1000,
    puntosEstimados,
    valorEstimadoCLP,
    banco: tarjeta.banco,
    categoria: tarjeta.categoria,
    descripcion: programa?.notas || `${tasaPor1000} ${moneda} por cada $1.000`,
  };
}
