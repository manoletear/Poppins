import crypto from 'crypto';

const FLOW_API_KEY = (process.env.FLOW_API_KEY || 'flow_sandbox_key').trim();
const FLOW_SECRET_KEY = (process.env.FLOW_SECRET_KEY || 'flow_sandbox_secret').trim();
const FLOW_BASE_URL = process.env.FLOW_ENV === 'sandbox'
  ? 'https://sandbox.flow.cl/api'
  : 'https://www.flow.cl/api';

/**
 * Signs Flow API parameters with HMAC-SHA256
 * Flow requires all params sorted alphabetically, concatenated, then signed
 */
function signParams(params: Record<string, string>): string {
  const sortedKeys = Object.keys(params).sort();
  const toSign = sortedKeys.map(k => `${k}${params[k]}`).join('');
  return crypto.createHmac('sha256', FLOW_SECRET_KEY).update(toSign).digest('hex');
}

/**
 * Creates a payment order in Flow
 */
export async function createFlowPayment(data: {
  commerceOrder: string; // unique order ID
  subject: string; // payment description
  amount: number; // CLP integer
  email: string; // payer email
  urlConfirmation: string; // webhook URL
  urlReturn: string; // redirect after payment
  currency?: string;
  optional?: Record<string, string>;
}) {
  const params: Record<string, string> = {
    apiKey: FLOW_API_KEY,
    commerceOrder: data.commerceOrder,
    subject: data.subject,
    currency: data.currency || 'CLP',
    amount: String(data.amount),
    email: data.email,
    urlConfirmation: data.urlConfirmation,
    urlReturn: data.urlReturn,
    ...(data.optional || {}),
  };

  params.s = signParams(params);

  const formData = new URLSearchParams(params);

  const response = await fetch(`${FLOW_BASE_URL}/payment/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Flow API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<{
    url: string; // redirect URL for payment
    token: string; // payment token
    flowOrder: number; // Flow order number
  }>;
}

/**
 * Gets payment status from Flow
 */
export async function getFlowPaymentStatus(token: string) {
  const params: Record<string, string> = {
    apiKey: FLOW_API_KEY,
    token,
  };
  params.s = signParams(params);

  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${FLOW_BASE_URL}/payment/getStatus?${query}`);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Flow API error: ${response.status} - ${error}`);
  }

  return response.json() as Promise<{
    flowOrder: number;
    commerceOrder: string;
    requestDate: string;
    status: number; // 1=pending, 2=paid, 3=rejected, 4=cancelled
    subject: string;
    currency: string;
    amount: number;
    payer: string;
    paymentData?: {
      date: string;
      media: string; // payment method used
      conversionDate?: string;
      conversionRate?: number;
      amount: number;
      currency: string;
      fee: number; // Flow commission
      balance: number; // net amount
      transferDate: string;
    };
  }>;
}

/**
 * Creates a refund in Flow
 */
export async function createFlowRefund(data: {
  refundCommerceOrder: string;
  receiverEmail: string;
  amount: number;
  urlCallBack: string;
}) {
  const params: Record<string, string> = {
    apiKey: FLOW_API_KEY,
    refundCommerceOrder: data.refundCommerceOrder,
    receiverEmail: data.receiverEmail,
    amount: String(data.amount),
    urlCallBack: data.urlCallBack,
  };

  params.s = signParams(params);
  const formData = new URLSearchParams(params);

  const response = await fetch(`${FLOW_BASE_URL}/refund/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Flow refund error: ${response.status} - ${error}`);
  }

  return response.json();
}

export const FLOW_STATUS = {
  PENDING: 1,
  PAID: 2,
  REJECTED: 3,
  CANCELLED: 4,
} as const;

// ─────────────────────────────────────────────────────────────────────────
//  Suscripciones (Fase 2) — API recurrente de Flow.cl
//  Docs: https://www.flow.cl/docs/api.html (Customer / Plans / Subscription)
//
//  Modo SIMULADO: si no hay llaves reales (placeholder sandbox), las funciones
//  devuelven respuestas falsas con `simulated: true` para poder desarrollar el
//  flujo end-to-end sin Flow. Mismo patrón que /api/onboarding/flow/create.
// ─────────────────────────────────────────────────────────────────────────

/** ¿Estamos sin llaves reales de Flow? → modo simulado. */
export function flowSimulado(): boolean {
  return !FLOW_API_KEY || FLOW_API_KEY === 'flow_sandbox_key';
}

/** Intervalos de cobro de Flow (planes). */
export const FLOW_INTERVAL = { DIARIO: 1, SEMANAL: 2, MENSUAL: 3, ANUAL: 4 } as const;

async function flowPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const withKey: Record<string, string> = { apiKey: FLOW_API_KEY, ...params };
  withKey.s = signParams(withKey);
  const res = await fetch(`${FLOW_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(withKey).toString(),
  });
  if (!res.ok) throw new Error(`Flow ${path} error: ${res.status} - ${await res.text()}`);
  return res.json() as Promise<T>;
}

