// ============================================================
// Poppins ERP - Tipos del Motor de Finiquitos Chile
// ============================================================

/**
 * Causales de terminación de contrato según el Código del Trabajo.
 *
 * 159-1 a 159-6: Causales del Art. 159 (sin indemnización)
 * 160-1 a 160-7: Causales disciplinarias del Art. 160 (sin indemnización)
 * 161-1, 161-2:  Necesidades de la empresa / Desahucio (con indemnización)
 */
export type CausalTermino =
  | "159-1" // Mutuo acuerdo
  | "159-2" // Renuncia del trabajador
  | "159-3" // Muerte del trabajador
  | "159-4" // Vencimiento del plazo
  | "159-5" // Conclusión del trabajo o servicio
  | "159-6" // Caso fortuito o fuerza mayor
  | "160-1" // Conductas indebidas graves
  | "160-2" // Negociaciones incompatibles
  | "160-3" // Inasistencia injustificada
  | "160-4" // Abandono del trabajo
  | "160-5" // Actos que afecten seguridad
  | "160-6" // Perjuicio material intencional
  | "160-7" // Incumplimiento grave obligaciones
  | "161-1" // Necesidades de la empresa
  | "161-2"; // Desahucio

// --- Input ---

export interface EmpleadoFiniquito {
  rut: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_ingreso: Date;
}

export interface ContratoFiniquito {
  tipo: "indefinido" | "plazo_fijo" | "obra_faena";
  fecha_inicio: Date;
  sueldo_base: number;
  tipo_gratificacion: "art_47" | "art_50";
  /**
   * Para contratos iniciados antes del 14-Ago-1981,
   * no aplica el tope de 11 años en indemnización.
   */
  inicio_antes_1981: boolean;
}

export interface InputFiniquito {
  empleado: EmpleadoFiniquito;
  contrato: ContratoFiniquito;

  /** Fecha efectiva de término de la relación laboral */
  fecha_termino: Date;

  /** Causal de terminación según Código del Trabajo */
  causal: CausalTermino;

  /** Días de vacaciones acumuladas pendientes de períodos anteriores */
  dias_vacaciones_pendientes: number;

  /** Días de vacaciones proporcionales del período en curso */
  dias_vacaciones_proporcionales: number;

  /**
   * Última remuneración mensual para cálculo de indemnización (Art. 172).
   * Incluye: sueldo base + pagos fijos periódicos.
   * Excluye: horas extra, gratificación, bonos irregulares, colación,
   *          movilización, viáticos.
   */
  ultima_remuneracion: number;

  /**
   * Si el empleador dio aviso con al menos 30 días de anticipación.
   * Solo relevante para causales 161-*.
   * true = se dio aviso → no se paga indemnización sustitutiva.
   */
  aviso_previo_dado: boolean;

  /** Ingreso Mínimo Mensual vigente (para topes de gratificación) */
  imm: number;
}

// --- Output ---

export interface ResultadoFiniquito {
  empleado_rut: string;
  empleado_nombre: string;
  fecha_termino: Date;
  causal: CausalTermino;

  /** Años de servicio completos (para cálculo de indemnización) */
  anos_servicio: number;

  // ── Conceptos del finiquito ──

  /** Remuneración por días trabajados en el mes de término */
  remuneracion_dias_trabajados: number;
  dias_trabajados_mes: number;

  /** Vacaciones pendientes acumuladas */
  vacaciones_pendientes: number;
  dias_vacaciones_pendientes: number;

  /** Vacaciones proporcionales del período en curso */
  vacaciones_proporcionales: number;
  dias_vacaciones_proporcionales: number;

  /** Gratificación proporcional a meses trabajados en el año en curso */
  gratificacion_proporcional: number;
  meses_trabajados_ano: number;

  /** Indemnización sustitutiva del aviso previo (Art. 161 + sin aviso) */
  indemnizacion_aviso_previo: number;

  /** Indemnización por años de servicio (Art. 161, tope 11 años salvo pre-1981) */
  indemnizacion_anos_servicio: number;
  meses_indemnizacion: number;

  /** Indica si se aplicó el tope de 11 años */
  tope_11_anos_aplicado: boolean;

  // ── Totales ──
  total_finiquito: number;
}
