'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/context';
import {
  Gift,
  Shield,
  Users,
  Umbrella,
  PartyPopper,
  Stethoscope,
  Baby,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';

interface BeneficioPersonalizado {
  id: string;
  nombre: string;
  descripcion: string;
  monto?: number;
  vigente: boolean;
}

interface LegalBenefit {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  color: string;
  bgColor: string;
  details: string;
}

const legalBenefits: LegalBenefit[] = [
  {
    icon: Shield,
    title: 'Seguro de Cesantía (AFC)',
    subtitle: 'Protección ante desempleo',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    details:
      'Como trabajadora de casa particular tienes derecho al Seguro de Cesantía. Se descuenta un 3% de tu sueldo imponible, que va a tu cuenta individual en la AFC. En caso de desempleo, puedes acceder a estos fondos. Tu empleador también aporta un porcentaje adicional. Puedes consultar tu saldo en www.afc.cl.',
  },
  {
    icon: Users,
    title: 'Asignación Familiar',
    subtitle: 'Beneficio por cargas familiares',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    details:
      'Si tienes hijos u otras cargas familiares, puedes recibir la Asignación Familiar. Los montos actuales por tramo son:\n• Tramo A (hasta $415.232): $15.655 por carga\n• Tramo B ($415.233 - $606.463): $9.608 por carga\n• Tramo C ($606.464 - $945.956): $3.035 por carga\n• Tramo D (sobre $945.956): sin asignación\nDebes acreditar tus cargas ante el IPS o tu caja de compensación.',
  },
  {
    icon: Umbrella,
    title: 'Vacaciones Legales',
    subtitle: '15 días hábiles por año',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    details:
      'Tienes derecho a 15 días hábiles de vacaciones por cada año trabajado. Las vacaciones se pueden acumular hasta por 2 períodos. Tu sueldo durante vacaciones se calcula sobre la remuneración íntegra. Después de 10 años trabajados (continuos o no, para uno o más empleadores), tienes derecho a 1 día adicional por cada 3 años extra (vacaciones progresivas).',
  },
  {
    icon: PartyPopper,
    title: 'Aguinaldo',
    subtitle: 'Septiembre y Diciembre',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    details:
      'Recibes aguinaldo en Fiestas Patrias (septiembre) y Navidad (diciembre). El monto depende de lo establecido en tu contrato y/o la política de tu empleador. El aguinaldo legal para trabajadores del sector público es de referencia, pero muchos empleadores particulares otorgan montos similares. Monto estimado: entre $50.000 y $100.000 por cada ocasión.',
  },
  {
    icon: Stethoscope,
    title: 'Licencia Médica',
    subtitle: 'Cobertura por enfermedad',
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    details:
      'Si te enfermas, tienes derecho a licencia médica pagada. Para solicitarla:\n1. Acude a tu médico o centro de salud\n2. El médico emitirá una licencia médica electrónica\n3. Los primeros 3 días los paga el empleador (si tienes más de 6 meses de antigüedad)\n4. Desde el día 4, FONASA o tu ISAPRE cubre el subsidio\n5. La licencia se notifica automáticamente a tu empleador vía Poppins',
  },
  {
    icon: Baby,
    title: 'Sala Cuna',
    subtitle: 'Para hijos menores de 2 años',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    details:
      'Si tienes hijos menores de 2 años, puedes tener derecho al beneficio de sala cuna. Este beneficio aplica cuando el empleador tiene 20 o más trabajadoras, o según lo que establezca tu contrato. El empleador debe costear la sala cuna o pagar un bono compensatorio. Consulta con tu empleador sobre la disponibilidad de este beneficio.',
  },
];

export default function BeneficiosPage() {
  const { profile } = useAuth();
  const trabajadorId = profile?.trabajador_id || '';
  const [expandedLegal, setExpandedLegal] = useState<number | null>(null);
  const [beneficiosPersonalizados, setBeneficiosPersonalizados] = useState<BeneficioPersonalizado[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBeneficios() {
      if (!trabajadorId) { setLoading(false); return; }
      try {
        const supabase = createClient();
        // Get empleadorId from active contract
        const { data: cont } = await supabase.from('contratos').select('empleador_id')
          .eq('trabajador_id', trabajadorId).eq('estado', 'activo').limit(1).maybeSingle();
        if (!cont?.empleador_id) { setLoading(false); return; }
        const { data } = await supabase
          .from('beneficios_empleador')
          .select('*')
          .eq('empleador_id', cont.empleador_id)
          .eq('vigente', true);
        setBeneficiosPersonalizados(data ?? []);
      } catch {
        // No custom benefits table or no data
      } finally {
        setLoading(false);
      }
    }
    loadBeneficios();
  }, [trabajadorId]);

  const toggleLegal = (index: number) => {
    setExpandedLegal(expandedLegal === index ? null : index);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Mis Beneficios</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Beneficios disponibles como empleada de hogar
        </p>
      </div>

      {/* Legal Benefits */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-zinc-900">Beneficios Legales</h2>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          Estos beneficios te corresponden por ley como trabajadora de casa particular en Chile.
        </p>

        <div className="grid gap-3">
          {legalBenefits.map((benefit, index) => {
            const Icon = benefit.icon;
            const isExpanded = expandedLegal === index;

            return (
              <div
                key={index}
                className="rounded-xl border border-zinc-200 bg-white overflow-hidden transition-shadow hover:shadow-sm"
              >
                <button
                  onClick={() => toggleLegal(index)}
                  className="flex w-full items-center gap-4 p-4 text-left"
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${benefit.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${benefit.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900">{benefit.title}</p>
                    <p className="text-xs text-zinc-500">{benefit.subtitle}</p>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-zinc-400 shrink-0" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-zinc-400 shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-3">
                    <p className="text-sm text-zinc-700 whitespace-pre-line leading-relaxed">
                      {benefit.details}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Poppins Benefits (employer-provided) */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Gift className="h-5 w-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-zinc-900">Beneficios Poppins</h2>
        </div>
        <p className="text-sm text-zinc-500 mb-4">
          Beneficios adicionales otorgados por tu empleador.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : beneficiosPersonalizados.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {beneficiosPersonalizados.map((b) => (
              <div
                key={b.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                    <Gift className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">{b.nombre}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{b.descripcion}</p>
                    {b.monto && (
                      <p className="text-sm font-semibold text-emerald-600 mt-2">
                        ${b.monto.toLocaleString('es-CL')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center">
            <Gift className="mx-auto h-8 w-8 text-zinc-300" />
            <p className="mt-3 text-sm text-zinc-500">
              Tu empleador no ha configurado beneficios adicionales aún.
            </p>
          </div>
        )}
      </section>

      {/* Info card */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <div className="flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">¿Sabías que?</p>
            <p className="text-sm text-blue-700 mt-1">
              Como trabajadora de casa particular, tienes los mismos derechos laborales que
              cualquier otro trabajador en Chile. Si tienes dudas sobre tus beneficios, puedes
              consultar en la Dirección del Trabajo (www.dt.gob.cl) o llamar al 600 450 4000.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
