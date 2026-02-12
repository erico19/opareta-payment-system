import { Payment, PaymentStatus } from './types';

const baseUrl = (import.meta as any).env?.VITE_API_BASE || '';
const baseHeaders = { 'Content-Type': 'application/json' };

const withBase = (path: string) => {
  if (!baseUrl) return path;
  const slash = baseUrl.endsWith('/') || path.startsWith('/') ? '' : '/';
  return `${baseUrl}${slash}${path.replace(/^\/+/, '')}`;
};

async function handle(res: Response) {
  if (res.ok) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }
  let message = 'Request failed';
  try {
    const text = await res.text();
    try {
      const data = JSON.parse(text);
      message = data?.message || JSON.stringify(data);
    } catch {
      message = text || `HTTP ${res.status}`;
    }
  } catch {
    message = `HTTP ${res.status}`;
  }
  throw new Error(message);
}

export async function register(phone_number: string, email: string, password: string) {
  const res = await fetch(withBase('/auth/register'), {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ phone_number, email, password }),
  });
  return handle(res);
}

export async function login(phone_number: string, password: string) {
  const res = await fetch(withBase('/auth/login'), {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ phone_number, password }),
  });
  return handle(res);
}

export async function createPayment(token: string, payload: Omit<Payment, 'status' | 'reference'>) {
  const res = await fetch(withBase('/payments'), {
    method: 'POST',
    headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function getPayment(token: string, reference: string): Promise<Payment> {
  const res = await fetch(withBase(`/payments/${reference}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function updatePaymentStatus(
  token: string,
  reference: string,
  status: PaymentStatus,
  provider_transaction_id?: string,
  reason?: string,
) {
  const res = await fetch(withBase(`/payments/${reference}/status`), {
    method: 'PATCH',
    headers: { ...baseHeaders, Authorization: `Bearer ${token}` },
    body: JSON.stringify({ status, provider_transaction_id, reason }),
  });
  return handle(res);
}

export async function simulateWebhook(payload: {
  payment_reference: string;
  status: PaymentStatus;
  provider_transaction_id: string;
  timestamp: string;
  idempotency_key: string;
}) {
  const res = await fetch(withBase('/webhooks/simulate'), {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify(payload),
  });
  return handle(res);
}

