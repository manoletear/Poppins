// src/lib/pagos/plans.ts
import type { PlanSuscripcion, PlanTipo } from './types';

export const PLANES: Record<PlanTipo, PlanSuscripcion> = {
  starter: {
    tipo: 'starter',
    nombre: 'Starter',
    precio_mensual: 0,
    max_cuentas: 2,
    comision_porcentaje: 3.5,
    beneficios: [
      '2 cuentas de pago',
      'Pago con tarjeta de credito',
      'Acumulacion de puntos del banco',
      'Comprobantes de pago',
    ],
  },
  casa: {
    tipo: 'casa',
    nombre: 'Casa',
    precio_mensual: 14990,
    max_cuentas: 5,
    comision_porcentaje: 2.5,
    beneficios: [
      '5 cuentas de pago',
      'Comision reducida (2.5%)',
      'Alertas de vencimiento',
      'Historial completo',
      'Proyeccion de puntos/millas',
    ],
  },
  hogar: {
    tipo: 'hogar',
    nombre: 'Hogar',
    precio_mensual: 29990,
    max_cuentas: -1,
    comision_porcentaje: 1.8,
    beneficios: [
      'Cuentas ilimitadas',
      'Comision minima (1.8%)',
      'Pago consolidado "Pagar Todo"',
      'Proyeccion de millas a destinos',
      'Soporte prioritario',
      'Promociones bancarias exclusivas',
    ],
  },
};

export function getPlan(tipo: PlanTipo): PlanSuscripcion {
  return PLANES[tipo];
}

export function canAddAccount(planTipo: PlanTipo, currentCount: number): boolean {
  const plan = PLANES[planTipo];
  if (plan.max_cuentas === -1) return true;
  return currentCount < plan.max_cuentas;
}

export function getComision(planTipo: PlanTipo, monto: number): number {
  const plan = PLANES[planTipo];
  return Math.round(monto * plan.comision_porcentaje / 100);
}
