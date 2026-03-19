import { calcularLiquidacion } from "../engine";
import type { InputLiquidacion } from "../types";
import { TRAMOS_IMPUESTO_DEFAULT, TRAMOS_ASIGNACION_FAMILIAR_DEFAULT } from "../constants";

const input: InputLiquidacion = {
  empleado: {
    rut: "12.345.678-9",
    nombre: "Fernando",
    apellido_paterno: "Astete",
    apellido_materno: "González",
    fecha_nacimiento: new Date("1985-06-15"),
    sexo: "M",
    fecha_ingreso: new Date("2020-03-01"),
    es_pensionado: false,
    art22_excluido: false,
  },
  contrato: {
    tipo: "indefinido",
    fecha_inicio: new Date("2020-03-01"),
    sueldo_base: 600000,
    tipo_gratificacion: "art_50",
    tipo_jornada: "completa",
    horas_semanales: 45,
  },
  afp: { codigo: "08", nombre: "Habitat", tasa_trabajador: 0.1127 },
  salud: { tipo: "fonasa", nombre: "FONASA" },
  cargas: { simples: 2, maternales: 0, invalidez: 0 },
  variables: {
    horas_extra_50: 10,
    horas_extra_100: 0,
    comisiones: 0,
    colacion: 40000,
    movilizacion: 30000,
    viatico: 0,
    bonos_imponibles: 50000,
    bonos_no_imponibles: 0,
    dias_trabajados: 30,
    dias_licencia: 0,
    apv_monto: 0,
    apv_regimen: null,
    haberes_adicionales: [],
    descuentos_adicionales: [{ nombre: "Anticipo", monto: 50000 }],
  },
  indicadores: { uf: 38000, utm: 66000, imm: 500000 },
  empresa: { tasa_mutual: 0.0093, tasa_sis: 0.0153 },
  tramos_impuesto: TRAMOS_IMPUESTO_DEFAULT,
  tramos_asignacion_familiar: TRAMOS_ASIGNACION_FAMILIAR_DEFAULT,
};

const r = calcularLiquidacion(input, "2026-03");
const fmt = (n: number) => `$${n.toLocaleString("es-CL")}`;

console.log(`
╔══════════════════════════════════════════════════════════════╗
║          LIQUIDACIÓN DE SUELDO - ${r.periodo}                  ║
╠══════════════════════════════════════════════════════════════╣
║ ${r.empleado_nombre.padEnd(40)} RUT: ${r.empleado_rut}  ║
║ Días trabajados: ${r.dias_trabajados}                                        ║
╠══════════════════════════════════════════════════════════════╣
║ HABERES                                                      ║
╠──────────────────────────────────────────────────────────────╣`);
for (const h of r.haberes) {
  const tag = h.imponible ? "[IMP]" : "[N/I]";
  console.log(`║  ${tag} ${h.nombre.padEnd(35)} ${fmt(h.monto).padStart(15)} ║`);
}
console.log(`╠──────────────────────────────────────────────────────────────╣
║  Total Haberes Imponibles              ${fmt(r.total_haberes_imponibles).padStart(15)} ║
║  Total Haberes No Imponibles           ${fmt(r.total_haberes_no_imponibles).padStart(15)} ║
║  TOTAL HABERES                         ${fmt(r.total_haberes).padStart(15)} ║
╠══════════════════════════════════════════════════════════════╣
║ DESCUENTOS                                                   ║
╠──────────────────────────────────────────────────────────────╣`);
for (const d of r.descuentos) {
  const tag = d.tipo === "legal" ? "[LEG]" : "[VOL]";
  console.log(`║  ${tag} ${d.nombre.padEnd(35)} ${fmt(d.monto).padStart(15)} ║`);
}
console.log(`╠──────────────────────────────────────────────────────────────╣
║  Total Descuentos Legales              ${fmt(r.total_descuentos_legales).padStart(15)} ║
║  Total Descuentos Voluntarios          ${fmt(r.total_descuentos_voluntarios).padStart(15)} ║
║  TOTAL DESCUENTOS                      ${fmt(r.total_descuentos).padStart(15)} ║
╠══════════════════════════════════════════════════════════════╣
║  Asignación Familiar (${r.total_cargas} cargas, Tramo ${r.tramo_asignacion_familiar})   ${fmt(r.asignacion_familiar).padStart(15)} ║
╠══════════════════════════════════════════════════════════════╣
║  ► LÍQUIDO A PAGAR                     ${fmt(r.liquido_a_pagar).padStart(15)} ║
╠══════════════════════════════════════════════════════════════╣
║ COSTOS EMPLEADOR                                             ║
╠──────────────────────────────────────────────────────────────╣
║  SIS (${(input.empresa.tasa_sis * 100).toFixed(2)}%)                              ${fmt(r.costo_empleador.sis).padStart(15)} ║
║  Mutual ATEP (${(input.empresa.tasa_mutual * 100).toFixed(2)}%)                       ${fmt(r.costo_empleador.mutual).padStart(15)} ║
║  AFC Empleador                         ${fmt(r.costo_empleador.afc_empleador).padStart(15)} ║
║  TOTAL COSTO EMPRESA                   ${fmt(r.costo_empleador.total).padStart(15)} ║
╠══════════════════════════════════════════════════════════════╣
║ INDICADORES: UF=${fmt(r.uf_utilizada)} UTM=${fmt(r.utm_utilizada)} IMM=${fmt(r.imm_utilizado)}     ║
╚══════════════════════════════════════════════════════════════╝
`);
