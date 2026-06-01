// src/lib/pagos/suscripcion-service.ts
//
// Orquestación de suscripciones (Fase 2): ata el motor puro (suscripcion-engine),
// la API de Suscripciones de Flow (lib/flow) y la persistencia (tabla suscripciones).
//
// Los clientes Supabase/Flow se crean DENTRO de las funciones (no a nivel módulo)
// para no romper el build en page-data cuando faltan env vars.

import { createClient as createServiceClient } from '@supabase/supabase-js';
import {
  createFlowCustomer,
  createFlowSubscription,
  cancelFlowSubscription,
  registerFlowCard,
  getFlowCardStatus,
  flowSimulado,
  FLOW_INTERVAL,
} from '@/lib/flow';
import { getPlan } from './plans';
import {
  trialFin,
  primerCobro,
  proximoCobro,
  montoCobro,
  CAMINO_A_MESES_GRATIS,
  CICLO_DIAS,
  type CaminoActivacion,
} from './suscripcion-engine';
import type { PlanTipo, CicloFacturacion } from './types';

function svc() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const ISO = (d: Date) => d.toISOString().slice(0, 10);

/** planId determinístico en Flow: poppins_<plan>_<ciclo>. */
export function planIdFlow(plan: PlanTipo, ciclo: CicloFacturacion): string {
  return `poppins_${plan}_${ciclo}`;
}

/** Días de trial que se le pasan a Flow según el camino (implementa los meses gratis). */
function trialDaysFor(camino: CaminoActivacion): number {
  // Camino A: meses 1-2 gratis (primer cobro al día 60). Camino B: ya usó el trial.
  return camino === 'A_inmediato' ? CAMINO_A_MESES_GRATIS * CICLO_DIAS : 0;
}

export interface IniciarSuscripcionInput {
  empleadorId: string;
  plan: Exclude<PlanTipo, 'starter'>; // se suscribe a pro o pro_plus
  ciclo: CicloFacturacion;
  camino: CaminoActivacion;
  nombre: string;
  email: string;
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://poppins-fpds-projects-839a78c7.vercel.app').replace(/\/$/, '');
}

/**
 * Inicia la suscripción de un empleador.
 *
 * - **Modo simulado** (sin llaves Flow reales): crea la suscripción directo y la deja
 *   activa (sirve para validar UI/flujo).
 * - **Flow real**: primero hay que registrar la tarjeta on-file. Crea el cliente,
 *   guarda una fila `trial` (pendiente de tarjeta) y devuelve `cardRegisterUrl` para
 *   redirigir al usuario. La suscripción se crea recién en `confirmarTarjetaYSuscribir`.
 */
export async function iniciarSuscripcion(input: IniciarSuscripcionInput) {
  const { empleadorId, plan, ciclo, camino, nombre, email } = input;
  const db = svc();
  const ahora = new Date();

  // Cliente en Flow (idempotente por externalId = empleadorId)
  const customer = await createFlowCustomer({ name: nombre, email, externalId: empleadorId });

  // Fechas vía motor puro (comunes a ambos caminos)
  const fechas = {
    trial_inicio: ISO(ahora),
    trial_fin: ISO(trialFin(ahora)),
    fecha_primer_cobro: ISO(primerCobro(camino, ahora, ahora)),
  };
  const baseRow = {
    empleador_id: empleadorId,
    plan_tipo: plan,
    plan, // columna legacy
    ciclo,
    camino,
    monto_mensual: montoCobro(plan, ciclo),
    trial_inicio: fechas.trial_inicio,
    trial_fin: fechas.trial_fin,
    fecha_primer_cobro: fechas.fecha_primer_cobro,
    fecha_proximo_cobro: fechas.fecha_primer_cobro,
    cobros_realizados: 0,
    flow_customer_id: customer.customerId,
  };

  await db.from('empleadores').update({ plan_tipo: plan }).eq('id', empleadorId);

  // ── Flow real: requiere registrar tarjeta antes de suscribir ──
  if (!flowSimulado()) {
    const card = await registerFlowCard({
      customerId: customer.customerId,
      urlReturn: `${siteUrl()}/empresa/suscripcion/confirmar?empleador=${empleadorId}`,
    });
    await db
      .from('suscripciones')
      .upsert(
        { ...baseRow, estado: 'trial', flow_subscription_id: null, metadata: { card_token: card.token } },
        { onConflict: 'empleador_id' },
      );
    return { ok: true, requiereTarjeta: true, cardRegisterUrl: card.url, token: card.token };
  }

  // ── Modo simulado: crear suscripción directa ──
  const sub = await createFlowSubscription({
    planId: planIdFlow(plan, ciclo),
    customerId: customer.customerId,
    trialPeriodDays: trialDaysFor(camino),
  });
  const { data, error } = await db
    .from('suscripciones')
    .upsert({ ...baseRow, estado: 'activa', flow_subscription_id: sub.subscriptionId }, { onConflict: 'empleador_id' })
    .select()
    .single();
  if (error) throw new Error(`No se pudo guardar la suscripción: ${error.message}`);

  return { ok: true, simulated: true, suscripcion: data };
}

