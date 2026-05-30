// src/lib/pagos/plans.ts
// Fuente de verdad ÚNICA del catálogo de planes Poppins.
import type { PlanSuscripcion, PlanTipo, CicloFacturacion } from './types';

export const PLANES: Record<PlanTipo, PlanSuscripcion> = {
  starter: {
    tipo: 'starter',
    nombre: 'Starter',
    precio_mensual: 0,
    precio_anual: 0,
    max_trabajadores: 1,
    es_trial: true,
    trial_dias: 30,
    beneficios: [
      'Prueba gratis por 30 días',
      'Sin tarjeta de crédito',
      'Acceso completo a la plataforma',
      'Al terminar elegís Pro o Pro+',
    ],
  },
  pro: {
    tipo: 'pro',
    nombre: 'Pro',
    precio_mensual: 19990,
    precio_anual: 199900, // 10 meses
    max_trabajadores: 1,
    es_trial: false,
    trial_dias: 0,
    beneficios: [
      '1 trabajador (ej. Asesora del Hogar)',
      'Liquidaciones y contratos',
      'Pagos con tarjeta + acumulación de puntos',
      'Recordatorios y alertas de vencimiento',
      'Historial completo',
    ],
  },
  pro_plus: {
    tipo: 'pro_plus',
    nombre: 'Pro+',
    precio_mensual: 24990,
    precio_anual: 249900, // 10 meses
    max_trabajadores: -1, // ilimitado
    es_trial: false,
    trial_dias: 0,
    beneficios: [
      'Trabajadores ilimitados (2ª asesora, jardín, etc.)',
      'Todo lo del plan Pro',
      'Pago consolidado "Pagar Todo"',
      'Proyección de puntos/millas',
      'Soporte prioritario',
    ],
  },
};

export function getPlan(tipo: PlanTipo): PlanSuscripcion {
  return PLANES[tipo];
}

/** Precio según ciclo. Anual = 10 × mensual (ahorro de 2 meses). */
export function getPrecio(tipo: PlanTipo, ciclo: CicloFacturacion): number {
  const plan = PLANES[tipo];
  return ciclo === 'anual' ? plan.precio_anual : plan.precio_mensual;
}

/** ¿Puede agregar otro trabajador con este plan? (-1 = ilimitado). */
export function canAddTrabajador(planTipo: PlanTipo, currentCount: number): boolean {
  const plan = PLANES[planTipo];
  if (plan.max_trabajadores === -1) return true;
  return currentCount < plan.max_trabajadores;
}
