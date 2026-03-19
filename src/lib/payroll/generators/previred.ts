// ============================================================
// Generador de Archivo PREVIRED (Planilla de Cotizaciones)
// Formato: CSV delimitado por punto y coma (;)
// Codificación: ISO-8859-1
// 65 campos por trabajador
// ============================================================

import type { ResultadoLiquidacion } from "../types";

export interface DatosPrevired {
  // Empleador
  rut_empleador: string;

  // Trabajador
  rut_trabajador: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombres: string;
  sexo: "M" | "F";
  fecha_nacimiento: string; // DDMMAAAA
  nacionalidad: string; // "056" Chile

  // Período
  periodo_pago: string; // AAAAMM
  periodo_remuneracion: string; // AAAAMM
  tipo_pago: "1" | "2" | "3"; // 1=Normal, 2=Retroactivo, 3=Solo voluntarios

  // AFP
  codigo_afp: string;
  renta_imponible_afp: number;
  cotizacion_afp: number;
  cotizacion_sis: number;
  ahorro_voluntario_afp: number; // APV Régimen A

  // IPS (ex-INP) - generalmente 0 para nuevos
  renta_imponible_ips: number;
  cotizacion_ips: number;
  renta_imponible_desahucio: number;

  // Salud
  codigo_salud: string;
  renta_imponible_salud: number;
  cotizacion_salud: number; // 7% o pactada
  cotizacion_adicional_salud: number;

  // Mutual
  codigo_mutual: string;
  renta_imponible_mutual: number;
  cotizacion_atep: number;

  // CCAF
  codigo_ccaf: string;
  renta_imponible_ccaf: number;
  creditos_personales_ccaf: number;
  descuento_dental_ccaf: number;
  descuento_leasing_ccaf: number;
  descuento_seguro_vida_ccaf: number;
  otros_descuentos_ccaf: number;
  cotizacion_ccaf: number;

  // Mutual sucursal
  codigo_sucursal_mutual: string;

  // Movimiento
  codigo_movimiento: string; // "00"=sin movimiento
  fecha_movimiento: string; // DDMMAAAA o vacío

  // Asignación familiar
  tramo_asignacion_familiar: string; // A, B, C, D o vacío
  cargas_simples: number;
  cargas_maternales: number;
  cargas_invalidez: number;
  monto_asignacion_familiar: number;
  asignacion_familiar_retroactiva: number;
  reintegro_cargas: number;

  // Trabajador joven
  solicitud_trabajador_joven: string; // "S" | "N" | ""

  // AFC
  codigo_afc: string; // "01"
  renta_imponible_afc: number;
  aporte_trabajador_afc: number;
  aporte_empleador_afc: number;

  // Contrato
  tipo_contrato: "I" | "P"; // I=Indefinido, P=Plazo fijo
  dias_trabajados: number;
  tipo_trabajador: "0" | "1" | "2"; // 0=Activo, 1=Pensionado, 2=Exento

  // APVI
  codigo_apvi: string;
  monto_apvi: number;

  // APVC
  codigo_apvc: string;
  monto_apvc_trabajador: number;
  monto_apvc_empleador: number;

  // Subsidio
  rut_pagadora_subsidio: string;
  renta_imponible_subsidio: number;

  // Salud adicional
  tasa_pactada_salud: string; // "7.00" o mayor

  // APV Régimen B
  monto_apv_regimen_b: number;
  forma_apv: string; // "D"=Directa, "I"=Indirecta, ""

  // Desahucio
  cotizacion_desahucio: number;

  // Independiente
  cotizacion_salud_independiente: number;

  // SIS tasa
  tasa_sis: string;
}

/**
 * Construye un registro PREVIRED desde una liquidación y datos complementarios.
 */