/**
 * Confirma el registro de tarjeta (Flow real) y recién ahí crea la suscripción.
 * Se llama desde la página de retorno tras el registro de tarjeta.
 */
export async function confirmarTarjetaYSuscribir(empleadorId: string) {
  const db = svc();
  const { data: s, error } = await db
    .from('suscripciones')
    .select('*')
    .eq('empleador_id', empleadorId)
    .single();
  if (error || !s) return { ok: false, reason: 'suscripcion_no_encontrada' };
  if (!s.flow_customer_id) return { ok: false, reason: 'sin_cliente_flow' };

  const token = (s.metadata as { card_token?: string } | null)?.card_token ?? '';
  const card = await getFlowCardStatus({ customerId: s.flow_customer_id, token });
  if (String(card.status) !== '1') return { ok: false, reason: 'tarjeta_no_registrada' };

  const sub = await createFlowSubscription({
    planId: planIdFlow(s.plan_tipo as Exclude<PlanTipo, 'starter'>, s.ciclo as CicloFacturacion),
    customerId: s.flow_customer_id,
    trialPeriodDays: trialDaysFor(s.camino as CaminoActivacion),
  });

  await db
    .from('suscripciones')
    .update({ estado: 'activa', flow_subscription_id: sub.subscriptionId })
    .eq('id', s.id);

  return { ok: true };
}

/** Cancela la suscripción (al fin del período). */
export async function cancelarSuscripcion(empleadorId: string) {
  const db = svc();
  const { data: s } = await db
    .from('suscripciones')
    .select('flow_subscription_id')
    .eq('empleador_id', empleadorId)
    .single();
  if (s?.flow_subscription_id) {
    await cancelFlowSubscription({ subscriptionId: s.flow_subscription_id, atPeriodEnd: true });
  }
  await db.from('suscripciones').update({ estado: 'cancelada' }).eq('empleador_id', empleadorId);
  return { ok: true };
}

/**
 * Procesa un evento de cobro recurrente de Flow.
 * - charged → incrementa cobros y recalcula próximo cobro (aplica mes-gratis camino A).
 * - failed  → estado past_due.
 */
export async function procesarCobroWebhook(input: {
  flowSubscriptionId: string;
  resultado: 'charged' | 'failed';
  fechaCobro?: Date;
}) {
  const db = svc();
  const { data: s, error } = await db
    .from('suscripciones')
    .select('*')
    .eq('flow_subscription_id', input.flowSubscriptionId)
    .single();
  if (error || !s) return { ok: false, reason: 'suscripcion_no_encontrada' };

  if (input.resultado === 'failed') {
    await db.from('suscripciones').update({ estado: 'past_due' }).eq('id', s.id);
    return { ok: true, estado: 'past_due' };
  }

  const cobros = (s.cobros_realizados ?? 0) + 1;
  const base = input.fechaCobro ?? new Date(s.fecha_proximo_cobro ?? Date.now());
  const next = proximoCobro(s.camino as CaminoActivacion, s.ciclo as CicloFacturacion, base, cobros);

  await db
    .from('suscripciones')
    .update({
      estado: 'activa',
      cobros_realizados: cobros,
      fecha_proximo_cobro: ISO(next.fecha),
    })
    .eq('id', s.id);

  return { ok: true, estado: 'activa', cobros, proximo_cobro: ISO(next.fecha), proximo_gratis: next.gratis };
}

/** Asegura que existan los 4 planes recurrentes en Flow (pro/pro_plus × mensual/anual). */
export function planesParaFlow(urlCallback: string) {
  const defs: Array<{ plan: PlanTipo; ciclo: CicloFacturacion }> = [
    { plan: 'pro', ciclo: 'mensual' },
    { plan: 'pro', ciclo: 'anual' },
    { plan: 'pro_plus', ciclo: 'mensual' },
    { plan: 'pro_plus', ciclo: 'anual' },
  ];
  return defs.map(({ plan, ciclo }) => ({
    planId: planIdFlow(plan, ciclo),
    name: `${getPlan(plan).nombre} ${ciclo}`,
    amount: montoCobro(plan, ciclo),
    interval: ciclo === 'anual' ? FLOW_INTERVAL.ANUAL : FLOW_INTERVAL.MENSUAL,
    urlCallback,
  }));
}
