// ============================================================
// Calculadores de Cotizaciones Previsionales
// ============================================================

import type {
  AfpEmpleado,
  SaludEmpleado,
  Contrato,
  Indicadores,
  TramoAsignacionFamiliar,
  CargasFamiliares,
} from "../types";
import {
  TOPE_IMPONIBLE_PREVISION_UF,
  TOPE_IMPONIBLE_AFC_UF,
  TASA_SALUD_LEGAL,
  AFC,
} from "../constants";

export interface TopesCalculados {
  tope_prevision_pesos: number;
  tope_afc_pesos: number;
  renta_imponible_afp: number;
  renta_imponible_salud: number;
  renta_imponible_afc: number;
}

/**
 * Calcula los topes imponibles en pesos y aplica a la renta.
 */
export function calcularTopes(
  totalImponible: number,
  indicadores: Indicadores
): TopesCalculados {
  const topePrevision = Math.round(TOPE_IMPONIBLE_PREVISION_UF * indicadores.uf);
  const topeAfc = Math.round(TOPE_IMPONIBLE_AFC_UF * indicadores.uf);

  return {
    tope_prevision_pesos: topePrevision,
    tope_afc_pesos: topeAfc,
    renta_imponible_afp: Math.min(totalImponible, topePrevision),
    renta_imponible_salud: Math.min(totalImponible, topePrevision),
    renta_imponible_afc: Math.min(totalImponible, topeAfc),
  };
}

/**
 * Calcula la cotización AFP del trabajador.
 */
export function calcularAfp(
  rentaImponible: number,
  afp: AfpEmpleado,
  esPensionado: boolean
): number {
  if (esPensionado) return 0;
  return Math.round(rentaImponible * afp.tasa_trabajador);
}

/**
 * Calcula la cotización de salud.
 * - FONASA: 7% de la renta imponible
 * - ISAPRE: 7% legal + adicional si el plan excede el 7%
 */
export function calcularSalud(
  rentaImponible: number,
  salud: SaludEmpleado,
  indicadores: Indicadores
): { legal: number; adicional: number; total: number } {
  const legal = Math.round(rentaImponible * TASA_SALUD_LEGAL);

  if (salud.tipo === "fonasa") {
    return { legal, adicional: 0, total: legal };
  }

  // ISAPRE: el plan está en UF, convertir a pesos
  const planPesos = Math.round((salud.plan_uf ?? 0) * indicadores.uf);

  if (planPesos <= legal) {
    // El 7% cubre el plan completo
    return { legal, adicional: 0, total: legal };
  }

  // El plan excede el 7%, la diferencia es cotización adicional
  const adicional = planPesos - legal;
  return { legal, adicional, total: legal + adicional };
}

/**
 * Calcula el seguro de cesantía (AFC).
 */
export function calcularAfc(
  rentaImponibleAfc: number,
  tipoContrato: Contrato["tipo"],
  esPensionado: boolean
): { trabajador: number; empleador: number } {
  if (esPensionado) {
    return { trabajador: 0, empleador: 0 };
  }

  const tasas = AFC[tipoContrato];
  return {
    trabajador: Math.round(rentaImponibleAfc * tasas.trabajador),
    empleador: Math.round(rentaImponibleAfc * tasas.empleador),
  };
}

/**
 * Calcula la asignación familiar según tramo e ingreso.
 */
export function calcularAsignacionFamiliar(
  rentaImponible: number,
  cargas: CargasFamiliares,
  tramos: TramoAsignacionFamiliar[]
): { monto: number; tramo: string } {
  const totalCargas = cargas.simples + cargas.maternales + cargas.invalidez;
  if (totalCargas === 0) {
    return { monto: 0, tramo: "Sin cargas" };
  }

  // Encontrar el tramo según ingreso
  const tramoActual = tramos.find(
    (t) => rentaImponible >= t.ingreso_desde && rentaImponible <= t.ingreso_hasta
  );

  if (!tramoActual || tramoActual.monto_por_carga === 0) {
    return { monto: 0, tramo: tramoActual?.tramo ?? "D" };
  }

  const monto = tramoActual.monto_por_carga * totalCargas;
  return { monto, tramo: tramoActual.tramo };
}