export function construirRegistroPrevired(
  liquidacion: ResultadoLiquidacion,
  params: {
    rut_empleador: string;
    rut_trabajador: string;
    apellido_paterno: string;
    apellido_materno: string;
    nombres: string;
    sexo: "M" | "F";
    fecha_nacimiento: string; // YYYY-MM-DD
    codigo_afp: string;
    codigo_salud: string;
    codigo_mutual: string;
    codigo_ccaf: string;
    tipo_contrato: "I" | "P";
    es_pensionado: boolean;
    tasa_sis: number;
    cotizacion_mutual: number;
    cotizacion_sis: number;
    afc_empleador: number;
    // Opcionales
    codigo_movimiento?: string;
    fecha_movimiento?: string;
    creditos_ccaf?: number;
    apv_regimen?: "A" | "B" | null;
    apv_monto?: number;
    plan_salud_pactado?: string;
  }
): DatosPrevired {
  const fechaNac = params.fecha_nacimiento.split("-");
  const fechaNacDDMM = fechaNac.length === 3
    ? `${fechaNac[2]}${fechaNac[1]}${fechaNac[0]}`
    : "";

  const periodo = liquidacion.periodo.replace("-", "");

  return {
    rut_empleador: params.rut_empleador,
    rut_trabajador: params.rut_trabajador,
    apellido_paterno: params.apellido_paterno,
    apellido_materno: params.apellido_materno,
    nombres: params.nombres,
    sexo: params.sexo,
    fecha_nacimiento: fechaNacDDMM,
    nacionalidad: "056",

    periodo_pago: periodo,
    periodo_remuneracion: periodo,
    tipo_pago: "1",

    codigo_afp: params.codigo_afp,
    renta_imponible_afp: liquidacion.renta_imponible_afp,
    cotizacion_afp: liquidacion.afp_monto,
    cotizacion_sis: params.cotizacion_sis,
    ahorro_voluntario_afp: params.apv_regimen === "A" ? (params.apv_monto ?? 0) : 0,

    renta_imponible_ips: 0,
    cotizacion_ips: 0,
    renta_imponible_desahucio: 0,

    codigo_salud: params.codigo_salud,
    renta_imponible_salud: liquidacion.renta_imponible_salud,
    cotizacion_salud: liquidacion.salud_monto_legal,
    cotizacion_adicional_salud: liquidacion.salud_monto_adicional,

    codigo_mutual: params.codigo_mutual,
    renta_imponible_mutual: liquidacion.renta_imponible_afp,
    cotizacion_atep: params.cotizacion_mutual,

    codigo_ccaf: params.codigo_ccaf,
    renta_imponible_ccaf: params.codigo_ccaf ? liquidacion.renta_imponible_afp : 0,
    creditos_personales_ccaf: params.creditos_ccaf ?? 0,
    descuento_dental_ccaf: 0,
    descuento_leasing_ccaf: 0,
    descuento_seguro_vida_ccaf: 0,
    otros_descuentos_ccaf: 0,
    cotizacion_ccaf: 0,

    codigo_sucursal_mutual: "",

    codigo_movimiento: params.codigo_movimiento ?? "00",
    fecha_movimiento: params.fecha_movimiento ?? "",

    tramo_asignacion_familiar: liquidacion.tramo_asignacion_familiar === "Sin cargas"
      ? ""
      : liquidacion.tramo_asignacion_familiar,
    cargas_simples: liquidacion.total_cargas,
    cargas_maternales: 0,
    cargas_invalidez: 0,
    monto_asignacion_familiar: liquidacion.asignacion_familiar,
    asignacion_familiar_retroactiva: 0,
    reintegro_cargas: 0,

    solicitud_trabajador_joven: "",

    codigo_afc: "01",
    renta_imponible_afc: liquidacion.renta_imponible_afc,
    aporte_trabajador_afc: liquidacion.afc_trabajador,
    aporte_empleador_afc: params.afc_empleador,

    tipo_contrato: params.tipo_contrato,
    dias_trabajados: liquidacion.dias_trabajados,
    tipo_trabajador: params.es_pensionado ? "1" : "0",

    codigo_apvi: "",
    monto_apvi: 0,

    codigo_apvc: "",
    monto_apvc_trabajador: 0,
    monto_apvc_empleador: 0,

    rut_pagadora_subsidio: "",
    renta_imponible_subsidio: 0,

    tasa_pactada_salud: params.plan_salud_pactado ?? "7.00",

    monto_apv_regimen_b: params.apv_regimen === "B" ? (params.apv_monto ?? 0) : 0,
    forma_apv: params.apv_monto && params.apv_monto > 0 ? "D" : "",

    cotizacion_desahucio: 0,
    cotizacion_salud_independiente: 0,
    tasa_sis: (params.tasa_sis * 100).toFixed(2),
  };
}

