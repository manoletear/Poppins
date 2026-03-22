import crypto from 'crypto';

const FLOW_API_KEY = process.env.FLOW_API_KEY || 'flow_sandbox_key';
const FLOW_SECRET_KEY = process.env.FLOW_SECRET_KEY || 'flow_sandbox_secret';
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

export { FLOW_API_KEY, FLOW_BASE_URL };
