// ============================================================
// Poppins ERP - Motor de Cálculo de Liquidaciones Chile
// ============================================================
//
// Función pura: recibe datos tipados, devuelve liquidación completa.
// Sin side effects, sin fetch, sin DB.
//
// Orden de cálculo (según legislación chilena):
// 1. Construir haberes (sueldo, gratificación, extras, bonos)
// 2. Aplicar topes imponibles (81.6 UF / 122.6 UF)
// 3. Calcular AFP trabajador
// 4. Calcular salud (FONASA/ISAPRE)
// 5. Calcular AFC trabajador
// 6. Calcular base tributable
// 7. Calcular impuesto único (tabla progresiva UTM)
// 8. Aplicar descuentos voluntarios
// 9. Calcular asignación familiar
// 10. Calcular costos empleador (SIS, mutual, AFC)
// 11. Calcular líquido a pagar
// ============================================================

import type {
  InputLiquidacion,
  ResultadoLiquidacion,
  DetalleDescuento,
} from "./types";
import { construirHaberes } from "./calculators/haberes";
import { calcularTopes, calcularAfp, calcularSalud, calcularAfc, calcularAsignacionFamiliar } from "./calculators/prevision";
import { calcularBaseTributable, calcularImpuestoUnico } from "./calculators/impuesto";
import { calcularCostosEmpleador } from "./calculators/empleador";

/**
 * Calcula una liquidación de sueldo completa.
 *
 * @param input - Todos los datos necesarios para el cálculo
 * @param periodo - Período en formato "YYYY-MM" (ej: "2026-03")
 * @returns Liquidación completa con haberes, descuentos, líquido y costos empleador
 */
