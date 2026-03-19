// ============================================================
// Poppins ERP - Tipos del Motor de Liquidaciones Chile
// ============================================================

// --- Inputs ---

export interface Empleado {
  rut: string;
  nombre: string;
  apellido_paterno: string;
  apellido_materno: string;
  fecha_nacimiento: Date;
  sexo: "M" | "F";
  fecha_ingreso: Date;
  es_pensionado: boolean;
  /** Art. 22 inc. 2 - excluido de límite de jornada */
  art22_excluido: boolean;
}

export interface Contrato {
  tipo: "indefinido" | "plazo_fijo" | "obra_faena";
  fecha_inicio: Date;
  sueldo_base: number;
  tipo_gratificacion: "art_47" | "art_50";
  tipo_jornada: "completa" | "parcial" | "art_22";
  horas_semanales: number;
}

export interface AfpEmpleado {
  codigo: string;
  nombre: string;
  /** Tasa total trabajador (10% + comisión). Ej: 0.1144 */
  tasa_trabajador: number;
}

export interface SaludEmpleado {
  tipo: "fonasa" | "isapre";
  nombre: string;
  /** Solo ISAPRE: valor del plan en UF */
  plan_uf?: number;
}

export interface CargasFamiliares {
  simples: number;
  maternales: number;
  invalidez: number;
}

export interface HaberAdicional {
  nombre: string;
  monto: number;
  imponible: boolean;
  tributable: boolean;
}

export interface DescuentoAdicional {
  nombre: string;
  monto: number;
}

export interface VariablesMensuales {
  /** Horas extra al 50% trabajadas en el mes */
  horas_extra_50: number;
  /** Horas extra al 100% (domingos/festivos) */
  horas_extra_100: number;
  comisiones: number;
  /** Asignación de colación (no imponible) */
  colacion: number;
  /** Asignación de movilización (no imponible) */
  movilizacion: number;
  /** Viáticos (no imponible) */
  viatico: number;
  bonos_imponibles: number;
  bonos_no_imponibles: number;
  dias_trabajados: number;
  dias_licencia: number;
  /** APV monto mensual */
  apv_monto: number;
  apv_regimen: "A" | "B" | null;
  /** Haberes adicionales */
  haberes_adicionales: HaberAdicional[];
  /** Descuentos adicionales (anticipos, préstamos, cuota sindical, pensión alimenticia, etc.) */
  descuentos_adicionales: DescuentoAdicional[];
}

export interface Indicadores {
  /** Valor UF del último día del mes anterior */
  uf: number;
  /** Valor UTM del mes */
  utm: number;
  /** Ingreso Mínimo Mensual vigente */
  imm: number;
}

export interface ParametrosEmpresa {
  /** Tasa mutual ATEP total (base 0.93% + adicional). Ej: 0.0093 */
  tasa_mutual: number;
  /** Tasa SIS. Ej: 0.0153 */
  tasa_sis: number;
}

export interface InputLiquidacion {
  empleado: Empleado;
  contrato: Contrato;
  afp: AfpEmpleado;
  salud: SaludEmpleado;
  cargas: CargasFamiliares;
  variables: VariablesMensuales;
  indicadores: Indicadores;
  empresa: ParametrosEmpresa;
  /** Tramos de impuesto único vigentes */
  tramos_impuesto: TramoImpuesto[];
  /** Tramos de asignación familiar vigentes */
  tramos_asignacion_familiar: TramoAsignacionFamiliar[];
}

// --- Parámetros legales ---

export interface TramoImpuesto {
  desde_utm: number;
  hasta_utm: number;
  factor: number;
  rebaja_utm: number;
}

export interface TramoAsignacionFamiliar {
  tramo: "A" | "B" | "C" | "D";
  ingreso_desde: number;
  ingreso_hasta: number;
  monto_por_carga: number;
}

// --- Outputs ---

export interface DetalleHaber {
  nombre: string;
  monto: number;
  imponible: boolean;
  tributable: boolean;
}

export interface DetalleDescuento {
  nombre: string;
  monto: number;
  tipo: "legal" | "voluntario";
}

export interface CostoEmpleador {
  afc_empleador: number;
  sis: number;
  mutual: number;
  total: number;
}

export interface ResultadoLiquidacion {
  periodo: string;
  empleado_rut: string;
  empleado_nombre: string;
  dias_trabajados: number;

  // Haberes
  haberes: DetalleHaber[];
  total_haberes_imponibles: number;
  total_haberes_no_imponibles: number;
  total_haberes: number;

  // Bases de cálculo
  renta_imponible_afp: number;
  renta_imponible_salud: number;
  renta_imponible_afc: number;
  base_tributable: number;

  // Topes aplicados
  tope_imponible_afp_pesos: number;
  tope_imponible_afc_pesos: number;

  // Descuentos
  descuentos: DetalleDescuento[];

  // Descuentos previsionales (desglose)
  afp_nombre: string;
  afp_tasa: number;
  afp_monto: number;
  salud_tipo: "fonasa" | "isapre";
  salud_nombre: string;
  salud_monto_legal: number;
  salud_monto_adicional: number;
  salud_monto_total: number;
  afc_trabajador: number;
  impuesto_unico: number;
  tramo_impuesto: number;

  total_descuentos_legales: number;
  total_descuentos_voluntarios: number;
  total_descuentos: number;

  // Asignación familiar
  asignacion_familiar: number;
  tramo_asignacion_familiar: string;
  total_cargas: number;

  // Líquido
  liquido_a_pagar: number;

  // Costos empleador
  costo_empleador: CostoEmpleador;

  // Indicadores usados
  uf_utilizada: number;
  utm_utilizada: number;
  imm_utilizado: number;
}
