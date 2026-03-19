import { describe, it, expect } from "vitest";
import { calcularLiquidacion } from "../engine";
import type { InputLiquidacion } from "../types";
import {
  TRAMOS_IMPUESTO_DEFAULT,
  TRAMOS_ASIGNACION_FAMILIAR_DEFAULT,
} from "../constants";

// ============================================================
// Caso real: Operario con sueldo $600.000, AFP Habitat,
// FONASA, contrato indefinido, 2 cargas familiares
// ============================================================

const casoOperario: InputLiquidacion = {
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
  afp: {
    codigo: "08",
    nombre: "Habitat",
    tasa_trabajador: 0.1127,
  },
  salud: {
    tipo: "fonasa",
    nombre: "FONASA",
  },
  cargas: {
    simples: 2,
    maternales: 0,
    invalidez: 0,
  },
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
    descuentos_adicionales: [
      { nombre: "Anticipo", monto: 50000 },
    ],
  },
  indicadores: {
    uf: 38000, // Valor UF referencial
    utm: 66000, // Valor UTM referencial
    imm: 500000, // Ingreso Mínimo Mensual
  },
  empresa: {
    tasa_mutual: 0.0093,
    tasa_sis: 0.0153,
  },
  tramos_impuesto: TRAMOS_IMPUESTO_DEFAULT,
  tramos_asignacion_familiar: TRAMOS_ASIGNACION_FAMILIAR_DEFAULT,
};

