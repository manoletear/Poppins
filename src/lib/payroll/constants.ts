// ============================================================
// Poppins ERP - Constantes y Parámetros Legales Chile
// ============================================================

import type { TramoImpuesto, TramoAsignacionFamiliar } from "./types";

// --- Topes imponibles en UF ---

/** Tope imponible AFP, Salud, SIS, Mutual */
export const TOPE_IMPONIBLE_PREVISION_UF = 81.6;

/** Tope imponible Seguro de Cesantía (AFC) */
export const TOPE_IMPONIBLE_AFC_UF = 122.6;

// --- Tasas previsionales ---

/** Cotización obligatoria AFP (sin comisión) */
export const TASA_AFP_OBLIGATORIA = 0.1;

/** Cotización legal salud */
export const TASA_SALUD_LEGAL = 0.07;

/** Seguro Invalidez y Sobrevivencia - pagado por empleador */
export const TASA_SIS_DEFAULT = 0.0153;

/** Tasa base mutual ATEP */
export const TASA_MUTUAL_BASE = 0.0093;

// --- Seguro de Cesantía (AFC) ---

export const AFC = {
  indefinido: { trabajador: 0.006, empleador: 0.024 },
  plazo_fijo: { trabajador: 0, empleador: 0.03 },
  obra_faena: { trabajador: 0, empleador: 0.03 },
} as const;

// --- AFPs con tasas (actualizar periódicamente) ---

export const AFPS = [
  { codigo: "03", nombre: "Capital", tasa_trabajador: 0.1144 },
  { codigo: "05", nombre: "Cuprum", tasa_trabajador: 0.1144 },
  { codigo: "08", nombre: "Habitat", tasa_trabajador: 0.1127 },
  { codigo: "29", nombre: "Modelo", tasa_trabajador: 0.1058 },
  { codigo: "04", nombre: "Planvital", tasa_trabajador: 0.1116 },
  { codigo: "33", nombre: "ProVida", tasa_trabajador: 0.1145 },
  { codigo: "34", nombre: "Uno", tasa_trabajador: 0.1049 },
] as const;

// --- Tramos Impuesto Único (actualizar según SII) ---

export const TRAMOS_IMPUESTO_DEFAULT: TramoImpuesto[] = [
  { desde_utm: 0, hasta_utm: 13.5, factor: 0, rebaja_utm: 0 },
  { desde_utm: 13.5, hasta_utm: 30, factor: 0.04, rebaja_utm: 0.54 },
  { desde_utm: 30, hasta_utm: 50, factor: 0.08, rebaja_utm: 1.74 },
  { desde_utm: 50, hasta_utm: 70, factor: 0.135, rebaja_utm: 4.49 },
  { desde_utm: 70, hasta_utm: 90, factor: 0.23, rebaja_utm: 11.14 },
  { desde_utm: 90, hasta_utm: 120, factor: 0.304, rebaja_utm: 17.8 },
  { desde_utm: 120, hasta_utm: 310, factor: 0.35, rebaja_utm: 23.32 },
  { desde_utm: 310, hasta_utm: Infinity, factor: 0.4, rebaja_utm: 38.82 },
];

// --- Tramos Asignación Familiar (actualizar semestralmente) ---

export const TRAMOS_ASIGNACION_FAMILIAR_DEFAULT: TramoAsignacionFamiliar[] = [
  { tramo: "A", ingreso_desde: 0, ingreso_hasta: 441115, monto_por_carga: 16793 },
  { tramo: "B", ingreso_desde: 441116, ingreso_hasta: 644201, monto_por_carga: 10302 },
  { tramo: "C", ingreso_desde: 644202, ingreso_hasta: 1004818, monto_por_carga: 3255 },
  { tramo: "D", ingreso_desde: 1004819, ingreso_hasta: Infinity, monto_por_carga: 0 },
];

// --- Jornada ---

/** Horas semanales jornada completa (Ley 40hrs, desde abril 2026: 42hrs) */
export const HORAS_JORNADA_COMPLETA = 45;

/** Días del mes para cálculo de valor hora */
export const DIAS_MES = 30;

// --- Recargos horas extra ---

export const RECARGO_EXTRA_50 = 1.5;
export const RECARGO_EXTRA_100 = 2.0;

// --- Gratificación Art. 50 ---

/** Factor de gratificación Art. 50: 25% del sueldo */
export const FACTOR_GRATIFICACION_ART50 = 0.25;

/** Tope gratificación Art. 50: 4.75 IMM / 12 */
export const FACTOR_TOPE_GRATIFICACION_ART50 = 4.75 / 12;
