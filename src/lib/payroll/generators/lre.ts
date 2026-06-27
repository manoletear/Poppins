// ============================================================
// Generador de Libro de Remuneraciones Electrónico (LRE)
// Formato: CSV delimitado por punto y coma (;)
// Para envío a la Dirección del Trabajo (DT)
// Ref: Art. 62 bis Código del Trabajo
// ============================================================

import type { ResultadoLiquidacion, DetalleHaber, DetalleDescuento } from "../types";

// Códigos DT para haberes
const CODIGOS_HABERES: Record<string, string> = {
  "Sueldo Base": "1101",
  "Gratificación Legal": "1105",
  "Horas Extra 50%": "1102",
  "Horas Extra 100%": "1102",
  "Comisiones": "1103",
  "Bonos Imponibles": "1106",
  "Asignación de Colación": "1202",
  "Asignación de Movilización": "1201",
  "Viáticos": "1203",
  "Bonos No Imponibles": "1207",
  "Semana Corrida": "1301",
};

// Códigos DT para descuentos
const CODIGOS_DESCUENTOS: Record<string, string> = {
  "AFP": "2101",
  "Salud": "2102",
  "Salud Adicional": "2103",
  "Seguro de Cesantía": "2104",
  "Impuesto Único": "2105",
  "Anticipo": "2201",
  "Préstamo": "2202",
  "Cuota Sindical": "2203",
  "Pensión Alimenticia": "2204",
  "APV": "2301",
};

export interface RegistroLRE {
  // Cabecera
  rut_empleador: string;
  razon_social: string;
  periodo: string; // AAAAMM

  // Trabajador
  rut_trabajador: string;
  nombre_completo: string;
  fecha_ingreso: string; // YYYY-MM-DD
  tipo_contrato: string;
  cargo: string;
  centro_costo: string;
  dias_trabajados: number;

  // Líneas de detalle
  lineas: LineaLRE[];

  // Totales
  total_haberes_imponibles: number;
  total_haberes_no_imponibles: number;
  total_haberes: number;
  total_descuentos: number;
  liquido: number;
}

export interface LineaLRE {
  codigo_dt: string;
  concepto: string;
  tipo: "haber" | "descuento";
  clasificacion: "imponible" | "no_imponible" | "legal" | "voluntario";
  monto: number;
}

/**
 * Resuelve el código DT para un haber.
 */
function resolverCodigoHaber(nombre: string): string {
  for (const [key, code] of Object.entries(CODIGOS_HABERES)) {
    if (nombre.includes(key)) return code;
  }
  // Genérico: haber imponible sin código específico
  return "1199";
}

/**
 * Resuelve el código DT para un descuento.
 */
function resolverCodigoDescuento(nombre: string): string {
  for (const [key, code] of Object.entries(CODIGOS_DESCUENTOS)) {
    if (nombre.includes(key)) return code;
  }
  return "2299";
}

/**
 * Construye un registro LRE desde una liquidación.
 */
export function construirRegistroLRE(
  liquidacion: ResultadoLiquidacion,
  params: {
    rut_empleador: string;
    razon_social: string;
    rut_trabajador: string;
    fecha_ingreso: string;
    tipo_contrato: string;
    cargo: string;
    centro_costo: string;
  }
): RegistroLRE {
  const lineas: LineaLRE[] = [];

  // Haberes
  for (const haber of liquidacion.haberes) {
    lineas.push({
      codigo_dt: resolverCodigoHaber(haber.nombre),
      concepto: haber.nombre,
      tipo: "haber",
      clasificacion: haber.imponible ? "imponible" : "no_imponible",
      monto: haber.monto,
    });
  }

  // Descuentos
  for (const descuento of liquidacion.descuentos) {
    lineas.push({
      codigo_dt: resolverCodigoDescuento(descuento.nombre),
      concepto: descuento.nombre,
      tipo: "descuento",
      clasificacion: descuento.tipo,
      monto: descuento.monto,
    });
  }

  const periodo = liquidacion.periodo.replace("-", "");

  return {
    rut_empleador: params.rut_empleador,
    razon_social: params.razon_social,
    periodo,
    rut_trabajador: params.rut_trabajador,
    nombre_completo: liquidacion.empleado_nombre,
    fecha_ingreso: params.fecha_ingreso,
    tipo_contrato: params.tipo_contrato,
    cargo: params.cargo,
    centro_costo: params.centro_costo,
    dias_trabajados: liquidacion.dias_trabajados,
    lineas,
    total_haberes_imponibles: liquidacion.total_haberes_imponibles,
    total_haberes_no_imponibles: liquidacion.total_haberes_no_imponibles,
    total_haberes: liquidacion.total_haberes,
    total_descuentos: liquidacion.total_descuentos,
    liquido: liquidacion.liquido_a_pagar,
  };
}

