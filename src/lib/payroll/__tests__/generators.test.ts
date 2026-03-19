import { describe, it, expect } from "vitest";
import { calcularLiquidacion } from "../engine";
import type { InputLiquidacion } from "../types";
import { TRAMOS_IMPUESTO_DEFAULT, TRAMOS_ASIGNACION_FAMILIAR_DEFAULT, AFPS } from "../constants";
import { EMPLEADOS_DEMO } from "../demo-data";
import { construirRegistroPrevired, serializarRegistroPrevired, generarArchivoPrevired } from "../generators/previred";
import { construirRegistroLRE, serializarRegistroLRE, generarArchivoLRE } from "../generators/lre";

// Mapeo de códigos salud
const CODIGOS_SALUD: Record<string, string> = {
  FONASA: "07",
  Banmédica: "10",
  Colmena: "16",
  "Cruz Blanca": "20",
  "Nueva Masvida": "27",
  "Vida Tres": "25",
  Consalud: "14",
  Esencial: "38",
};

function buildInput(emp: typeof EMPLEADOS_DEMO[0]): InputLiquidacion {
  const afpData = AFPS.find((a) => a.nombre === emp.afp) ?? AFPS[0];
  return {
    empleado: {
      rut: emp.rut,
      nombre: emp.primer_nombre,
      apellido_paterno: emp.apellido_paterno,
      apellido_materno: emp.apellido_materno,
      fecha_nacimiento: new Date(emp.fecha_nacimiento),
      sexo: emp.sexo,
      fecha_ingreso: new Date(emp.fecha_inicio_contrato),
      es_pensionado: emp.es_pensionado,
      art22_excluido: emp.art22_excluido,
    },
    contrato: {
      tipo: emp.tipo_contrato === "Indefinido" ? "indefinido" :
            emp.tipo_contrato === "Plazo Fijo" ? "plazo_fijo" : "obra_faena",
      fecha_inicio: new Date(emp.fecha_inicio_contrato),
      sueldo_base: emp.sueldo_base,
      tipo_gratificacion: emp.tipo_gratificacion === "Art. 50" ? "art_50" : "art_47",
      tipo_jornada: emp.tipo_jornada === "Completa" ? "completa" :
                    emp.tipo_jornada === "Parcial" ? "parcial" : "art_22",
      horas_semanales: emp.horas_semanales,
    },
    afp: { codigo: afpData.codigo, nombre: afpData.nombre, tasa_trabajador: afpData.tasa_trabajador },
    salud: {
      tipo: emp.salud_tipo,
      nombre: emp.salud_nombre,
      plan_uf: emp.plan_salud_uf ?? undefined,
    },
    cargas: { simples: emp.cargas_simples, maternales: emp.cargas_maternales, invalidez: emp.cargas_invalidez },
    variables: {
      horas_extra_50: 0, horas_extra_100: 0, comisiones: 0,
      colacion: 40000, movilizacion: 30000, viatico: 0,
      bonos_imponibles: 0, bonos_no_imponibles: 0,
      dias_trabajados: 30, dias_licencia: 0,
      apv_monto: 0, apv_regimen: null,
      haberes_adicionales: [], descuentos_adicionales: [],
    },
    indicadores: { uf: 38000, utm: 66000, imm: 500000 },
    empresa: { tasa_mutual: 0.0093, tasa_sis: 0.0153 },
    tramos_impuesto: TRAMOS_IMPUESTO_DEFAULT,
    tramos_asignacion_familiar: TRAMOS_ASIGNACION_FAMILIAR_DEFAULT,
  };
}

describe("Generador PREVIRED", () => {
  it("genera un registro con 65 campos", () => {
    const emp = EMPLEADOS_DEMO[1]; // Fernando Astete
    const input = buildInput(emp);
    const liquidacion = calcularLiquidacion(input, "2026-03");

    const registro = construirRegistroPrevired(liquidacion, {
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
      tipo_contrato: "I",
      es_pensionado: false,
      tasa_sis: 0.0153,
      cotizacion_mutual: liquidacion.costo_empleador.mutual,
      cotizacion_sis: liquidacion.costo_empleador.sis,
      afc_empleador: liquidacion.costo_empleador.afc_empleador,
    });

    const linea = serializarRegistroPrevired(registro);
    const campos = linea.split(";");

    expect(campos.length).toBe(65);
    expect(campos[0]).toBe("76.123.456-7"); // RUT empleador
    expect(campos[1]).toBe(emp.rut); // RUT trabajador
    expect(campos[2]).toBe("202603"); // Período
    expect(campos[6]).toBe("M"); // Sexo
    expect(Number(campos[12])).toBe(liquidacion.renta_imponible_afp); // Renta imponible AFP
    expect(Number(campos[13])).toBe(liquidacion.afp_monto); // Cotización AFP
    expect(campos[49]).toBe("I"); // Tipo contrato indefinido
  });

  it("genera archivo completo con todos los empleados", () => {
    const registros = EMPLEADOS_DEMO.map((emp) => {
      const input = buildInput(emp);
      const liquidacion = calcularLiquidacion(input, "2026-03");
      return construirRegistroPrevired(liquidacion, {
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
        cotizacion_mutual: liquidacion.costo_empleador.mutual,
        cotizacion_sis: liquidacion.costo_empleador.sis,
        afc_empleador: liquidacion.costo_empleador.afc_empleador,
      });
    });

    const archivo = generarArchivoPrevired(registros);
    const lineas = archivo.split("\n");

    expect(lineas.length).toBe(5); // 5 empleados
    // Cada línea tiene 65 campos
    for (const linea of lineas) {
      expect(linea.split(";").length).toBe(65);
    }
  });
});

