// src/lib/pagos/suscripcion-engine.ts
//
// Motor PURO de la máquina de estados de suscripción Poppins (Fase 1).
// Sin I/O, sin Date.now() interno: todas las fechas se pasan como argumento
// para que sea 100% testeable y determinístico.
//
// Modelo de negocio (confirmado con el CTO):
//   - Starter = trial de 30 días, SIN tarjeta. Al terminar pasa a Pro o Pro+.
//   - Cobro recurrente: cada 30 días desde el inicio efectivo de la suscripción.
//   - Camino A ("Empezar ya", tarjeta al inicio): meses 1-2 SIN cobro → primer
//     cobro al día 60 ("mes 3"), luego cada 30 días, + 1 mes gratis cada 12 cobros.
//   - Camino B (sin tarjeta): usa el trial de 30 días; al día 30 se pide la
//     suscripción y se cobra desde el inicio de ésta, luego cada 30 días. Sin bonus.
//   - Ciclo anual: se cobra 1 vez = 10 meses (ahorro de 2); próximo cobro +365 días.
//   - Trial vencido sin suscripción → 'pausada' (solo-lectura, ver Fase 3).

import type { PlanTipo, CicloFacturacion } from './types';
import { getPrecio } from './plans';

export type EstadoSuscripcion =
  | 'trial' // dentro de los 30 días gratis
  | 'activa' // suscripción al día
  | 'past_due' // cobro falló, en gracia
  | 'pausada' // trial venció sin suscripción / impago → solo-lectura
  | 'cancelada';

export type CaminoActivacion = 'A_inmediato' | 'B_post_trial';

export const TRIAL_DIAS = 30;
export const CICLO_DIAS = 30; // cobro mensual = cada 30 días
export const CAMINO_A_MESES_GRATIS = 2; // meses 1-2 gratis → primer cobro "mes 3"
export const FREE_MONTH_CADA = 12; // 1 mes gratis cada 12 cobros (solo camino A)
export const CICLO_ANUAL_DIAS = 365;

/** Suma días a una fecha sin mutar el original. Pura (no usa Date.now). */
export function addDays(base: Date, dias: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}

/** Fin del trial de 30 días desde el alta. */
export function trialFin(alta: Date): Date {
  return addDays(alta, TRIAL_DIAS);
}

/** ¿La fecha `hoy` cae dentro del trial? */
export function enTrial(hoy: Date, alta: Date): boolean {
  return hoy.getTime() < trialFin(alta).getTime();
}

/** Días restantes de trial (0 si ya venció). */
export function diasRestantesTrial(hoy: Date, alta: Date): number {
  const ms = trialFin(alta).getTime() - hoy.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/**
 * Fecha del PRIMER cobro.
 * - Camino A: alta + 60 días (meses 1-2 gratis, primer cobro "mes 3").
 * - Camino B: la fecha en que se suscribe tras el trial (`fechaSuscripcion`).
 */
export function primerCobro(camino: CaminoActivacion, alta: Date, fechaSuscripcion: Date): Date {
  if (camino === 'A_inmediato') {
    return addDays(alta, CAMINO_A_MESES_GRATIS * CICLO_DIAS);
  }
  return fechaSuscripcion;
}

/**
 * Próximo cobro tras un cobro exitoso.
 * @param cobrosRealizados nº de cobros ya efectuados (para el mes-gratis-anual).
 * @returns fecha del próximo cobro y si ese próximo ciclo es bonificado (gratis).
 */
export function proximoCobro(
  camino: CaminoActivacion,
  ciclo: CicloFacturacion,
  ultimoCobro: Date,
  cobrosRealizados: number,
): { fecha: Date; gratis: boolean } {
  if (ciclo === 'anual') {
    return { fecha: addDays(ultimoCobro, CICLO_ANUAL_DIAS), gratis: false };
  }
  // Mensual: cada 30 días. Camino A regala 1 mes cada 12 cobros (el cobro nº 12, 24, …).
  const gratis =
    camino === 'A_inmediato' && cobrosRealizados > 0 && cobrosRealizados % FREE_MONTH_CADA === 0;
  return { fecha: addDays(ultimoCobro, CICLO_DIAS), gratis };
}

/** Monto a cobrar según plan y ciclo (anual = 10 meses). */
export function montoCobro(plan: PlanTipo, ciclo: CicloFacturacion): number {
  return getPrecio(plan, ciclo);
}

/**
 * Estado derivado para una suscripción en `trial`/sin activar, dado el reloj `hoy`.
 * - Si sigue dentro del trial → 'trial'.
 * - Si el trial venció y NO hay suscripción activa (sin tarjeta) → 'pausada'.
 * `tieneSuscripcionActiva` = true cuando ya entró por Camino A o se suscribió (B).
 */
export function estadoPorTrial(
  hoy: Date,
  alta: Date,
  tieneSuscripcionActiva: boolean,
): EstadoSuscripcion {
  if (tieneSuscripcionActiva) return 'activa';
  return enTrial(hoy, alta) ? 'trial' : 'pausada';
}

/** ¿La cuenta debe quedar en solo-lectura? (trial vencido sin suscripción / pausada). */
export function esSoloLectura(estado: EstadoSuscripcion): boolean {
  return estado === 'pausada' || estado === 'cancelada';
}
