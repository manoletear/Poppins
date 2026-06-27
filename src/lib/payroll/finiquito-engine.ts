// ============================================================
// Poppins ERP - Motor de Cálculo de Finiquitos Chile
// ============================================================
//
// Función pura: recibe datos tipados, devuelve finiquito completo.
// Sin side effects, sin fetch, sin DB.
//
// Legislación aplicable:
// - Art. 159: Causales sin indemnización
// - Art. 160: Causales disciplinarias sin indemnización
// - Art. 161: Necesidades empresa / Desahucio → con indemnización
// - Art. 172: Definición de "última remuneración" para indemnización
// - Art. 73:  Vacaciones proporcionales
// - Tope 11 años: salvo contratos iniciados antes del 14-Ago-1981
// ============================================================

import type { InputFiniquito, ResultadoFiniquito } from "./finiquito-types";
import { DIAS_MES, FACTOR_GRATIFICACION_ART50, FACTOR_TOPE_GRATIFICACION_ART50, TCP_TOPE_INDEMNIZACION_MES_UF } from "./constants";

/**
 * Calcula un finiquito completo según la legislación laboral chilena.
 *
 * @param input - Todos los datos necesarios para el cálculo
 * @returns Finiquito con desglose de todos los conceptos
 */
export function calcularFiniquito(input: InputFiniquito): ResultadoFiniquito {
  const { empleado, contrato, fecha_termino, causal, ultima_remuneracion, imm, uf } = input;

  // ── 1. DÍAS TRABAJADOS EN MES DE TÉRMINO ─────────────────
  const diaDelMes = fecha_termino.getUTCDate();
  const valorDiaSueldoBase = contrato.sueldo_base / DIAS_MES;
  const remuneracionDiasTrabajados = Math.round(valorDiaSueldoBase * diaDelMes);

  // ── 2. VACACIONES PENDIENTES ACUMULADAS ──────────────────
  // Art. 73 CT: usar última remuneración (no sueldo_base) para valorar días
  const valorDiaUltimaRemun = ultima_remuneracion / DIAS_MES;
  const vacacionesPendientes = Math.round(input.dias_vacaciones_pendientes * valorDiaUltimaRemun);

  // ── 3. VACACIONES PROPORCIONALES ─────────────────────────
  const vacacionesProporcionales = Math.round(input.dias_vacaciones_proporcionales * valorDiaUltimaRemun);

  // ── 4. GRATIFICACIÓN PROPORCIONAL ────────────────────────
  const mesesTrabajadosAno = calcularMesesTrabajadosEnAno(contrato.fecha_inicio, fecha_termino);
  const gratificacionProporcional = calcularGratificacionProporcional(
    contrato.sueldo_base,
    contrato.tipo_gratificacion,
    mesesTrabajadosAno,
    imm
  );

  // ── 5. AÑOS DE SERVICIO ──────────────────────────────────
  const anosServicio = calcularAnosServicio(contrato.fecha_inicio, fecha_termino);

  // ── 6. INDEMNIZACIONES (solo Art. 161) ───────────────────
  const tieneIndemnizacion = causal === "161-1" || causal === "161-2";

  let indemnizacionAvisoPrevio = 0;
  let indemnizacionAnosServicio = 0;
  let mesesIndemnizacion = 0;
  let tope11AnosAplicado = false;

  if (tieneIndemnizacion) {
    // Aviso previo: 1 mes de última remuneración si no se dio aviso de 30 días
    if (!input.aviso_previo_dado) {
      indemnizacionAvisoPrevio = Math.round(ultima_remuneracion);
    }

    // Años de servicio: 1 mes por año, tope 11 años (salvo pre-1981)
    mesesIndemnizacion = anosServicio;

    if (!contrato.inicio_antes_1981 && mesesIndemnizacion > 11) {
      mesesIndemnizacion = 11;
      tope11AnosAplicado = true;
    }

    const montoMes = Math.min(ultima_remuneracion, TCP_TOPE_INDEMNIZACION_MES_UF * uf);
    indemnizacionAnosServicio = Math.round(montoMes * mesesIndemnizacion);
  }

  // ── 7. TOTAL ─────────────────────────────────────────────
  const totalFiniquito =
    remuneracionDiasTrabajados +
    vacacionesPendientes +
    vacacionesProporcionales +
    gratificacionProporcional +
    indemnizacionAvisoPrevio +
    indemnizacionAnosServicio;

  // ── RESULTADO ────────────────────────────────────────────
  return {
    empleado_rut: empleado.rut,
    empleado_nombre: `${empleado.nombre} ${empleado.apellido_paterno} ${empleado.apellido_materno}`,
    fecha_termino,
    causal,

    anos_servicio: anosServicio,

    remuneracion_dias_trabajados: remuneracionDiasTrabajados,
    dias_trabajados_mes: diaDelMes,

    vacaciones_pendientes: vacacionesPendientes,
    dias_vacaciones_pendientes: input.dias_vacaciones_pendientes,

    vacaciones_proporcionales: vacacionesProporcionales,
    dias_vacaciones_proporcionales: input.dias_vacaciones_proporcionales,

    gratificacion_proporcional: gratificacionProporcional,
    meses_trabajados_ano: mesesTrabajadosAno,

    indemnizacion_aviso_previo: indemnizacionAvisoPrevio,

    indemnizacion_anos_servicio: indemnizacionAnosServicio,
    meses_indemnizacion: mesesIndemnizacion,
    tope_11_anos_aplicado: tope11AnosAplicado,

    total_finiquito: totalFiniquito,
  };
}

