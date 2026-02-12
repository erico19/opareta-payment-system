export interface User {
  id: string;
  phone_number: string;
  email: string;
}

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  provider_txn_id?: string;
  created_at: string;
}