describe("Motor de Liquidaciones - Caso Operario", () => {
  const resultado = calcularLiquidacion(casoOperario, "2026-03");

  it("calcula el período y datos del empleado", () => {
    expect(resultado.periodo).toBe("2026-03");
    expect(resultado.empleado_rut).toBe("12.345.678-9");
    expect(resultado.empleado_nombre).toBe("Fernando Astete González");
    expect(resultado.dias_trabajados).toBe(30);
  });

  it("calcula haberes correctamente", () => {
    // Sueldo base
    const sueldoBase = resultado.haberes.find((h) => h.nombre === "Sueldo Base");
    expect(sueldoBase?.monto).toBe(600000);

    // Gratificación Art. 50: min(600000 * 0.25, 500000 * 4.75/12)
    // = min(150000, 197917) = 150000
    const gratificacion = resultado.haberes.find((h) => h.nombre.includes("Gratificación"));
    expect(gratificacion?.monto).toBe(150000);

    // Horas extra 50%: valor_hora = 600000 * 7 / (30 * 45) = 3111.11
    // monto = 3111.11 * 1.5 * 10 = 46667
    const horasExtra = resultado.haberes.find((h) => h.nombre.includes("Horas Extra 50%"));
    expect(horasExtra?.monto).toBe(46667);

    // Bonos
    const bonos = resultado.haberes.find((h) => h.nombre === "Bonos Imponibles");
    expect(bonos?.monto).toBe(50000);

    // Colación y movilización (no imponibles)
    const colacion = resultado.haberes.find((h) => h.nombre === "Asignación de Colación");
    expect(colacion?.monto).toBe(40000);
    expect(colacion?.imponible).toBe(false);

    const movilizacion = resultado.haberes.find((h) => h.nombre === "Asignación de Movilización");
    expect(movilizacion?.monto).toBe(30000);
    expect(movilizacion?.imponible).toBe(false);
  });

  it("calcula totales de haberes", () => {
    // Imponibles: 600000 + 150000 + 46667 + 50000 = 846667
    expect(resultado.total_haberes_imponibles).toBe(846667);
    // No imponibles: 40000 + 30000 = 70000
    expect(resultado.total_haberes_no_imponibles).toBe(70000);
    // Total: 916667
    expect(resultado.total_haberes).toBe(916667);
  });

  it("aplica topes imponibles correctamente", () => {
    // Tope previsión: 81.6 * 38000 = 3,100,800
    expect(resultado.tope_imponible_afp_pesos).toBe(3100800);
    // 846667 < 3100800, no se aplica tope
    expect(resultado.renta_imponible_afp).toBe(846667);
  });

  it("calcula AFP correctamente", () => {
    // Habitat: 846667 * 0.1127 = 95423
    expect(resultado.afp_nombre).toBe("Habitat");
    expect(resultado.afp_monto).toBe(Math.round(846667 * 0.1127));
  });

  it("calcula salud FONASA correctamente", () => {
    // 7% de 846667 = 59267
    expect(resultado.salud_tipo).toBe("fonasa");
    expect(resultado.salud_monto_legal).toBe(Math.round(846667 * 0.07));
    expect(resultado.salud_monto_adicional).toBe(0);
  });

  it("calcula AFC trabajador correctamente", () => {
    // Indefinido: 0.6% de 846667 = 5080
    expect(resultado.afc_trabajador).toBe(Math.round(846667 * 0.006));
  });

  it("calcula impuesto único correctamente", () => {
    // Base tributable = 846667 - AFP - Salud7% - AFC
    const afpCalc = Math.round(846667 * 0.1127);
    const saludCalc = Math.round(846667 * 0.07);
    const afcCalc = Math.round(846667 * 0.006);
    const baseEsperada = 846667 - afpCalc - saludCalc - afcCalc;

    expect(resultado.base_tributable).toBe(baseEsperada);

    // base_utm = baseEsperada / 66000
    const baseUtm = baseEsperada / 66000;
    // Con sueldo ~847k, la base tributable estará alrededor de ~690k
    // 690000 / 66000 ≈ 10.45 UTM → Tramo 1 (exento, 0-13.5 UTM)
    expect(resultado.tramo_impuesto).toBe(1);
    expect(resultado.impuesto_unico).toBe(0);
  });

  it("calcula asignación familiar", () => {
    // Con ingreso imponible de 846667, cae en tramo B (441116-644201) o C
    // 846667 > 644201 → Tramo C: $3,255 por carga
    // 2 cargas × 3255 = 6510
    expect(resultado.total_cargas).toBe(2);
    expect(resultado.tramo_asignacion_familiar).toBe("C");
    expect(resultado.asignacion_familiar).toBe(3255 * 2);
  });

  it("calcula descuentos adicionales", () => {
    const anticipo = resultado.descuentos.find((d) => d.nombre === "Anticipo");
    expect(anticipo?.monto).toBe(50000);
    expect(anticipo?.tipo).toBe("voluntario");
  });

  it("calcula líquido a pagar", () => {
    const liquido = resultado.total_haberes - resultado.total_descuentos + resultado.asignacion_familiar;
    expect(resultado.liquido_a_pagar).toBe(liquido);
    // Debe ser positivo y razonable
    expect(resultado.liquido_a_pagar).toBeGreaterThan(0);
    expect(resultado.liquido_a_pagar).toBeLessThan(resultado.total_haberes);
  });

  it("calcula costos empleador", () => {
    // SIS: 846667 * 0.0153 = 12954
    expect(resultado.costo_empleador.sis).toBe(Math.round(846667 * 0.0153));
    // Mutual: 846667 * 0.0093 = 7874
    expect(resultado.costo_empleador.mutual).toBe(Math.round(846667 * 0.0093));
    // AFC empleador: 846667 * 0.024 = 20320
    expect(resultado.costo_empleador.afc_empleador).toBe(Math.round(846667 * 0.024));
    // Total
    expect(resultado.costo_empleador.total).toBe(
      resultado.costo_empleador.sis + resultado.costo_empleador.mutual + resultado.costo_empleador.afc_empleador
    );
  });

  it("incluye indicadores utilizados", () => {
    expect(resultado.uf_utilizada).toBe(38000);
    expect(resultado.utm_utilizada).toBe(66000);
    expect(resultado.imm_utilizado).toBe(500000);
  });
});

// ============================================================
// Caso: Gerente con ISAPRE y sueldo alto (tramo impuesto > 1)
// ============================================================

