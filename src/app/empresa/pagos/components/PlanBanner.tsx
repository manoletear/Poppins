'use client';

import { Crown, ArrowRight } from 'lucide-react';
import { PLANES } from '@/lib/pagos/plans';
import type { PlanTipo } from '@/lib/pagos/types';

interface Props {
  currentPlan: PlanTipo;
  cuentasCount: number;
  onUpgrade: (plan: PlanTipo) => void;
}

function formatCLP(amount: number): string {
  return '$' + amount.toLocaleString('es-CL');
}

const NEXT_PLAN: Record<PlanTipo, PlanTipo | null> = {
  starter: 'pro',
  pro: 'pro_plus',
  pro_plus: null,
};

export default function PlanBanner({ currentPlan, cuentasCount, onUpgrade }: Props) {
  const plan = PLANES[currentPlan] || PLANES.starter;
  const isMaxPlan = currentPlan === 'pro_plus';
  const nextPlanKey = NEXT_PLAN[currentPlan];
  const nextPlan = nextPlanKey ? PLANES[nextPlanKey] : null;

  const limiteTexto =
    plan.max_trabajadores === -1
      ? 'Trabajadores ilimitados'
      : `Hasta ${plan.max_trabajadores} trabajador${plan.max_trabajadores > 1 ? 'es' : ''}`;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              currentPlan === 'pro_plus' ? 'bg-violet-100' : currentPlan === 'pro' ? 'bg-blue-100' : 'bg-zinc-100'
            }`}
          >
            <Crown
              className={`h-5 w-5 ${
                currentPlan === 'pro_plus' ? 'text-violet-600' : currentPlan === 'pro' ? 'text-blue-600' : 'text-zinc-500'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Plan {plan.nombre}
              {plan.precio_mensual > 0 && (
                <span className="text-zinc-500 font-normal"> — {formatCLP(plan.precio_mensual)}/mes</span>
              )}
            </p>
            <p className="text-xs text-zinc-500">
              {limiteTexto}
              {' · '}
              {cuentasCount} cuentas de pago activas
            </p>
          </div>
        </div>

        {!isMaxPlan && nextPlan && (
          <button
            onClick={() => onUpgrade(nextPlanKey as PlanTipo)}
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center gap-1.5"
          >
            Subir a {nextPlan.nombre}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
