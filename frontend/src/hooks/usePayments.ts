import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Payment } from '../types';
import { PAYMENT_SERVICE } from '../constants/api';

export const usePayments = () => {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPayments = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${PAYMENT_SERVICE}/history/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setPayments(data.payments || []);
      } else {
        throw new Error(data.message || 'Failed to fetch payments');
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const createPayment = async (paymentData: any) => {
    if (!token) throw new Error('No token available');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(PAYMENT_SERVICE, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Payment creation failed');
      }

      await fetchPayments();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (reference: string, status: string, reason?: string) => {
    if (!token) throw new Error('No token available');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${PAYMENT_SERVICE}/${reference}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, reason }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update payment status');
      }

      await fetchPayments();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshPayment = async (reference: string) => {
    if (!token) throw new Error('No token available');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${PAYMENT_SERVICE}/${reference}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payment');
      }

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const simulateWebhook = async (reference: string) => {
    if (!token) throw new Error('No token available');
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/webhooks/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_reference: reference,
          status: 'SUCCESS',
          provider_transaction_id: `SIM-${Date.now()}`,
          timestamp: new Date().toISOString(),
          idempotency_key: `demo-${reference}-${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to simulate webhook');
      }

      await fetchPayments();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    payments,
    loading,
    error,
    fetchPayments,
    createPayment,
    updatePaymentStatus,
    refreshPayment,
    simulateWebhook,
  };
};