/**
 * Serializa un registro PREVIRED a una línea CSV (65 campos separados por ;)
 */
export function serializarRegistroPrevired(r: DatosPrevired): string {
  const campos: (string | number)[] = [
    r.rut_empleador,                    // 1
    r.rut_trabajador,                   // 2
    r.periodo_pago,                     // 3
    r.nombres,                          // 4
    r.apellido_paterno,                 // 5
    r.apellido_materno,                 // 6
    r.sexo,                             // 7
    r.fecha_nacimiento,                 // 8
    r.nacionalidad,                     // 9
    r.tipo_pago,                        // 10
    r.periodo_remuneracion,             // 11
    r.codigo_afp,                       // 12
    r.renta_imponible_afp,              // 13
    r.cotizacion_afp,                   // 14
    r.cotizacion_sis,                   // 15
    r.ahorro_voluntario_afp,            // 16
    r.renta_imponible_ips,              // 17
    r.cotizacion_ips,                   // 18
    r.renta_imponible_desahucio,        // 19
    r.codigo_salud,                     // 20
    r.renta_imponible_salud,            // 21
    r.cotizacion_salud,                 // 22
    r.cotizacion_adicional_salud,       // 23
    r.codigo_mutual,                    // 24
    r.renta_imponible_mutual,           // 25
    r.cotizacion_atep,                  // 26
    r.codigo_ccaf,                      // 27
    r.renta_imponible_ccaf,             // 28
    r.creditos_personales_ccaf,         // 29
    r.descuento_dental_ccaf,            // 30
    r.descuento_leasing_ccaf,           // 31
    r.descuento_seguro_vida_ccaf,       // 32
    r.otros_descuentos_ccaf,            // 33
    r.cotizacion_ccaf,                  // 34
    r.codigo_sucursal_mutual,           // 35
    r.codigo_movimiento,                // 36
    r.fecha_movimiento,                 // 37
    r.tramo_asignacion_familiar,        // 38
    r.cargas_simples,                   // 39
    r.cargas_maternales,                // 40
    r.cargas_invalidez,                 // 41
    r.monto_asignacion_familiar,        // 42
    r.asignacion_familiar_retroactiva,  // 43
    r.reintegro_cargas,                 // 44
    r.solicitud_trabajador_joven,       // 45
    r.codigo_afc,                       // 46
    r.renta_imponible_afc,              // 47
    r.aporte_trabajador_afc,            // 48
    r.aporte_empleador_afc,             // 49
    r.tipo_contrato,                    // 50
    r.dias_trabajados,                  // 51
    r.tipo_trabajador,                  // 52
    r.codigo_apvi,                      // 53
    r.monto_apvi,                       // 54
    r.codigo_apvc,                      // 55
    r.monto_apvc_trabajador,            // 56
    r.monto_apvc_empleador,             // 57
    r.rut_pagadora_subsidio,            // 58
    r.renta_imponible_subsidio,         // 59
    r.tasa_pactada_salud,               // 60
    r.monto_apv_regimen_b,             // 61
    r.forma_apv,                        // 62
    r.cotizacion_desahucio,             // 63
    r.cotizacion_salud_independiente,   // 64
    r.tasa_sis,                         // 65
  ];

  return campos.join(";");
}

/**
 * Genera el archivo PREVIRED completo para un período.
 * Retorna el contenido del CSV listo para guardar/descargar.
 */
export function generarArchivoPrevired(registros: DatosPrevired[]): string {
  const lineas = registros.map(serializarRegistroPrevired);
  return lineas.join("\n");
}
