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
export function estadoStarterTrial(alta: Date, now: Date = new Date()): EstadoSuscripcionResult {
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
  altaHint?: string | null,
): Promise<EstadoSuscripcionResult> {
  const [{ data: emp }, { data: sus }] = await Promise.all([
    supabase.from('empleadores').select('created_at, plan_tipo').eq('id', empleadorId).single(),
    supabase.from('suscripciones').select('*').eq('empleador_id', empleadorId).maybeSingle(),
  ]);

  const now = new Date();
  // El trial cuenta desde el REGISTRO (lo más antiguo disponible): trial_inicio
  // explícito, fecha del perfil del usuario (altaHint) o creación del empleador.
  // Evita que recrear la fila de empleador "reinicie" el trial a 30 días.
  const candidatos = [sus?.trial_inicio, altaHint, emp?.created_at]
    .filter(Boolean)
    .map((d) => new Date(d as string).getTime());
  const alta = candidatos.length ? new Date(Math.min(...candidatos)) : now;

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