async function flowGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const withKey: Record<string, string> = { apiKey: FLOW_API_KEY, ...params };
  withKey.s = signParams(withKey);
  const res = await fetch(`${FLOW_BASE_URL}${path}?${new URLSearchParams(withKey).toString()}`);
  if (!res.ok) throw new Error(`Flow ${path} error: ${res.status} - ${await res.text()}`);
  return res.json() as Promise<T>;
}

/** Crea un cliente en Flow (necesario para suscripción + tarjeta on-file). */
export async function createFlowCustomer(data: { name: string; email: string; externalId: string }) {
  if (flowSimulado()) {
    return { customerId: `cus_sim_${data.externalId}`, simulated: true };
  }
  return flowPost<{ customerId: string }>('/customer/create', {
    name: data.name,
    email: data.email,
    externalId: data.externalId,
  });
}

/**
 * Inicia el registro de tarjeta on-file. Devuelve `url` (form de Flow) + `token`.
 * El cliente debe ser redirigido a `url`; al volver se confirma con getCardStatus.
 */
export async function registerFlowCard(data: { customerId: string; urlReturn: string }) {
  if (flowSimulado()) {
    return { url: null, token: `card_sim_${Date.now()}`, simulated: true };
  }
  return flowPost<{ url: string; token: string }>('/customer/register', {
    customerId: data.customerId,
    url_return: data.urlReturn,
  });
}

/** Estado del registro de tarjeta. */
export async function getFlowCardStatus(data: { customerId: string; token: string }) {
  if (flowSimulado()) {
    return { status: '1', customerId: data.customerId, simulated: true };
  }
  return flowGet<{ status: string; creditCardType?: string; last4CardDigits?: string }>(
    '/customer/getRegisterStatus',
    { customerId: data.customerId, token: data.token },
  );
}

/**
 * Crea (idempotente) un plan recurrente en Flow.
 * Para Poppins: 1 plan por (plan_tipo × ciclo). Ej: planId="poppins_pro_mensual".
 * `trial_period_days` implementa los meses gratis del Camino A (60) o B (0).
 */
export async function createFlowPlan(data: {
  planId: string;
  name: string;
  amount: number;
  interval: number; // FLOW_INTERVAL
  trialPeriodDays?: number;
  urlCallback: string;
  currency?: string;
}) {
  if (flowSimulado()) return { planId: data.planId, simulated: true };
  return flowPost<{ planId: string }>('/plans/create', {
    planId: data.planId,
    name: data.name,
    currency: data.currency || 'CLP',
    amount: String(data.amount),
    interval: String(data.interval),
    trial_period_days: String(data.trialPeriodDays ?? 0),
    urlCallback: data.urlCallback,
  });
}

/** Crea la suscripción: Flow cobra automáticamente según el plan. */
export async function createFlowSubscription(data: {
  planId: string;
  customerId: string;
  trialPeriodDays?: number;
  couponId?: string;
}) {
  if (flowSimulado()) {
    return {
      subscriptionId: `sub_sim_${Date.now()}`,
      status: 1,
      simulated: true,
    };
  }
  const params: Record<string, string> = {
    planId: data.planId,
    customerId: data.customerId,
  };
  if (data.trialPeriodDays !== undefined) params.trial_period_days = String(data.trialPeriodDays);
  if (data.couponId) params.couponId = data.couponId;
  return flowPost<{ subscriptionId: string; status: number }>('/subscription/create', params);
}

/** Consulta el estado de una suscripción. */
export async function getFlowSubscription(subscriptionId: string) {
  if (flowSimulado()) return { subscriptionId, status: 1, simulated: true };
  return flowGet<{ subscriptionId: string; status: number; next_invoice_date?: string }>(
    '/subscription/get',
    { subscriptionId },
  );
}

/** Cancela una suscripción (at_period_end por defecto). */
export async function cancelFlowSubscription(data: { subscriptionId: string; atPeriodEnd?: boolean }) {
  if (flowSimulado()) return { subscriptionId: data.subscriptionId, status: 4, simulated: true };
  return flowPost<{ subscriptionId: string; status: number }>('/subscription/cancel', {
    subscriptionId: data.subscriptionId,
    at_period_end: data.atPeriodEnd === false ? '0' : '1',
  });
}

export { FLOW_API_KEY, FLOW_BASE_URL };
