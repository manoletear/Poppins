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

export default function PlanBanner({ currentPlan, cuentasCount, onUpgrade }: Props) {
  const plan = PLANES[currentPlan] || PLANES.starter;
  const isMaxPlan = currentPlan === 'hogar';
  const isNearLimit = plan.max_cuentas > 0 && cuentasCount >= plan.max_cuentas - 1;
  const nextPlanKey = currentPlan === 'starter' ? 'casa' : currentPlan === 'casa' ? 'hogar' : null;
  const nextPlan = nextPlanKey ? PLANES[nextPlanKey] : null;

  return (
    <div className={`rounded-xl border p-4 ${
      isNearLimit ? 'border-amber-200 bg-amber-50' : 'border-zinc-200 bg-white'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            currentPlan === 'hogar' ? 'bg-violet-100' : currentPlan === 'casa' ? 'bg-blue-100' : 'bg-zinc-100'
          }`}>
            <Crown className={`h-5 w-5 ${
              currentPlan === 'hogar' ? 'text-violet-600' : currentPlan === 'casa' ? 'text-blue-600' : 'text-zinc-500'
            }`} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-900">
              Plan {plan.nombre}
              {plan.precio_mensual > 0 && (
                <span className="text-zinc-500 font-normal"> — {formatCLP(plan.precio_mensual)}/mes</span>
              )}
            </p>
            <p className="text-xs text-zinc-500">
              {plan.max_cuentas === -1
                ? `${cuentasCount} cuentas activas (ilimitadas)`
                : `${cuentasCount}/${plan.max_cuentas} cuentas`}
              {' · '}Comision {plan.comision_porcentaje}%
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

      {isNearLimit && !isMaxPlan && (
        <p className="text-xs text-amber-700 mt-2">
          Estas cerca del limite de cuentas de tu plan. Sube a Plan {nextPlan?.nombre} para agregar mas.
        </p>
      )}
    </div>
  );
}
