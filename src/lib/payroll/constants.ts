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

/** Horas semanales jornada completa (Ley 21.561: 44h desde abr-2024, 42h desde abr-2026) */
export const HORAS_JORNADA_COMPLETA = 42;

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

// ============================================================
// TCP - Trabajadoras de Casa Particular (Ley 20.786 / 21.545)
// Source: github.com/manoletear/Laboral_Chileno
// ============================================================

// --- Jornada TCP ---

/** Jornada máxima TCP con retiro (puertas afuera), incluye 1h colación */
export const TCP_JORNADA_MAX_CON_RETIRO = 12;

/** Jornada máxima TCP sin retiro (puertas adentro), + 9h descanso continuo */
export const TCP_JORNADA_MAX_SIN_RETIRO = 12;

/** Descanso continuo nocturno TCP sin retiro */
export const TCP_DESCANSO_NOCTURNO = 9;

/** Descanso semanal TCP con retiro: 1.5 días (domingo + ½ sábado) */
export const TCP_DESCANSO_SEMANAL_CON_RETIRO = 1.5;

/** Descanso semanal TCP sin retiro: 1 día */
export const TCP_DESCANSO_SEMANAL_SIN_RETIRO = 1;

// --- Reducción jornada 40h (Ley 21.561) ---

export const JORNADA_40H = {
  hasta_abr_2024: 45,
  abr_2024_a_2026: 44,
  abr_2026_a_2028: 42,
  desde_abr_2028: 40,
} as const;

/** Jornada actual vigente (actualizar según fecha) */
export const JORNADA_VIGENTE = 42; // Ley 21.561 — vigente desde abril 2026

// --- Remuneración TCP ---

/** Sueldo mínimo TCP (igual al IMM general desde Ley 20.786) */
export const TCP_SUELDO_MINIMO_JUL_2024 = 500000;
export const TCP_SUELDO_MINIMO_JUL_2025 = 510966;

/** Máximo pago en especies (habitación, alimentación) */
export const TCP_ESPECIES_MAX_PORCENTAJE = 0.5;

/** Período de prueba TCP (días) */
export const TCP_PERIODO_PRUEBA_DIAS = 30;

// --- Finiquito TCP ---

/** Tope indemnización por mes para TCP: 90 UF */
export const TCP_TOPE_INDEMNIZACION_MES_UF = 90;

/** Tope años indemnización (general + TCP) */
export const TOPE_ANOS_INDEMNIZACION = 11;

// --- Vacaciones ---

/** Días hábiles de vacaciones por año (sábado cuenta como hábil) */
export const VACACIONES_DIAS_HABILES_ANUAL = 15;

/** Fórmula: (días_trabajados / 365) × 15 */
export const VACACIONES_FACTOR_PROPORCIONAL = 15 / 365;

/** Máximo períodos acumulables sin tomar */
export const VACACIONES_MAX_PERIODOS_ACUMULADOS = 2;

// --- Progresivas ---

/** Años mínimos con mismo empleador para vacaciones progresivas */
export const VACACIONES_PROGRESIVAS_ANOS_MIN = 10;

/** Días adicionales por cada 3 años sobre el mínimo */
export const VACACIONES_PROGRESIVAS_DIAS_POR_3_ANOS = 1;

// --- ISL TCP (Ley 21.545) ---

/** Tasa ISL base para TCP (accidentes del trabajo) */
export const TCP_TASA_ISL_BASE = 0.009;

// --- Cotización empleador Ley 21.735 (nuevo pilar) ---

export const TASA_COTIZACION_EMPLEADOR_21735 = 0.06; // 6% gradual

// --- PREVIRED ---

/** Día máximo de pago cotizaciones */
export const PREVIRED_DIA_LIMITE = 10;

/** Mora mensual por atraso */
export const PREVIRED_MORA_MENSUAL = 0.03;

// --- Descuentos voluntarios ---

/** Límite descuentos voluntarios (Art. 58 CT) */
export const LIMITE_DESCUENTOS_VOLUNTARIOS = 0.15;

// --- Feriados irrenunciables ---

export const FERIADOS_IRRENUNCIABLES = [
  { mes: 1, dia: 1, nombre: "Año Nuevo" },
  { mes: 5, dia: 1, nombre: "Día del Trabajo" },
  { mes: 9, dia: 18, nombre: "Fiestas Patrias" },
  { mes: 9, dia: 19, nombre: "Día de las Glorias del Ejército" },
  { mes: 12, dia: 25, nombre: "Navidad" },
] as const;

// --- Maternidad TCP ---

export const MATERNIDAD = {
  prenatal_semanas: 6,
  prenatal_dias: 42,
  postnatal_semanas: 12,
  postnatal_dias: 84,
  postnatal_parental_semanas: 12,
  postnatal_parental_dias: 84,
  postnatal_parental_media_jornada_semanas: 18,
  permiso_paternidad_dias: 5,
  fuero_maternal_hasta: "1 año después del postnatal",
} as const;

// --- Ley Karin (21.643) ---

export const LEY_KARIN = {
  plazo_investigacion_dias_habiles: 30,
  multa_minima_utm: 1,
  multa_maxima_utm: 200,
} as const;

// --- Retención boletas honorarios ---

export const RETENCION_HONORARIOS = {
  2024: 0.1375,
  2025: 0.145,
  2026: 0.1525,
  2027: 0.16,
  2028: 0.17,
} as const;
