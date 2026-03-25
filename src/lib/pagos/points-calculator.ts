// src/lib/pagos/points-calculator.ts
import type { TarjetaCliente, ProyeccionPuntos, MetaPasaje } from './types';

// Popular destinations from Santiago (roundtrip Latam Pass miles)
const DESTINOS_POPULARES: MetaPasaje[] = [
  { destino: 'Lima', millas_necesarias: 15000, millas_actuales: 0 },
  { destino: 'Buenos Aires', millas_necesarias: 15000, millas_actuales: 0 },
  { destino: 'Bogota', millas_necesarias: 25000, millas_actuales: 0 },
  { destino: 'Caracas', millas_necesarias: 35000, millas_actuales: 0 },
  { destino: 'Ciudad de Mexico', millas_necesarias: 35000, millas_actuales: 0 },
  { destino: 'Miami', millas_necesarias: 40000, millas_actuales: 0 },
  { destino: 'Madrid', millas_necesarias: 60000, millas_actuales: 0 },
  { destino: 'Puerto Principe', millas_necesarias: 40000, millas_actuales: 0 },
];

/**
 * Calculate projected points for a given monthly payment volume
 */
export function calcularProyeccion(
  tarjeta: Pick<TarjetaCliente, 'tasa_puntos' | 'programa_puntos'>,
  montoMensualTotal: number,
  puntosAcumulados: number,
): ProyeccionPuntos {
  const puntosMes = Math.floor((montoMensualTotal / 1000) * tarjeta.tasa_puntos);
  const puntosTotal = puntosAcumulados + puntosMes;

  // Find closest achievable destination
  const metaDestinos = DESTINOS_POPULARES
    .map(d => ({ ...d, millas_actuales: puntosTotal }))
    .sort((a, b) => (a.millas_necesarias - a.millas_actuales) - (b.millas_necesarias - b.millas_actuales));

  const metaAlcanzable = metaDestinos.find(d => d.millas_necesarias > puntosTotal) || metaDestinos[0];
  const millasRestantes = Math.max(0, metaAlcanzable.millas_necesarias - puntosTotal);
  const mesesRestantes = puntosMes > 0 ? Math.ceil(millasRestantes / puntosMes) : 999;

  return {
    puntos_mes_actual: puntosMes,
    puntos_acumulados: puntosTotal,
    valor_estimado_clp: puntosTotal * 10,
    meta_pasaje: { ...metaAlcanzable, millas_actuales: puntosTotal },
    porcentaje_meta: Math.min(100, Math.round((puntosTotal / metaAlcanzable.millas_necesarias) * 100)),
    meses_restantes: mesesRestantes,
  };
}

export function getDestinosDisponibles(puntosActuales: number): MetaPasaje[] {
  return DESTINOS_POPULARES.map(d => ({
    ...d,
    millas_actuales: puntosActuales,
  }));
}