/**
 * Serializa un registro LRE a formato CSV para la DT.
 *
 * Formato: una fila de cabecera por trabajador + una fila por concepto.
 *
 * Cabecera: RUT_EMPLEADOR;PERIODO;RUT_TRABAJADOR;NOMBRE;TIPO_CONTRATO;
 *           CARGO;CENTRO_COSTO;DIAS_TRABAJADOS;TOTAL_HAB_IMP;TOTAL_HAB_NO_IMP;
 *           TOTAL_HABERES;TOTAL_DESCUENTOS;LIQUIDO
 *
 * Detalle:  RUT_TRABAJADOR;CODIGO_DT;CONCEPTO;TIPO;CLASIFICACION;MONTO
 */
export function serializarRegistroLRE(registro: RegistroLRE): string {
  const lineas: string[] = [];

  // Línea cabecera del trabajador
  lineas.push([
    "C", // C = Cabecera
    registro.rut_empleador,
    registro.periodo,
    registro.rut_trabajador,
    registro.nombre_completo,
    registro.fecha_ingreso,
    registro.tipo_contrato,
    registro.cargo,
    registro.centro_costo,
    registro.dias_trabajados,
    registro.total_haberes_imponibles,
    registro.total_haberes_no_imponibles,
    registro.total_haberes,
    registro.total_descuentos,
    registro.liquido,
  ].join(";"));

  // Líneas de detalle
  for (const linea of registro.lineas) {
    lineas.push([
      "D", // D = Detalle
      registro.rut_trabajador,
      linea.codigo_dt,
      linea.concepto,
      linea.tipo === "haber" ? "H" : "D",
      linea.clasificacion === "imponible" ? "IMP" :
        linea.clasificacion === "no_imponible" ? "NIR" :
        linea.clasificacion === "legal" ? "LEG" : "VOL",
      linea.monto,
    ].join(";"));
  }

  return lineas.join("\n");
}

/**
 * Genera el archivo LRE completo para un período.
 */
export function generarArchivoLRE(
  registros: RegistroLRE[],
  params: {
    rut_empleador: string;
    razon_social: string;
    periodo: string; // AAAAMM
  }
): string {
  const lineas: string[] = [];

  // Cabecera del archivo
  lineas.push([
    "H", // H = Header
    params.rut_empleador,
    params.razon_social,
    params.periodo,
    registros.length, // total trabajadores
    new Date().toISOString().split("T")[0], // fecha generación
  ].join(";"));

  // Registros por trabajador
  for (const registro of registros) {
    lineas.push(serializarRegistroLRE(registro));
  }

  // Pie del archivo
  const totalHaberes = registros.reduce((s, r) => s + r.total_haberes, 0);
  const totalDescuentos = registros.reduce((s, r) => s + r.total_descuentos, 0);
  const totalLiquido = registros.reduce((s, r) => s + r.liquido, 0);

  lineas.push([
    "T", // T = Totales
    registros.length,
    totalHaberes,
    totalDescuentos,
    totalLiquido,
  ].join(";"));

  return lineas.join("\n");
}
