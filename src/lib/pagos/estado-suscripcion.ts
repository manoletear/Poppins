// src/lib/pagos/estado-suscripcion.ts
//
// Resuelve el estado de suscripción "vivo" de un empleador combinando la fila
// de `suscripciones` con el motor puro (trial 30d). Lo consume el banner/modal
// de la UI (Fase 4) y los guards de escritura (solo-lectura).

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  estadoPorTrial,
  esSoloLectura,
  diasRestantesTrial,
  enTrial,
  type EstadoSuscripcion,
} from './suscripcion-engine';

export interface EstadoSuscripcionResult {
  estado: EstadoSuscripcion;
  soloLectura: boolean;
  enTrial: boolean;
  diasRestantesTrial: number;
  plan_tipo: string;
  ciclo: string | null;
  fecha_proximo_cobro: string | null;
}

/**
 * Estado por defecto (Starter en trial) cuando el usuario aún no tiene empleador
 * asociado — p.ej. recién registrado. Permite validar/usar el portal como Starter
 * sin necesidad de un empleador ni suscripción todavía. `alta` = fecha de creación
 * del perfil/usuario (cae a "hoy" si no se conoce).
 */
export function estadoStarterTrial(alta: Date): EstadoSuscripcionResult {
  const now = new Date();
  const estado = estadoPorTrial(now, alta, false); // 'trial' | 'pausada'
  return {
    estado,
    soloLectura: esSoloLectura(estado),
    enTrial: estado === 'trial' && enTrial(now, alta),
    diasRestantesTrial: diasRestantesTrial(now, alta),
    plan_tipo: 'starter',
    ciclo: null,
    fecha_proximo_cobro: null,
  };
}

export async function getEstadoSuscripcion(
  supabase: SupabaseClient,
  empleadorId: string,
): Promise<EstadoSuscripcionResult> {
  const [{ data: emp }, { data: sus }] = await Promise.all([
    supabase.from('empleadores').select('created_at, plan_tipo').eq('id', empleadorId).single(),
    supabase.from('suscripciones').select('*').eq('empleador_id', empleadorId).maybeSingle(),
  ]);

  const now = new Date();
  const alta = new Date(sus?.trial_inicio || emp?.created_at || now.toISOString());

  let estado: EstadoSuscripcion;
  if (sus?.estado === 'activa' || sus?.estado === 'past_due') {
    estado = sus.estado;
  } else if (sus?.estado === 'cancelada') {
    estado = 'cancelada';
  } else if (sus?.estado === 'pausada' || sus?.estado === 'suspendida' || sus?.estado === 'vencida') {
    estado = 'pausada';
  } else {
    // Sin suscripción activa: en trial o pausada según el reloj.
    estado = estadoPorTrial(now, alta, false);
  }

  return {
    estado,
    soloLectura: esSoloLectura(estado),
    enTrial: estado === 'trial' && enTrial(now, alta),
    diasRestantesTrial: diasRestantesTrial(now, alta),
    plan_tipo: sus?.plan_tipo || emp?.plan_tipo || 'starter',
    ciclo: sus?.ciclo ?? null,
    fecha_proximo_cobro: sus?.fecha_proximo_cobro ?? null,
  };
}
