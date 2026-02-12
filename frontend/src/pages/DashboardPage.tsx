import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  provider_txn_id?: string;
  created_at: string;
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'UGX',
    payment_method: 'MOBILE_MONEY',
    customer_phone: user?.phone_number || '',
    customer_email: user?.email || '',
  });

  // Fetch payments on mount
  useEffect(() => {
    fetchPayments();
  }, [token]);

  // Auto-select the most recent payment
  useEffect(() => {
    if (payments.length > 0 && !selectedPayment) {
      setSelectedPayment(payments[0]);
    }
  }, [payments]);

  const fetchPayments = async () => {
    if (!token) return;
    try {
      const response = await fetch('/payments/history/all', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setPayments(data.payments || []);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          currency: formData.currency,
          payment_method: formData.payment_method,
          customer_phone: formData.customer_phone,
          customer_email: formData.customer_email,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Payment creation failed');
      }

      setFormData({ ...formData, amount: '' });
      fetchPayments();
    } catch (err: any) {
      setError(err.message || 'Payment creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    if (!selectedPayment || !token) return;
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/payments/${selectedPayment.reference}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
          reason: `Status changed to ${newStatus}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update payment status');
      }

      setSelectedPayment(data);
      fetchPayments();
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRefreshPayment = async () => {
    if (!selectedPayment || !token) return;
    setUpdatingStatus(true);
    try {
      const response = await fetch(`/payments/${selectedPayment.reference}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch payment');
      }

      setSelectedPayment(data);
      fetchPayments();
    } catch (err: any) {
      setError(err.message || 'Failed to refresh payment');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (!selectedPayment || !token) return;
    setUpdatingStatus(true);
    try {
      const response = await fetch('/webhooks/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          payment_reference: selectedPayment.reference,
          status: 'SUCCESS',
          provider_transaction_id: `SIM-${Date.now()}`,
          timestamp: new Date().toISOString(),
          idempotency_key: `demo-${selectedPayment.reference}-${Date.now()}`,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to simulate webhook');
      }

      await handleRefreshPayment();
    } catch (err: any) {
      setError(err.message || 'Failed to simulate webhook');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCardBgColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 border-l-4 border-green-500';
      case 'PENDING':
        return 'bg-gradient-to-br from-yellow-50 to-amber-50 border-l-4 border-yellow-500';
      case 'FAILED':
        return 'bg-gradient-to-br from-red-50 to-rose-50 border-l-4 border-red-500';
      default:
        return 'bg-gradient-to-br from-gray-50 to-slate-50 border-l-4 border-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'SUCCESS':
        return '✓';
      case 'PENDING':
        return '⏳';
      case 'FAILED':
        return '✕';
      default:
        return '◆';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-white">💰 Payment Dashboard</h1>
            <p className="text-blue-100 mt-2">Welcome, <span className="font-semibold">{user?.email || 'User'}</span></p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition shadow-lg hover:shadow-xl transform hover:scale-105"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {/* Create Payment Form - Top Left */}
          <div className="md:col-span-1 lg:col-span-1">
            <div className="bg-white rounded-xl shadow-xl p-8 border border-gray-200 hover:shadow-2xl transition">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                💳 Make Payment
              </h2>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 mb-4">
                  <p className="text-red-700 text-sm font-medium">❌ {error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
                    Amount 💵
                  </label>
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    placeholder="1000"
                    step="0.01"
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 hover:bg-white"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label htmlFor="currency" className="block text-sm font-semibold text-gray-700 mb-2">
                    Currency 🌍
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 hover:bg-white"
                  >
                    <option value="UGX">🇺🇬 UGX</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div>
                  <label htmlFor="payment_method" className="block text-sm font-semibold text-gray-700 mb-2">
                    Payment Method 📱
                  </label>
                  <select
                    id="payment_method"
                    name="payment_method"
                    value={formData.payment_method}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 hover:bg-white"
                  >
                    <option value="MOBILE_MONEY">📱 Mobile Money</option>
                    <option value="CARD">💳 Credit Card</option>
                    <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                  </select>
                </div>

                {/* Customer Phone */}
                <div>
                  <label htmlFor="customer_phone" className="block text-sm font-semibold text-gray-700 mb-2">
                    Phone Number ☎️
                  </label>
                  <input
                    type="tel"
                    id="customer_phone"
                    name="customer_phone"
                    value={formData.customer_phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 hover:bg-white"
                  />
                </div>

                {/* Customer Email */}
                <div>
                  <label htmlFor="customer_email" className="block text-sm font-semibold text-gray-700 mb-2">
                    Email ✉️
                  </label>
                  <input
                    type="email"
                    id="customer_email"
                    name="customer_email"
                    value={formData.customer_email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 hover:bg-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg disabled:shadow-none"
                >
                  {loading ? '⏳ Processing...' : '✨ Create Payment'}
                </button>
              </form>
            </div>
          </div>

          {/* Payment History - Center / Top Right */}
          <div className="md:col-span-2 lg:col-span-2">
            <div className="bg-white rounded-xl shadow-xl overflow-hidden flex flex-col border border-gray-200 hover:shadow-2xl transition">
              <div className="px-8 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-gray-200">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center gap-2">
                  📊 Payment History
                </h2>
              </div>

              {payments.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  <p className="text-lg">📭 No payments yet. Create your first payment to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto flex-1">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-blue-100 to-indigo-100 sticky top-0">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 whitespace-nowrap">📌 Reference</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 whitespace-nowrap">💰 Amount</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 whitespace-nowrap">📱 Method</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 whitespace-nowrap">🔗 Provider Txn</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 whitespace-nowrap">📈 Status</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900 whitespace-nowrap">📅 Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr 
                          key={payment.id} 
                          onClick={() => setSelectedPayment(payment)}
                          className={`hover:scale-[1.01] transition transform cursor-pointer text-sm ${getCardBgColor(payment.status)}`}
                        >
                          <td className="px-6 py-4 font-mono text-gray-900 whitespace-nowrap text-xs font-semibold">{payment.reference}</td>
                          <td className="px-6 py-4 font-bold text-gray-900 whitespace-nowrap">
                            {payment.amount.toLocaleString()} {payment.currency}
                          </td>
                          <td className="px-6 py-4 text-gray-700 capitalize whitespace-nowrap text-xs font-medium">
                            {payment.payment_method.replace(/_/g, ' ')}
                          </td>
                          <td className="px-6 py-4 text-gray-700 font-mono text-xs whitespace-nowrap">{(payment as any).provider_txn_id || '—'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap inline-flex items-center gap-1 ${getStatusColor(payment.status)}`}>
                              <span>{getStatusIcon(payment.status)}</span>
                              {payment.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-gray-700 whitespace-nowrap text-xs font-semibold">
                            {formatDate(payment.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details Card - Right Sidebar */}
          <div className="md:col-span-1 lg:col-span-1">
            {selectedPayment ? (
              <div className={`rounded-xl shadow-xl p-8 border-2 hover:shadow-2xl transition ${getCardBgColor(selectedPayment.status)}`}>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-6 flex items-center gap-2">
                  📋 Payment Status
                </h3>

                {/* Current Status */}
                <div className="mb-6 pb-6 border-b-2 border-gray-300">
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-wide mb-3">Current Status</p>
                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{getStatusIcon(selectedPayment.status)}</span>
                    <span className={`px-4 py-2 rounded-full font-bold text-lg ${getStatusColor(selectedPayment.status)}`}>
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="space-y-5 mb-8">
                  <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-wide mb-1">📌 Reference</p>
                    <p className="text-gray-900 font-mono font-semibold text-xs mt-1 break-all">{selectedPayment.reference}</p>
                  </div>

                  <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-wide mb-1">💰 Amount</p>
                    <p className="text-3xl font-bold text-gray-900 mt-1">
                      {selectedPayment.amount.toLocaleString()} {selectedPayment.currency}
                    </p>
                  </div>

                  <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-wide mb-1">📱 Method</p>
                    <p className="text-gray-900 capitalize mt-1 text-sm font-semibold">{selectedPayment.payment_method.replace(/_/g, ' ')}</p>
                  </div>

                  <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-wide mb-1">🔗 Provider Txn</p>
                    <p className="text-gray-900 font-mono text-xs mt-1 break-all">{selectedPayment.provider_txn_id || '—'}</p>
                  </div>

                  <div className="bg-white bg-opacity-60 p-4 rounded-lg">
                    <p className="text-gray-600 text-xs font-bold uppercase tracking-wide mb-1">📅 Date</p>
                    <p className="text-gray-900 text-sm mt-1 font-semibold">{formatDate(selectedPayment.created_at)}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 pt-6 border-t-2 border-gray-300">
                  <button
                    onClick={handleRefreshPayment}
                    disabled={updatingStatus}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-2 px-4 rounded-lg transition text-sm shadow-lg"
                  >
                    {updatingStatus ? '⏳ Loading...' : '🔄 Refresh'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleUpdatePaymentStatus('PENDING')}
                      disabled={updatingStatus}
                      className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-2 px-3 rounded-lg transition text-sm shadow-lg"
                    >
                      ⏳ Pending
                    </button>
                    <button
                      onClick={() => handleUpdatePaymentStatus('SUCCESS')}
                      disabled={updatingStatus}
                      className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-2 px-3 rounded-lg transition text-sm shadow-lg"
                    >
                      ✓ Success
                    </button>
                  </div>

                  <button
                    onClick={() => handleUpdatePaymentStatus('FAILED')}
                    disabled={updatingStatus}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-2 px-4 rounded-lg transition text-sm shadow-lg"
                  >
                    ✕ Mark Failed
                  </button>

                  <button
                    onClick={handleSimulateWebhook}
                    disabled={updatingStatus}
                    className="w-full bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-2 px-4 rounded-lg transition text-sm shadow-lg"
                  >
                    ⚡ Simulate Webhook
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-xl p-8 text-center text-gray-500 border-2 border-dashed border-gray-300">
                <p className="text-lg font-semibold">👉 Select a payment or create one to see details</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
