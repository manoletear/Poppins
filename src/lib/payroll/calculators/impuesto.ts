// ============================================================
// Calculador de Impuesto Único de Segunda Categoría
// ============================================================

import type { TramoImpuesto } from "../types";

export interface ResultadoImpuesto {
  /** Monto del impuesto en pesos */
  monto: number;
  /** Número del tramo aplicado (1-8) */
  tramo: number;
  /** Base tributable en pesos */
  base_pesos: number;
  /** Base tributable en UTM */
  base_utm: number;
  /** Factor del tramo */
  factor: number;
  /** Rebaja aplicada en pesos */
  rebaja_pesos: number;
}

/**
 * Calcula la base tributable.
 *
 * base = total_haberes_tributables - AFP - salud_legal(7%) - AFC_trabajador - APV_régimen_B
 *
 * APV Régimen A NO reduce la base tributable (se descuenta post-impuesto).
 * APV Régimen B SÍ reduce la base tributable (beneficio tributario).
 */
export function calcularBaseTributable(
  totalHaberesTributables: number,
  afpMonto: number,
  saludLegal: number,
  afcTrabajador: number,
  apvMonto: number,
  apvRegimen: "A" | "B" | null
): number {
  let base = totalHaberesTributables - afpMonto - saludLegal - afcTrabajador;

  // APV Régimen B reduce la base tributable
  if (apvRegimen === "B" && apvMonto > 0) {
    base -= apvMonto;
  }

  return Math.max(0, base);
}

/**
 * Calcula el Impuesto Único de Segunda Categoría.
 *
 * Proceso:
 * 1. Convertir base tributable a UTM
 * 2. Encontrar tramo en tabla progresiva
 * 3. Aplicar: impuesto = (base_utm × factor - rebaja_utm) × valor_utm
 */
export function calcularImpuestoUnico(
  baseTributable: number,
  utm: number,
  tramos: TramoImpuesto[]
): ResultadoImpuesto {
  if (baseTributable <= 0 || utm <= 0) {
    return {
      monto: 0,
      tramo: 1,
      base_pesos: baseTributable,
      base_utm: 0,
      factor: 0,
      rebaja_pesos: 0,
    };
  }

  const baseUtm = baseTributable / utm;

  // Encontrar el tramo
  let tramoIdx = 0;
  for (let i = 0; i < tramos.length; i++) {
    if (baseUtm > tramos[i].desde_utm) {
      tramoIdx = i;
    }
  }

  const tramo = tramos[tramoIdx];

  // Tramo exento
  if (tramo.factor === 0) {
    return {
      monto: 0,
      tramo: tramoIdx + 1,
      base_pesos: baseTributable,
      base_utm: baseUtm,
      factor: 0,
      rebaja_pesos: 0,
    };
  }

  // Calcular impuesto: (base_utm × factor - rebaja_utm) × utm
  const impuestoUtm = baseUtm * tramo.factor - tramo.rebaja_utm;
  const impuestoPesos = Math.round(Math.max(0, impuestoUtm * utm));
  const rebajaPesos = Math.round(tramo.rebaja_utm * utm);

  return {
    monto: impuestoPesos,
    tramo: tramoIdx + 1,
    base_pesos: baseTributable,
    base_utm: baseUtm,
    factor: tramo.factor,
    rebaja_pesos: rebajaPesos,
  };
}
