// Motor de cálculo de remuneraciones Chile (TCP — Trabajadores de Casa Particular)
// Función pura: entrada → resultado inmutable con trazabilidad. Sin side effects.

import type {
  PayrollEngineInput,
  PayrollResult,
  ConceptResult,
  CalculationTraceStep,
} from './types/payroll';
import { ConceptType, HealthType } from './types/enums';

// Tasa mutual base; el snapshot no expone campo propio. ACHS básica.
const MUTUAL_BASE_RATE = 0.0093;

export function calculatePayroll(input: PayrollEngineInput): PayrollResult {
  const { contract, worker, periodEvents, variableItems = [], snapshot } = input;
  const trace: CalculationTraceStep[] = [];
  const concepts: ConceptResult[] = [];
  const warnings: string[] = [];
  let traceOrder = 0;

  function t(
    code: string,
    description: string,
    result: number,
    formula?: string,
    inputs?: Record<string, number | string | null>
  ): void {
    trace.push({ order: traceOrder++, code, description, formula, inputs, result });
  }

  function c(
    conceptCode: string,
    conceptName: string,
    conceptType: ConceptType,
    amount: number,
    opts: Partial<Omit<ConceptResult, 'conceptCode' | 'conceptName' | 'conceptType' | 'amount'>> = {}
  ): void {
    concepts.push({
      conceptCode,
      conceptName,
      conceptType,
      amount: Math.round(amount),
      baseAmount: opts.baseAmount !== undefined ? Math.round(opts.baseAmount) : undefined,
      rate: opts.rate,
      taxable: opts.taxable ?? true,
      imponible: opts.imponible ?? true,
      legal: opts.legal ?? true,
      visibleInPayslip: opts.visibleInPayslip ?? true,
      calculationOrder: opts.calculationOrder ?? concepts.length,
    });
  }

  // ── 1. Sueldo base proporcional ──
  const [y, m] = input.payrollPeriod.split('-').map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const workedDays = Math.min(periodEvents.workedDays, daysInMonth);
  const sueldoBase = contract.baseSalary * (workedDays / daysInMonth);
  t('SUELDO_BASE', 'Sueldo base proporcional', sueldoBase,
    'baseSalary * (workedDays / daysInMonth)',
    { baseSalary: contract.baseSalary, workedDays, daysInMonth });
  c('SUELDO_BASE', 'Sueldo Base', ConceptType.HABER, sueldoBase,
    { baseAmount: contract.baseSalary, calculationOrder: 1 });

  // ── 2. Horas extras (150%) ──
  let horasExtra = 0;
  if ((periodEvents.extraHours ?? 0) > 0) {
    const valorHora = contract.baseSalary / (contract.weeklyHours * 4.333);
    horasExtra = valorHora * 1.5 * periodEvents.extraHours!;
    t('HORAS_EXTRA', 'Horas extraordinarias (50%)', horasExtra,
      '(baseSalary / (weeklyHours * 4.333)) * 1.5 * extraHours',
      { valorHora: Math.round(valorHora), extraHours: periodEvents.extraHours! });
    c('HORAS_EXTRA', 'Horas Extraordinarias', ConceptType.HABER, horasExtra,
      { baseAmount: valorHora, rate: 1.5, calculationOrder: 2 });
  }

  // ── 3. Ítems variables ──
  const NON_TAXABLE_CODES = new Set([
    'ASIGNACION_MOVILIZACION', 'ASIGNACION_COLACION', 'VIATICO',
    'REEMBOLSO_GASTOS', 'BONO_NO_IMPONIBLE',
  ]);
  let variablesImponibles = 0;
  let variablesNoImponibles = 0;
  for (const item of variableItems) {
    const imponible = !NON_TAXABLE_CODES.has(item.conceptCode);
    if (imponible) variablesImponibles += item.amount;
    else variablesNoImponibles += item.amount;
    c(item.conceptCode, item.conceptCode, ConceptType.HABER, item.amount,
      { imponible, taxable: imponible });
  }

  // ── 4. Bases ──
  const grossIncome = sueldoBase + horasExtra + variablesImponibles + variablesNoImponibles;
  const remuneracionImponible = sueldoBase + horasExtra + variablesImponibles;
  const cap = snapshot.afpHealthMutualCapClp;
  const capAfc = snapshot.unemploymentCapClp;
  const pensionBase = Math.min(remuneracionImponible, cap);
  const healthBase = Math.min(remuneracionImponible, cap);
  const afcBase = Math.min(remuneracionImponible, capAfc);
  const mutualBase = Math.min(remuneracionImponible, cap);
  t('RENTA_IMPONIBLE', 'Remuneración imponible', remuneracionImponible,
    'sueldoBase + horasExtra + variablesImponibles',
    { sueldoBase: Math.round(sueldoBase), horasExtra: Math.round(horasExtra), variablesImponibles });

  // ── 5. AFP ──
  const afpRate = snapshot.afpRates.find(r => r.afpCode === worker.afpCode);
  if (!afpRate) warnings.push(`AFP '${worker.afpCode}' no encontrada en snapshot; cotización en 0.`);
  const afp10Rate = afpRate?.mandatoryRate ?? 0.10;
  const afpCommissionRate = afpRate?.commissionRate ?? 0;
  const afp10 = worker.isPensioner ? 0 : Math.round(pensionBase * afp10Rate);
  const afpCommission = worker.isPensioner ? 0 : Math.round(pensionBase * afpCommissionRate);
  if (!worker.isPensioner) {
    c('AFP_10', 'Cotización AFP (10%)', ConceptType.DESCUENTO, afp10,
      { baseAmount: pensionBase, rate: afp10Rate, calculationOrder: 10 });
    c('AFP_COMISION', 'Comisión AFP', ConceptType.DESCUENTO, afpCommission,
      { baseAmount: pensionBase, rate: afpCommissionRate, calculationOrder: 11 });
  }

  // ── 6. Salud ──
  const salud7Minimo = Math.round(healthBase * snapshot.healthLegalRate);
  let salud7 = salud7Minimo;
  if (worker.healthType === HealthType.ISAPRE && worker.isaprePlanUf) {
    const planClp = Math.round(worker.isaprePlanUf * snapshot.ufPeriodEndValue);
    if (planClp > salud7Minimo) {
      const diferencia = planClp - salud7Minimo;
      c('SALUD_7', 'Cotización Salud ISAPRE (7% mínimo)', ConceptType.DESCUENTO, salud7,
        { baseAmount: healthBase, rate: snapshot.healthLegalRate, calculationOrder: 12 });
      c('ISAPRE_DIFERENCIA_PLAN', 'Diferencia Plan ISAPRE', ConceptType.DESCUENTO, diferencia,
        { baseAmount: planClp, calculationOrder: 13 });
    } else {
      c('SALUD_7', 'Cotización Salud ISAPRE (7%)', ConceptType.DESCUENTO, salud7,
        { baseAmount: healthBase, rate: snapshot.healthLegalRate, calculationOrder: 12 });
    }
  } else {
    c('SALUD_7', 'Cotización Salud FONASA (7%)', ConceptType.DESCUENTO, salud7,
      { baseAmount: healthBase, rate: snapshot.healthLegalRate, calculationOrder: 12 });
  }

  // ── 7. Base impuesto único ──
  const incomeTaxBase = remuneracionImponible - afp10 - afpCommission - salud7;
  t('BASE_IMPUESTO', 'Base imponible impuesto único', incomeTaxBase,
    'remuneracionImponible - afp10 - afpCommission - salud7',
    { remuneracionImponible, afp10, afpCommission, salud7 });

  // ── 8. Impuesto único 2ª categoría ──
  let incomeTax = 0;
  const bracket = snapshot.taxBrackets.find(b =>
    incomeTaxBase >= b.fromAmount && (b.toAmount === null || incomeTaxBase <= b.toAmount)
  );
  if (bracket) {
    incomeTax = Math.max(0, Math.round(incomeTaxBase * bracket.factor - bracket.deductionAmount));
    t('IMPUESTO_UNICO', 'Impuesto único 2ª categoría', incomeTax,
      'base * factor - deduccion',
      { incomeTaxBase, factor: bracket.factor, deduccion: bracket.deductionAmount });
  }
  if (incomeTax > 0) {
    c('IMPUESTO_UNICO_SEGUNDA_CATEGORIA', 'Impuesto Único 2ª Categoría', ConceptType.DESCUENTO, incomeTax,
      { baseAmount: incomeTaxBase, rate: bracket?.factor, calculationOrder: 20 });
  }

  // ── 9. Descuento ausencias injustificadas ──
  let descuentoAusencia = 0;
  if ((periodEvents.unjustifiedAbsenceDays ?? 0) > 0) {
    descuentoAusencia = Math.round(
      contract.baseSalary * (periodEvents.unjustifiedAbsenceDays! / daysInMonth)
    );
    c('AUSENCIA_INJUSTIFICADA', 'Descuento Ausencia Injustificada', ConceptType.DESCUENTO,
      descuentoAusencia, { baseAmount: contract.baseSalary, calculationOrder: 25 });
  }

  // ── 10. Aportes empleador ──
  const sis = Math.round(pensionBase * snapshot.sisRate);
  const afcEmpleador = Math.round(afcBase * snapshot.afcTcpEmployerRate);
  const cai = Math.round(remuneracionImponible * snapshot.caiTcpRate);
  const mutual = Math.round(mutualBase * MUTUAL_BASE_RATE);

  c('SIS', 'Seguro de Invalidez y Sobrevivencia (SIS)', ConceptType.APORTE_EMPLEADOR, sis,
    { baseAmount: pensionBase, rate: snapshot.sisRate, visibleInPayslip: false, calculationOrder: 50 });
  c('AFC_EMPLEADOR_TCP_3', 'AFC Empleador TCP (3%)', ConceptType.APORTE_EMPLEADOR, afcEmpleador,
    { baseAmount: afcBase, rate: snapshot.afcTcpEmployerRate, visibleInPayslip: false, calculationOrder: 51 });
  c('CAI_INDEMNIZACION_TODO_EVENTO_1_11', 'CAI Todo Evento (1,11%)', ConceptType.APORTE_EMPLEADOR, cai,
    { baseAmount: remuneracionImponible, rate: snapshot.caiTcpRate, visibleInPayslip: false, calculationOrder: 52 });
  c('MUTUAL_ACCIDENTES_TRABAJO', 'Mutual Accidentes del Trabajo', ConceptType.APORTE_EMPLEADOR, mutual,
    { baseAmount: mutualBase, rate: MUTUAL_BASE_RATE, visibleInPayslip: false, calculationOrder: 53 });

  // ── 11. Totales ──
  const totalDescuentos = afp10 + afpCommission + salud7 + incomeTax + descuentoAusencia;
  const netPay = Math.round(grossIncome - totalDescuentos);
  const totalEmployerCost = Math.round(remuneracionImponible + sis + afcEmpleador + cai + mutual);

  return {
    payrollPeriod: input.payrollPeriod,
    contractId: contract.contractId,
    workerId: contract.workerId,
    indicatorSnapshotId: snapshot.id,
    grossIncome: Math.round(grossIncome),
    taxableIncome: Math.round(remuneracionImponible),
    pensionBase: Math.round(pensionBase),
    healthBase: Math.round(healthBase),
    afcBase: Math.round(afcBase),
    mutualBase: Math.round(mutualBase),
    incomeTaxBase: Math.round(incomeTaxBase),
    employeeDeductions: {
      afp10,
      afpCommission,
      health7: salud7,
      incomeTax,
      advances: 0,
      other: descuentoAusencia,
    },
    employerContributions: {
      sis,
      afcEmployer: afcEmpleador,
      cai111: cai,
      mutual,
    },
    netPay,
    totalEmployerCost,
    concepts,
    warnings,
    calculationTrace: trace,
  };
}