export function calcularLiquidacion(
  input: InputLiquidacion,
  periodo: string
): ResultadoLiquidacion {
  const { empleado, contrato, afp, salud, cargas, variables, indicadores, empresa, tramos_impuesto, tramos_asignacion_familiar } = input;

  // ── 1. HABERES ──────────────────────────────────────────────
  const { haberes, totalImponible, totalNoImponible, totalTributable } =
    construirHaberes(contrato, variables, indicadores);

  const totalHaberes = totalImponible + totalNoImponible;

  // ── 2. TOPES IMPONIBLES ─────────────────────────────────────
  const topes = calcularTopes(totalImponible, indicadores);

  // ── 3. AFP ──────────────────────────────────────────────────
  const afpMonto = calcularAfp(
    topes.renta_imponible_afp,
    afp,
    empleado.es_pensionado
  );

  // ── 4. SALUD ────────────────────────────────────────────────
  const saludResult = calcularSalud(
    topes.renta_imponible_salud,
    salud,
    indicadores
  );

  // ── 5. AFC TRABAJADOR ───────────────────────────────────────
  const afcResult = calcularAfc(
    topes.renta_imponible_afc,
    contrato.tipo,
    empleado.es_pensionado
  );

  // ── 6. BASE TRIBUTABLE ──────────────────────────────────────
  const baseTributable = calcularBaseTributable(
    totalTributable,
    afpMonto,
    saludResult.legal,
    afcResult.trabajador,
    variables.apv_monto,
    variables.apv_regimen
  );

  // ── 7. IMPUESTO ÚNICO ───────────────────────────────────────
  const impuestoResult = calcularImpuestoUnico(
    baseTributable,
    indicadores.utm,
    tramos_impuesto
  );

  // ── 8. DESCUENTOS ───────────────────────────────────────────
  const descuentos: DetalleDescuento[] = [];

  // Descuentos legales
  descuentos.push({ nombre: `AFP ${afp.nombre} (${(afp.tasa_trabajador * 100).toFixed(2)}%)`, monto: afpMonto, tipo: "legal" });
  descuentos.push({ nombre: `Salud ${salud.nombre} (7%)`, monto: saludResult.legal, tipo: "legal" });

  if (saludResult.adicional > 0) {
    descuentos.push({ nombre: `Salud Adicional ${salud.nombre}`, monto: saludResult.adicional, tipo: "legal" });
  }

  if (afcResult.trabajador > 0) {
    descuentos.push({ nombre: "Seguro de Cesantía (0.6%)", monto: afcResult.trabajador, tipo: "legal" });
  }

  if (impuestoResult.monto > 0) {
    descuentos.push({ nombre: `Impuesto Único (Tramo ${impuestoResult.tramo})`, monto: impuestoResult.monto, tipo: "legal" });
  }

  // APV (según régimen)
  if (variables.apv_monto > 0) {
    descuentos.push({
      nombre: `APV Régimen ${variables.apv_regimen}`,
      monto: variables.apv_monto,
      tipo: "voluntario",
    });
  }

  // Descuentos adicionales (anticipos, préstamos, sindicato, etc.)
  for (const desc of variables.descuentos_adicionales) {
    descuentos.push({
      nombre: desc.nombre,
      monto: desc.monto,
      tipo: "voluntario",
    });
  }

  const totalDescuentosLegales = descuentos
    .filter((d) => d.tipo === "legal")
    .reduce((sum, d) => sum + d.monto, 0);

  const totalDescuentosVoluntarios = descuentos
    .filter((d) => d.tipo === "voluntario")
    .reduce((sum, d) => sum + d.monto, 0);

  const totalDescuentos = totalDescuentosLegales + totalDescuentosVoluntarios;

  // ── 9. ASIGNACIÓN FAMILIAR ──────────────────────────────────
  const asigFamiliar = calcularAsignacionFamiliar(
    totalImponible,
    cargas,
    tramos_asignacion_familiar
  );
  const totalCargas = cargas.simples + cargas.maternales + cargas.invalidez;

  // ── 10. COSTOS EMPLEADOR ────────────────────────────────────
  const costoEmpleador = calcularCostosEmpleador(
    topes.renta_imponible_afp,
    afcResult.empleador,
    empresa,
    empleado.es_pensionado
  );

  // ── 11. LÍQUIDO A PAGAR ─────────────────────────────────────
  const liquidoAPagar = totalHaberes - totalDescuentos + asigFamiliar.monto;

  // ── RESULTADO ───────────────────────────────────────────────
  return {
    periodo,
    empleado_rut: empleado.rut,
    empleado_nombre: `${empleado.nombre} ${empleado.apellido_paterno} ${empleado.apellido_materno}`,
    dias_trabajados: variables.dias_trabajados,

    haberes,
    total_haberes_imponibles: totalImponible,
    total_haberes_no_imponibles: totalNoImponible,
    total_haberes: totalHaberes,

    renta_imponible_afp: topes.renta_imponible_afp,
    renta_imponible_salud: topes.renta_imponible_salud,
    renta_imponible_afc: topes.renta_imponible_afc,
    base_tributable: baseTributable,

    tope_imponible_afp_pesos: topes.tope_prevision_pesos,
    tope_imponible_afc_pesos: topes.tope_afc_pesos,

    descuentos,

    afp_nombre: afp.nombre,
    afp_tasa: afp.tasa_trabajador,
    afp_monto: afpMonto,
    salud_tipo: salud.tipo,
    salud_nombre: salud.nombre,
    salud_monto_legal: saludResult.legal,
    salud_monto_adicional: saludResult.adicional,
    salud_monto_total: saludResult.total,
    afc_trabajador: afcResult.trabajador,
    impuesto_unico: impuestoResult.monto,
    tramo_impuesto: impuestoResult.tramo,

    total_descuentos_legales: totalDescuentosLegales,
    total_descuentos_voluntarios: totalDescuentosVoluntarios,
    total_descuentos: totalDescuentos,

    asignacion_familiar: asigFamiliar.monto,
    tramo_asignacion_familiar: asigFamiliar.tramo,
    total_cargas: totalCargas,

    liquido_a_pagar: liquidoAPagar,

    costo_empleador: costoEmpleador,

    uf_utilizada: indicadores.uf,
    utm_utilizada: indicadores.utm,
    imm_utilizado: indicadores.imm,
  };
}
