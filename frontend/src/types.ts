export type PaymentStatus = 'INITIATED' | 'PENDING' | 'SUCCESS' | 'FAILED';

export interface User {
  id: string;
  phone_number: string;
  email: string;
}

export interface Payment {
  reference: string;
  amount: number;
  currency: 'UGX' | 'USD';
  payment_method: 'MOBILE_MONEY';
  customer_phone: string;
  customer_email: string;
  status: PaymentStatus;
  provider_transaction_id?: string;
}

