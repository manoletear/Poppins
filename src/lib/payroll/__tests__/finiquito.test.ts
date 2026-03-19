import { describe, it, expect } from "vitest";
import { calcularFiniquito } from "../finiquito-engine";
import type { InputFiniquito } from "../finiquito-types";

// ============================================================
// Helpers para construir inputs de test
// ============================================================

function crearInputBase(overrides: Partial<InputFiniquito> = {}): InputFiniquito {
  return {
    empleado: {
      rut: "12.345.678-9",
      nombre: "Carlos",
      apellido_paterno: "Mendoza",
      apellido_materno: "Ríos",
      fecha_ingreso: new Date("2021-03-15"),
    },
    contrato: {
      tipo: "indefinido",
      fecha_inicio: new Date("2021-03-15"),
      sueldo_base: 900000,
      tipo_gratificacion: "art_50",
      inicio_antes_1981: false,
    },
    fecha_termino: new Date("2026-03-15"),
    causal: "161-1",
    dias_vacaciones_pendientes: 5,
    dias_vacaciones_proporcionales: 3.75,
    ultima_remuneracion: 950000,
    aviso_previo_dado: false,
    imm: 500000,
    ...overrides,
  };
}

// ============================================================
// Tests
// ============================================================

describe("Motor de Finiquitos", () => {
  // ── Art 161 con 5 años de servicio ─────────────────────────
  describe("Art 161 - Necesidades de la empresa (5 años servicio)", () => {
    const input = crearInputBase({
      contrato: {
        tipo: "indefinido",
        fecha_inicio: new Date("2021-03-15"),
        sueldo_base: 900000,
        tipo_gratificacion: "art_50",
        inicio_antes_1981: false,
      },
      fecha_termino: new Date("2026-03-15"),
      causal: "161-1",
      ultima_remuneracion: 950000,
      aviso_previo_dado: false,
    });

    const resultado = calcularFiniquito(input);

    it("calcula 5 años de servicio", () => {
      expect(resultado.anos_servicio).toBe(5);
    });

    it("paga indemnización aviso previo (1 mes)", () => {
      expect(resultado.indemnizacion_aviso_previo).toBe(950000);
    });

    it("paga indemnización años servicio (5 meses)", () => {
      expect(resultado.meses_indemnizacion).toBe(5);
      expect(resultado.indemnizacion_anos_servicio).toBe(950000 * 5);
    });

    it("no aplica tope de 11 años", () => {
      expect(resultado.tope_11_anos_aplicado).toBe(false);
    });

    it("calcula remuneración días trabajados", () => {
      // 15 días del mes, sueldo 900000 → (900000/30)*15 = 450000
      expect(resultado.remuneracion_dias_trabajados).toBe(450000);
      expect(resultado.dias_trabajados_mes).toBe(15);
    });

    it("calcula vacaciones pendientes", () => {
      // 5 días * (900000/30) = 5 * 30000 = 150000
      expect(resultado.vacaciones_pendientes).toBe(150000);
    });

    it("calcula vacaciones proporcionales", () => {
      // 3.75 días * (900000/30) = 3.75 * 30000 = 112500
      expect(resultado.vacaciones_proporcionales).toBe(112500);
    });

    it("calcula gratificación proporcional Art. 50", () => {
      // Art 50: 25% de 900000 = 225000, tope 4.75*500000/12 ≈ 197916.67
      // Se aplica tope → Math.round(197916.67 * 3) = 593750
      const topeMensual = (4.75 * 500000) / 12;
      expect(resultado.gratificacion_proporcional).toBe(Math.round(topeMensual * 3));
      expect(resultado.meses_trabajados_ano).toBe(3);
    });

    it("calcula total finiquito correctamente", () => {
      const esperado =
        resultado.remuneracion_dias_trabajados +
        resultado.vacaciones_pendientes +
        resultado.vacaciones_proporcionales +
        resultado.gratificacion_proporcional +
        resultado.indemnizacion_aviso_previo +
        resultado.indemnizacion_anos_servicio;
      expect(resultado.total_finiquito).toBe(esperado);
    });
  });

  // ── Art 161 con 15 años → tope 11 años ────────────────────
  describe("Art 161 - Tope 11 años (15 años servicio)", () => {
    const input = crearInputBase({
      empleado: {
        rut: "9.876.543-2",
        nombre: "Ana",
        apellido_paterno: "Soto",
        apellido_materno: "Vargas",
        fecha_ingreso: new Date("2011-01-10"),
      },
      contrato: {
        tipo: "indefinido",
        fecha_inicio: new Date("2011-01-10"),
        sueldo_base: 1200000,
        tipo_gratificacion: "art_50",
        inicio_antes_1981: false,
      },
      fecha_termino: new Date("2026-06-20"),
      causal: "161-1",
      ultima_remuneracion: 1300000,
      aviso_previo_dado: false,
      dias_vacaciones_pendientes: 10,
      dias_vacaciones_proporcionales: 7.5,
    });

    const resultado = calcularFiniquito(input);

    it("calcula 15 años de servicio", () => {
      expect(resultado.anos_servicio).toBe(15);
    });

    it("aplica tope de 11 años en indemnización", () => {
      expect(resultado.meses_indemnizacion).toBe(11);
      expect(resultado.tope_11_anos_aplicado).toBe(true);
    });

    it("calcula indemnización años servicio con tope", () => {
      expect(resultado.indemnizacion_anos_servicio).toBe(1300000 * 11);
    });

    it("paga aviso previo", () => {
      expect(resultado.indemnizacion_aviso_previo).toBe(1300000);
    });
  });

  // ── Art 161 con contrato pre-1981 → sin tope 11 años ──────
  describe("Art 161 - Contrato pre-1981 (sin tope 11 años)", () => {
    const input = crearInputBase({
      contrato: {
        tipo: "indefinido",
        fecha_inicio: new Date("1975-06-01"),
        sueldo_base: 800000,
        tipo_gratificacion: "art_50",
        inicio_antes_1981: true,
      },
      fecha_termino: new Date("2026-06-01"),
      causal: "161-2",
      ultima_remuneracion: 900000,
      aviso_previo_dado: true,
    });

    const resultado = calcularFiniquito(input);

    it("no aplica tope de 11 años", () => {
      expect(resultado.tope_11_anos_aplicado).toBe(false);
    });

    it("paga todos los años de servicio sin tope", () => {
      // 51 años de servicio
      expect(resultado.anos_servicio).toBe(51);
      expect(resultado.meses_indemnizacion).toBe(51);
      expect(resultado.indemnizacion_anos_servicio).toBe(900000 * 51);
    });

    it("no paga aviso previo (se dio aviso)", () => {
      expect(resultado.indemnizacion_aviso_previo).toBe(0);
    });
  });

  // ── Art 159-2 Renuncia → sin indemnización ─────────────────
  describe("Art 159-2 - Renuncia del trabajador", () => {
    const input = crearInputBase({
      causal: "159-2",
      fecha_termino: new Date("2026-04-20"),
      dias_vacaciones_pendientes: 8,
      dias_vacaciones_proporcionales: 5,
    });

    const resultado = calcularFiniquito(input);

    it("no paga indemnización aviso previo", () => {
      expect(resultado.indemnizacion_aviso_previo).toBe(0);
    });

    it("no paga indemnización años servicio", () => {
      expect(resultado.indemnizacion_anos_servicio).toBe(0);
      expect(resultado.meses_indemnizacion).toBe(0);
    });

    it("sí paga vacaciones pendientes", () => {
      const valorDia = 900000 / 30;
      expect(resultado.vacaciones_pendientes).toBe(Math.round(8 * valorDia));
    });

    it("sí paga vacaciones proporcionales", () => {
      const valorDia = 900000 / 30;
      expect(resultado.vacaciones_proporcionales).toBe(Math.round(5 * valorDia));
    });

    it("sí paga remuneración días trabajados", () => {
      // 20 días de abril
      expect(resultado.remuneracion_dias_trabajados).toBe(Math.round((900000 / 30) * 20));
    });

    it("sí paga gratificación proporcional", () => {
      expect(resultado.gratificacion_proporcional).toBeGreaterThan(0);
      // Enero a Abril = 4 meses
      expect(resultado.meses_trabajados_ano).toBe(4);
    });
  });

  // ── Art 160-3 Disciplinaria → sin indemnización ────────────
  describe("Art 160-3 - Inasistencia injustificada (disciplinaria)", () => {
    const input = crearInputBase({
      causal: "160-3",
      fecha_termino: new Date("2026-02-10"),
      dias_vacaciones_pendientes: 3,
      dias_vacaciones_proporcionales: 1.25,
    });

    const resultado = calcularFiniquito(input);

    it("no paga indemnización aviso previo", () => {
      expect(resultado.indemnizacion_aviso_previo).toBe(0);
    });

    it("no paga indemnización años servicio", () => {
      expect(resultado.indemnizacion_anos_servicio).toBe(0);
      expect(resultado.meses_indemnizacion).toBe(0);
    });

    it("sí paga vacaciones pendientes y proporcionales", () => {
      const valorDia = 900000 / 30;
      expect(resultado.vacaciones_pendientes).toBe(Math.round(3 * valorDia));
      expect(resultado.vacaciones_proporcionales).toBe(Math.round(1.25 * valorDia));
    });

    it("sí paga remuneración por 10 días", () => {
      expect(resultado.dias_trabajados_mes).toBe(10);
      expect(resultado.remuneracion_dias_trabajados).toBe(Math.round((900000 / 30) * 10));
    });
  });

  // ── Vacaciones proporcionales - cálculo detallado ──────────
  describe("Vacaciones proporcionales - cálculo", () => {
    it("calcula correctamente con días fraccionados", () => {
      // 6 meses trabajados en el período → (15/12)*6 = 7.5 días proporcionales
      const diasProporcionales = 7.5;
      const input = crearInputBase({
        causal: "159-1",
        dias_vacaciones_proporcionales: diasProporcionales,
        dias_vacaciones_pendientes: 0,
      });

      const resultado = calcularFiniquito(input);
      const valorDia = 900000 / 30;
      expect(resultado.vacaciones_proporcionales).toBe(Math.round(diasProporcionales * valorDia));
    });

    it("calcula correctamente con cero días", () => {
      const input = crearInputBase({
        causal: "159-1",
        dias_vacaciones_proporcionales: 0,
        dias_vacaciones_pendientes: 0,
      });

      const resultado = calcularFiniquito(input);
      expect(resultado.vacaciones_proporcionales).toBe(0);
      expect(resultado.vacaciones_pendientes).toBe(0);
    });
  });

  // ── Art 161 con aviso previo dado → sin indemnización sustitutiva ──
  describe("Art 161 - Con aviso previo dado", () => {
    const input = crearInputBase({
      causal: "161-1",
      aviso_previo_dado: true,
    });

    const resultado = calcularFiniquito(input);

    it("no paga indemnización aviso previo", () => {
      expect(resultado.indemnizacion_aviso_previo).toBe(0);
    });

    it("sí paga indemnización años servicio", () => {
      expect(resultado.indemnizacion_anos_servicio).toBeGreaterThan(0);
    });
  });
});