describe("Generador LRE", () => {
  it("genera registro con cabecera y líneas de detalle", () => {
    const emp = EMPLEADOS_DEMO[1];
    const input = buildInput(emp);
    const liquidacion = calcularLiquidacion(input, "2026-03");

    const registro = construirRegistroLRE(liquidacion, {
      rut_empleador: "76.123.456-7",
      razon_social: "Rene Alejandro Aravena Riffo",
      rut_trabajador: emp.rut,
      fecha_ingreso: emp.fecha_inicio_contrato,
      tipo_contrato: emp.tipo_contrato,
      cargo: emp.cargo,
      centro_costo: emp.centro_costo,
    });

    expect(registro.rut_trabajador).toBe(emp.rut);
    expect(registro.periodo).toBe("202603");
    expect(registro.lineas.length).toBeGreaterThan(0);
    expect(registro.total_haberes).toBe(liquidacion.total_haberes);
    expect(registro.liquido).toBe(liquidacion.liquido_a_pagar);

    // Verificar que hay haberes y descuentos
    const haberes = registro.lineas.filter((l) => l.tipo === "haber");
    const descuentos = registro.lineas.filter((l) => l.tipo === "descuento");
    expect(haberes.length).toBeGreaterThan(0);
    expect(descuentos.length).toBeGreaterThan(0);

    // Verificar códigos DT
    const sueldoBase = haberes.find((h) => h.concepto === "Sueldo Base");
    expect(sueldoBase?.codigo_dt).toBe("1101");
  });

  it("genera archivo LRE completo con header y totales", () => {
    const registros = EMPLEADOS_DEMO.map((emp) => {
      const input = buildInput(emp);
      const liquidacion = calcularLiquidacion(input, "2026-03");
      return construirRegistroLRE(liquidacion, {
        rut_empleador: "76.123.456-7",
        razon_social: "Rene Alejandro Aravena Riffo",
        rut_trabajador: emp.rut,
        fecha_ingreso: emp.fecha_inicio_contrato,
        tipo_contrato: emp.tipo_contrato,
        cargo: emp.cargo,
        centro_costo: emp.centro_costo,
      });
    });

    const archivo = generarArchivoLRE(registros, {
      rut_empleador: "76.123.456-7",
      razon_social: "Rene Alejandro Aravena Riffo",
      periodo: "202603",
    });

    const lineas = archivo.split("\n");

    // Primera línea: Header
    expect(lineas[0].startsWith("H;")).toBe(true);
    expect(lineas[0]).toContain("76.123.456-7");
    expect(lineas[0]).toContain("202603");

    // Última línea: Totales
    const ultima = lineas[lineas.length - 1];
    expect(ultima.startsWith("T;")).toBe(true);
    expect(ultima).toContain("5"); // 5 trabajadores

    // Líneas C (cabecera por trabajador)
    const cabeceras = lineas.filter((l) => l.startsWith("C;"));
    expect(cabeceras.length).toBe(5);

    // Líneas D (detalle)
    const detalles = lineas.filter((l) => l.startsWith("D;"));
    expect(detalles.length).toBeGreaterThan(0);
  });

  it("asigna códigos DT correctos a los conceptos", () => {
    const emp = EMPLEADOS_DEMO[0]; // Gerente con ISAPRE
    const input = buildInput(emp);
    const liquidacion = calcularLiquidacion(input, "2026-03");

    const registro = construirRegistroLRE(liquidacion, {
      rut_empleador: "76.123.456-7",
      razon_social: "Test",
      rut_trabajador: emp.rut,
      fecha_ingreso: emp.fecha_inicio_contrato,
      tipo_contrato: emp.tipo_contrato,
      cargo: emp.cargo,
      centro_costo: emp.centro_costo,
    });

    const codigos = registro.lineas.map((l) => l.codigo_dt);

    // Debe tener sueldo base (1101) y gratificación (1105)
    expect(codigos).toContain("1101");
    expect(codigos).toContain("1105");
    // Debe tener AFP (2101) y salud (2102)
    expect(codigos).toContain("2101");
    expect(codigos).toContain("2102");
  });
});
