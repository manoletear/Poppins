// ============================================================
// Calculadores de Haberes
// ============================================================

import type { Contrato, VariablesMensuales, Indicadores, DetalleHaber } from "../types";
import {
  FACTOR_GRATIFICACION_ART50,
  FACTOR_TOPE_GRATIFICACION_ART50,
  DIAS_MES,
  RECARGO_EXTRA_50,
  RECARGO_EXTRA_100,
} from "../constants";

/**
 * Calcula la gratificación legal mensual.
 *
 * Art. 50 (garantizada): 25% del sueldo, tope 4.75 IMM / 12
 * Art. 47 (proporcional a utilidades): requiere dato externo, se pasa como bono
 */
export function calcularGratificacion(
  sueldoBase: number,
  tipo: "art_47" | "art_50",
  imm: number
): number {
  if (tipo === "art_50") {
    const gratificacion = Math.round(sueldoBase * FACTOR_GRATIFICACION_ART50);
    const tope = Math.round(imm * FACTOR_TOPE_GRATIFICACION_ART50);
    return Math.min(gratificacion, tope);
  }
  // Art. 47: se maneja externamente como bono/variable
  return 0;
}

/**
 * Calcula el valor de una hora ordinaria de trabajo.
 */
export function calcularValorHora(sueldoBase: number, horasSemanales: number): number {
  const horasDiarias = horasSemanales / (horasSemanales <= 30 ? 5 : horasSemanales <= 45 ? (horasSemanales / 45) * 5 : 5);
  // Fórmula: sueldo / 30 / (horas_semanales / días_semana)
  // Simplificado: sueldo * 7 / (30 * horas_semanales)
  return sueldoBase * 7 / (DIAS_MES * horasSemanales);
}

/**
 * Calcula el monto de horas extra.
 */
export function calcularHorasExtra(
  sueldoBase: number,
  horasSemanales: number,
  horasExtra50: number,
  horasExtra100: number
): { monto50: number; monto100: number; total: number } {
  const valorHora = calcularValorHora(sueldoBase, horasSemanales);
  const monto50 = Math.round(valorHora * RECARGO_EXTRA_50 * horasExtra50);
  const monto100 = Math.round(valorHora * RECARGO_EXTRA_100 * horasExtra100);
  return { monto50, monto100, total: monto50 + monto100 };
}

/**
 * Construye la lista completa de haberes con clasificación.
 */
export function construirHaberes(
  contrato: Contrato,
  variables: VariablesMensuales,
  indicadores: Indicadores
): { haberes: DetalleHaber[]; totalImponible: number; totalNoImponible: number; totalTributable: number } {
  const haberes: DetalleHaber[] = [];

  // 1. Sueldo base (proporcional a días trabajados si corresponde)
  const sueldoProporcional = variables.dias_trabajados < 30
    ? Math.round(contrato.sueldo_base * variables.dias_trabajados / DIAS_MES)
    : contrato.sueldo_base;

  haberes.push({
    nombre: "Sueldo Base",
    monto: sueldoProporcional,
    imponible: true,
    tributable: true,
  });

  // 2. Gratificación legal
  const gratificacion = calcularGratificacion(
    sueldoProporcional,
    contrato.tipo_gratificacion,
    indicadores.imm
  );
  if (gratificacion > 0) {
    haberes.push({
      nombre: `Gratificación Legal (${contrato.tipo_gratificacion === "art_50" ? "Art. 50" : "Art. 47"})`,
      monto: gratificacion,
      imponible: true,
      tributable: true,
    });
  }

  // 3. Horas extra
  if (variables.horas_extra_50 > 0 || variables.horas_extra_100 > 0) {
    const extras = calcularHorasExtra(
      contrato.sueldo_base,
      contrato.horas_semanales,
      variables.horas_extra_50,
      variables.horas_extra_100
    );
    if (extras.monto50 > 0) {
      haberes.push({
        nombre: `Horas Extra 50% (${variables.horas_extra_50} hrs)`,
        monto: extras.monto50,
        imponible: true,
        tributable: true,
      });
    }
    if (extras.monto100 > 0) {
      haberes.push({
        nombre: `Horas Extra 100% (${variables.horas_extra_100} hrs)`,
        monto: extras.monto100,
        imponible: true,
        tributable: true,
      });
    }
  }

  // 4. Comisiones
  if (variables.comisiones > 0) {
    haberes.push({
      nombre: "Comisiones",
      monto: variables.comisiones,
      imponible: true,
      tributable: true,
    });
  }

  // 5. Bonos imponibles
  if (variables.bonos_imponibles > 0) {
    haberes.push({
      nombre: "Bonos Imponibles",
      monto: variables.bonos_imponibles,
      imponible: true,
      tributable: true,
    });
  }

  // 6. Colación (no imponible, no tributable)
  if (variables.colacion > 0) {
    haberes.push({
      nombre: "Asignación de Colación",
      monto: variables.colacion,
      imponible: false,
      tributable: false,
    });
  }

  // 7. Movilización (no imponible, no tributable)
  if (variables.movilizacion > 0) {
    haberes.push({
      nombre: "Asignación de Movilización",
      monto: variables.movilizacion,
      imponible: false,
      tributable: false,
    });
  }

  // 8. Viáticos
  if (variables.viatico > 0) {
    haberes.push({
      nombre: "Viáticos",
      monto: variables.viatico,
      imponible: false,
      tributable: false,
    });
  }

  // 9. Bonos no imponibles
  if (variables.bonos_no_imponibles > 0) {
    haberes.push({
      nombre: "Bonos No Imponibles",
      monto: variables.bonos_no_imponibles,
      imponible: false,
      tributable: false,
    });
  }

  // 10. Haberes adicionales
  for (const haber of variables.haberes_adicionales) {
    haberes.push({
      nombre: haber.nombre,
      monto: haber.monto,
      imponible: haber.imponible,
      tributable: haber.tributable,
    });
  }

  // Totales
  const totalImponible = haberes
    .filter((h) => h.imponible)
    .reduce((sum, h) => sum + h.monto, 0);

  const totalNoImponible = haberes
    .filter((h) => !h.imponible)
    .reduce((sum, h) => sum + h.monto, 0);

  const totalTributable = haberes
    .filter((h) => h.tributable)
    .reduce((sum, h) => sum + h.monto, 0);

  return { haberes, totalImponible, totalNoImponible, totalTributable };
}
