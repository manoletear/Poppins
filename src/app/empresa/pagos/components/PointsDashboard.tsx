'use client';

import { Sparkles, Plane, TrendingUp, CreditCard } from 'lucide-react';
import { calcularProyeccion, getDestinosDisponibles } from '@/lib/pagos/points-calculator';
import type { TarjetaCliente } from '@/lib/pagos/types';

interface Props {
  tarjeta: { banco: string; programa_puntos: string; tasa_puntos: number; tipo_tarjeta: string; categoria: string } | null;
  puntosAcumulados: number;
  montoMensualPromedio: number;
}

export default function PointsDashboard({ tarjeta, puntosAcumulados, montoMensualPromedio }: Props) {
  if (!tarjeta) {
    return (
      <div className="rounded-xl border-2 border-dashed border-zinc-200 p-8 text-center">
        <CreditCard className="h-8 w-8 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm text-zinc-500">Registra tu tarjeta para ver tus puntos y millas</p>
      </div>
    );
  }

  const proyeccion = calcularProyeccion(tarjeta, montoMensualPromedio, puntosAcumulados);
  const destinos = getDestinosDisponibles(puntosAcumulados);

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-5 w-5 text-white/80" />
              <p className="text-sm text-white/80">{tarjeta.programa_puntos}</p>
            </div>
            <p className="text-3xl font-bold">{proyeccion.puntos_acumulados.toLocaleString('es-CL')}</p>
            <p className="text-sm text-white/70">
              ≈ ${proyeccion.valor_estimado_clp.toLocaleString('es-CL')} CLP
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/60">{tarjeta.banco}</p>
            <p className="text-xs text-white/60">{tarjeta.tipo_tarjeta} {tarjeta.categoria}</p>
            <p className="text-sm font-medium text-white/90 mt-2">
              +{proyeccion.puntos_mes_actual.toLocaleString('es-CL')}/mes
            </p>
          </div>
        </div>

        {proyeccion.meta_pasaje && (
          <div className="mt-6 pt-4 border-t border-white/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Plane className="h-4 w-4 text-white/80" />
                <span className="text-sm text-white/90">Santiago → {proyeccion.meta_pasaje.destino}</span>
              </div>
              <span className="text-sm font-medium text-white">
                {proyeccion.porcentaje_meta}%
              </span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full">
              <div
                className="h-2 bg-white rounded-full transition-all"
                style={{ width: `${proyeccion.porcentaje_meta}%` }}
              />
            </div>
            <p className="text-xs text-white/60 mt-1">
              {proyeccion.meses_restantes <= 12
                ? `Faltan ~${proyeccion.meses_restantes} meses`
                : 'Cambia a un plan con menor comision para acelerar'}
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-zinc-900 mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-violet-500" />
          Destinos alcanzables
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {destinos.slice(0, 8).map(d => {
            const porcentaje = Math.min(100, Math.round((puntosAcumulados / d.millas_necesarias) * 100));
            const alcanzable = porcentaje >= 100;

            return (
              <div
                key={d.destino}
                className={`rounded-lg border p-3 ${
                  alcanzable ? 'border-emerald-200 bg-emerald-50' : 'border-zinc-200'
                }`}
              >
                <p className="text-sm font-medium text-zinc-900">{d.destino}</p>
                <p className="text-xs text-zinc-500">{d.millas_necesarias.toLocaleString()} millas</p>
                <div className="mt-2 w-full h-1.5 bg-zinc-100 rounded-full">
                  <div
                    className={`h-1.5 rounded-full ${alcanzable ? 'bg-emerald-500' : 'bg-violet-400'}`}
                    style={{ width: `${porcentaje}%` }}
                  />
                </div>
                <p className={`text-[10px] font-medium mt-1 ${alcanzable ? 'text-emerald-600' : 'text-zinc-400'}`}>
                  {alcanzable ? 'Disponible!' : `${porcentaje}%`}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
