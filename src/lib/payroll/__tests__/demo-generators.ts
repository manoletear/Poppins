import { calcularLiquidacion } from "../engine";
import type { InputLiquidacion } from "../types";
import { TRAMOS_IMPUESTO_DEFAULT, TRAMOS_ASIGNACION_FAMILIAR_DEFAULT, AFPS } from "../constants";
import { EMPLEADOS_DEMO } from "../demo-data";
import { construirRegistroPrevired, generarArchivoPrevired } from "../generators/previred";
import { construirRegistroLRE, generarArchivoLRE } from "../generators/lre";

const CODIGOS_SALUD: Record<string, string> = {
  FONASA: "07", Banmédica: "10", Colmena: "16", "Cruz Blanca": "20",
  "Nueva Masvida": "27", "Vida Tres": "25", Consalud: "14", Esencial: "38",
};

function buildInput(emp: typeof EMPLEADOS_DEMO[0]): InputLiquidacion {
  const afpData = AFPS.find((a) => a.nombre === emp.afp) ?? AFPS[0];
  return {
    empleado: {
      rut: emp.rut, nombre: emp.primer_nombre,
      apellido_paterno: emp.apellido_paterno, apellido_materno: emp.apellido_materno,
      fecha_nacimiento: new Date(emp.fecha_nacimiento), sexo: emp.sexo,
      fecha_ingreso: new Date(emp.fecha_inicio_contrato),
      es_pensionado: emp.es_pensionado, art22_excluido: emp.art22_excluido,
    },
    contrato: {
      tipo: emp.tipo_contrato === "Indefinido" ? "indefinido" : emp.tipo_contrato === "Plazo Fijo" ? "plazo_fijo" : "obra_faena",
      fecha_inicio: new Date(emp.fecha_inicio_contrato), sueldo_base: emp.sueldo_base,
      tipo_gratificacion: emp.tipo_gratificacion === "Art. 50" ? "art_50" : "art_47",
      tipo_jornada: emp.tipo_jornada === "Completa" ? "completa" : emp.tipo_jornada === "Parcial" ? "parcial" : "art_22",
      horas_semanales: emp.horas_semanales,
    },
    afp: { codigo: afpData.codigo, nombre: afpData.nombre, tasa_trabajador: afpData.tasa_trabajador },
    salud: { tipo: emp.salud_tipo, nombre: emp.salud_nombre, plan_uf: emp.plan_salud_uf ?? undefined },
    cargas: { simples: emp.cargas_simples, maternales: emp.cargas_maternales, invalidez: emp.cargas_invalidez },
    variables: {
      horas_extra_50: 0, horas_extra_100: 0, comisiones: 0,
      colacion: 40000, movilizacion: 30000, viatico: 0,
      bonos_imponibles: 0, bonos_no_imponibles: 0,
      dias_trabajados: 30, dias_licencia: 0, apv_monto: 0, apv_regimen: null,
      haberes_adicionales: [], descuentos_adicionales: [],
    },
    indicadores: { uf: 38000, utm: 66000, imm: 500000 },
    empresa: { tasa_mutual: 0.0093, tasa_sis: 0.0153 },
    tramos_impuesto: TRAMOS_IMPUESTO_DEFAULT,
    tramos_asignacion_familiar: TRAMOS_ASIGNACION_FAMILIAR_DEFAULT,
  };
}

// ── GENERAR PREVIRED ──────────────────────────────────────────
console.log("═══════════════════════════════════════════════════");
console.log("  ARCHIVO PREVIRED - Marzo 2026");
console.log("═══════════════════════════════════════════════════\n");

const registrosPrevired = EMPLEADOS_DEMO.map((emp) => {
  const input = buildInput(emp);
  const liq = calcularLiquidacion(input, "2026-03");
  return construirRegistroPrevired(liq, {
    rut_empleador: "76.123.456-7",
    rut_trabajador: emp.rut,
    apellido_paterno: emp.apellido_paterno,
    apellido_materno: emp.apellido_materno,
    nombres: `${emp.primer_nombre} ${emp.segundo_nombre}`,
    sexo: emp.sexo,
    fecha_nacimiento: emp.fecha_nacimiento,
    codigo_afp: emp.afp_codigo,
    codigo_salud: CODIGOS_SALUD[emp.salud_nombre] ?? "07",
    codigo_mutual: "02",
    codigo_ccaf: "",
    tipo_contrato: emp.tipo_contrato === "Indefinido" ? "I" as const : "P" as const,
    es_pensionado: emp.es_pensionado,
    tasa_sis: 0.0153,
    cotizacion_mutual: liq.costo_empleador.mutual,
    cotizacion_sis: liq.costo_empleador.sis,
    afc_empleador: liq.costo_empleador.afc_empleador,
  });
});

const archivoPrevired = generarArchivoPrevired(registrosPrevired);
console.log(archivoPrevired);
console.log(`\n→ ${registrosPrevired.length} registros, 65 campos cada uno`);
console.log(`→ Campos por registro: ${archivoPrevired.split("\n")[0].split(";").length}`);

// ── GENERAR LRE ───────────────────────────────────────────────
console.log("\n\n═══════════════════════════════════════════════════");
console.log("  LIBRO DE REMUNERACIONES ELECTRÓNICO - Marzo 2026");
console.log("═══════════════════════════════════════════════════\n");

const registrosLRE = EMPLEADOS_DEMO.map((emp) => {
  const input = buildInput(emp);
  const liq = calcularLiquidacion(input, "2026-03");
  return construirRegistroLRE(liq, {
    rut_empleador: "76.123.456-7",
    razon_social: "Rene Alejandro Aravena Riffo",
    rut_trabajador: emp.rut,
    fecha_ingreso: emp.fecha_inicio_contrato,
    tipo_contrato: emp.tipo_contrato,
    cargo: emp.cargo,
    centro_costo: emp.centro_costo,
  });
});

const archivoLRE = generarArchivoLRE(registrosLRE, {
  rut_empleador: "76.123.456-7",
  razon_social: "Rene Alejandro Aravena Riffo",
  periodo: "202603",
});

console.log(archivoLRE);

const lineasLRE = archivoLRE.split("\n");
console.log(`\n→ ${lineasLRE.length} líneas totales`);
console.log(`→ ${lineasLRE.filter(l => l.startsWith("C;")).length} cabeceras de trabajador`);
console.log(`→ ${lineasLRE.filter(l => l.startsWith("D;")).length} líneas de detalle`);