describe("Motor de Liquidaciones - Caso Gerente con ISAPRE", () => {
  const casoGerente: InputLiquidacion = {
    ...casoOperario,
    empleado: {
      ...casoOperario.empleado,
      rut: "11.111.111-1",
      nombre: "Rene",
      apellido_paterno: "Aravena",
      apellido_materno: "Riffo",
    },
    contrato: {
      tipo: "indefinido",
      fecha_inicio: new Date("2018-01-15"),
      sueldo_base: 3500000,
      tipo_gratificacion: "art_50",
      tipo_jornada: "completa",
      horas_semanales: 45,
    },
    afp: {
      codigo: "05",
      nombre: "Cuprum",
      tasa_trabajador: 0.1144,
    },
    salud: {
      tipo: "isapre",
      nombre: "Banmédica",
      plan_uf: 8.5, // 8.5 UF ≈ 323,000
    },
    cargas: { simples: 0, maternales: 0, invalidez: 0 },
    variables: {
      ...casoOperario.variables,
      horas_extra_50: 0,
      bonos_imponibles: 200000,
      colacion: 0,
      movilizacion: 0,
      descuentos_adicionales: [],
    },
  };

  const resultado = calcularLiquidacion(casoGerente, "2026-03");

  it("calcula gratificación con tope IMM", () => {
    // min(3500000 * 0.25, 500000 * 4.75/12) = min(875000, 197917) = 197917
    const gratificacion = resultado.haberes.find((h) => h.nombre.includes("Gratificación"));
    expect(gratificacion?.monto).toBe(Math.round(500000 * 4.75 / 12));
  });

  it("calcula cotización ISAPRE con adicional", () => {
    expect(resultado.salud_tipo).toBe("isapre");
    // Plan 8.5 UF = 8.5 * 38000 = 323000
    // Legal 7% de imponible
    const planPesos = Math.round(8.5 * 38000);
    const legal7 = resultado.salud_monto_legal;
    // Si legal7 > planPesos, adicional = 0; sino adicional = planPesos - legal7
    if (planPesos > legal7) {
      expect(resultado.salud_monto_adicional).toBe(planPesos - legal7);
    } else {
      expect(resultado.salud_monto_adicional).toBe(0);
    }
    expect(resultado.salud_monto_total).toBe(resultado.salud_monto_legal + resultado.salud_monto_adicional);
  });

  it("calcula impuesto en tramo superior", () => {
    // Con sueldo de 3.5M + gratificación + bonos, la base tributable será alta
    // Debe caer en un tramo > 1
    expect(resultado.tramo_impuesto).toBeGreaterThan(1);
    expect(resultado.impuesto_unico).toBeGreaterThan(0);
  });

  it("no tiene asignación familiar sin cargas", () => {
    expect(resultado.asignacion_familiar).toBe(0);
    expect(resultado.total_cargas).toBe(0);
  });

  it("calcula líquido coherente", () => {
    expect(resultado.liquido_a_pagar).toBeGreaterThan(0);
    expect(resultado.liquido_a_pagar).toBeLessThan(resultado.total_haberes);
  });
});

// ============================================================
// Caso: Trabajador plazo fijo (AFC sin cotización trabajador)
// ============================================================

describe("Motor de Liquidaciones - Plazo Fijo", () => {
  const casoPlazoFijo: InputLiquidacion = {
    ...casoOperario,
    contrato: {
      ...casoOperario.contrato,
      tipo: "plazo_fijo",
      sueldo_base: 500000,
    },
    cargas: { simples: 0, maternales: 0, invalidez: 0 },
    variables: {
      ...casoOperario.variables,
      horas_extra_50: 0,
      bonos_imponibles: 0,
      descuentos_adicionales: [],
    },
  };

  const resultado = calcularLiquidacion(casoPlazoFijo, "2026-03");

  it("AFC trabajador es 0 para plazo fijo", () => {
    expect(resultado.afc_trabajador).toBe(0);
  });

  it("AFC empleador es 3% para plazo fijo", () => {
    expect(resultado.costo_empleador.afc_empleador).toBe(
      Math.round(resultado.renta_imponible_afc * 0.03)
    );
  });
});

// ============================================================
// Caso: Pensionado (sin AFP ni AFC)
// ============================================================

describe("Motor de Liquidaciones - Pensionado", () => {
  const casoPensionado: InputLiquidacion = {
    ...casoOperario,
    empleado: {
      ...casoOperario.empleado,
      es_pensionado: true,
    },
    cargas: { simples: 0, maternales: 0, invalidez: 0 },
    variables: {
      ...casoOperario.variables,
      horas_extra_50: 0,
      bonos_imponibles: 0,
      descuentos_adicionales: [],
    },
  };

  const resultado = calcularLiquidacion(casoPensionado, "2026-03");

  it("no tiene cotización AFP", () => {
    expect(resultado.afp_monto).toBe(0);
  });

  it("no tiene AFC", () => {
    expect(resultado.afc_trabajador).toBe(0);
    expect(resultado.costo_empleador.afc_empleador).toBe(0);
  });

  it("no tiene SIS", () => {
    expect(resultado.costo_empleador.sis).toBe(0);
  });

  it("sí tiene cotización de salud", () => {
    expect(resultado.salud_monto_legal).toBeGreaterThan(0);
  });
});
