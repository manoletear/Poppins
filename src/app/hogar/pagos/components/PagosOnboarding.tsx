'use client';

import { CreditCard, Search, Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { OnboardingState } from '@/lib/pagos/types';

interface Props {
  state: OnboardingState;
  onStartCardSetup: () => void;
  onStartDiscovery: () => void;
}

const STEPS = [
  {
    key: 'tarjeta_registrada' as const,
    icon: CreditCard,
    title: 'Registra tu tarjeta',
    description: 'Detectamos tu banco y programa de puntos automaticamente',
    cta: 'Agregar Tarjeta',
    color: 'violet',
  },
  {
    key: 'primera_cuenta_agregada' as const,
    icon: Search,
    title: 'Agrega tus cuentas',
    description: 'Busca por direccion, RUT, o tipo de servicio',
    cta: 'Buscar Cuentas',
    color: 'blue',
  },
  {
    key: 'primer_pago_realizado' as const,
    icon: Sparkles,
    title: 'Realiza tu primer pago',
    description: 'Paga con tarjeta y acumula puntos/millas de tu banco',
    cta: 'Ir a Pagos',
    color: 'emerald',
  },
];

export default function PagosOnboarding({ state, onStartCardSetup, onStartDiscovery }: Props) {
  const completedCount = Object.values(state).filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div className="text-center py-8">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-zinc-900">Bienvenido a Pagos y Puntos</h2>
        <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto">
          Paga tus cuentas con tarjeta de credito y acumula puntos/millas de tu banco.
          Configura tu cuenta en 3 pasos.
        </p>
      </div>

      <div className="flex items-center justify-center gap-2">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className={`h-2 w-16 rounded-full transition-colors ${
              i < completedCount ? 'bg-violet-500' : 'bg-zinc-200'
            }`}
          />
        ))}
        <span className="ml-2 text-xs text-zinc-500">{completedCount}/3</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {STEPS.map((step, index) => {
          const completed = state[step.key];
          const isNext = !completed && Object.values(state).filter(Boolean).length === index;
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              className={`rounded-2xl border-2 p-6 transition-all ${
                completed
                  ? 'border-emerald-200 bg-emerald-50/50'
                  : isNext
                  ? 'border-violet-300 bg-white shadow-lg shadow-violet-100/50'
                  : 'border-zinc-200 bg-zinc-50 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                  completed ? 'bg-emerald-100' : isNext ? 'bg-violet-100' : 'bg-zinc-100'
                }`}>
                  {completed ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  ) : (
                    <Icon className={`h-6 w-6 ${isNext ? 'text-violet-600' : 'text-zinc-400'}`} />
                  )}
                </div>
                <span className="text-xs font-medium text-zinc-400">Paso {index + 1}</span>
              </div>

              <h3 className={`text-lg font-semibold mb-1 ${completed ? 'text-emerald-800' : 'text-zinc-900'}`}>
                {completed ? `${step.title} ✓` : step.title}
              </h3>
              <p className="text-sm text-zinc-500 mb-4">{step.description}</p>

              {!completed && isNext && (
                <button
                  onClick={index === 0 ? onStartCardSetup : onStartDiscovery}
                  className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                >
                  {step.cta}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
