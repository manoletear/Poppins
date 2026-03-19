// ============================================================
// Calculador de Costos Empleador
// ============================================================

import type { CostoEmpleador, ParametrosEmpresa } from "../types";

/**
 * Calcula los costos que paga el empleador (no se descuentan del sueldo).
 *
 * - SIS (Seguro Invalidez y Sobrevivencia): ~1.53%
 * - Mutual ATEP (Accidentes del Trabajo): base 0.93% + adicional
 * - AFC empleador: 2.4% (indefinido) o 3% (plazo fijo/obra)
 */
export function calcularCostosEmpleador(
  rentaImponiblePrevision: number,
  afcEmpleador: number,
  empresa: ParametrosEmpresa,
  esPensionado: boolean
): CostoEmpleador {
  const sis = esPensionado ? 0 : Math.round(rentaImponiblePrevision * empresa.tasa_sis);
  const mutual = Math.round(rentaImponiblePrevision * empresa.tasa_mutual);

  return {
    afc_empleador: afcEmpleador,
    sis,
    mutual,
    total: afcEmpleador + sis + mutual,
  };
}