// ── Helpers ─────────────────────────────────────────────────

/**
 * Calcula los años de servicio para indemnización Art. 163 CT.
 * Fracción de año SUPERIOR a 6 meses equivale a un año completo.
 */
function calcularAnosServicio(fechaInicio: Date, fechaTermino: Date): number {
  let anos = fechaTermino.getUTCFullYear() - fechaInicio.getUTCFullYear();
  const mesInicio = fechaInicio.getUTCMonth();
  const mesTermino = fechaTermino.getUTCMonth();

  if (
    mesTermino < mesInicio ||
    (mesTermino === mesInicio && fechaTermino.getUTCDate() < fechaInicio.getUTCDate())
  ) {
    anos--;
  }

  // Art. 163 CT: fracción superior a 6 meses cuenta como año completo
  const anniversaryYear = fechaInicio.getUTCFullYear() + anos;
  const halfAnniversary = new Date(Date.UTC(
    anniversaryYear,
    fechaInicio.getUTCMonth() + 6, // auto-overflow to next year
    fechaInicio.getUTCDate(),
  ));
  if (fechaTermino > halfAnniversary) anos++;

  return Math.max(0, anos);
}

/**
 * Calcula los meses trabajados en el año en curso (para gratificación proporcional).
 * Si el contrato inició en un año anterior, cuenta desde enero.
 * Si inició en el mismo año del término, cuenta desde el mes de inicio.
 */
function calcularMesesTrabajadosEnAno(fechaInicio: Date, fechaTermino: Date): number {
  const anoTermino = fechaTermino.getUTCFullYear();
  const mesTermino = fechaTermino.getUTCMonth(); // 0-based

  let mesDesde: number;
  if (fechaInicio.getUTCFullYear() < anoTermino) {
    mesDesde = 0; // Enero
  } else {
    mesDesde = fechaInicio.getUTCMonth();
  }

  // Meses completos + 1 para incluir el mes parcial de término
  return mesTermino - mesDesde + 1;
}

/**
 * Calcula gratificación proporcional según tipo de gratificación del contrato.
 * Art. 50: 25% del sueldo, tope 4.75 IMM / 12 mensual, proporcional a meses trabajados.
 */
function calcularGratificacionProporcional(
  sueldoBase: number,
  tipoGratificacion: "art_47" | "art_50",
  mesesTrabajados: number,
  imm: number
): number {
  if (tipoGratificacion === "art_50") {
    const gratMensual = sueldoBase * FACTOR_GRATIFICACION_ART50;
    const topeMensual = imm * FACTOR_TOPE_GRATIFICACION_ART50;
    const gratAplicada = Math.min(gratMensual, topeMensual);
    return Math.round(gratAplicada * mesesTrabajados);
  }

  // Art. 47: depende de utilidades de la empresa, no se puede calcular aquí.
  // Se retorna 0 y se espera que se ingrese como monto manual.
  return 0;
}
