import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input, Button, Alert } from '../components/common';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, loading, error: authError } = useAuth();
  const [formData, setFormData] = useState({ phone_number: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.phone_number || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await login(formData.phone_number, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const displayError = error || authError;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-10 border border-gray-200 relative z-10 hover:shadow-3xl transition-shadow">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-4 mb-4 shadow-lg transform hover:scale-110 transition">
            <span className="text-4xl">💳</span>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
            Opareta
          </h1>
          <p className="text-gray-600 font-medium text-lg">🏦 Payment Gateway</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {displayError && (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
              <span className="text-2xl">❌</span>
              <div className="flex-1">
                <p className="text-red-700 font-semibold text-sm">{displayError}</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="phone_number" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              📱 Phone Number
            </label>
            <input
              type="tel"
              id="phone_number"
              name="phone_number"
              value={formData.phone_number}
              onChange={handleChange}
              placeholder="256701234567"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 hover:bg-white font-medium"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-2">
              🔐 Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-gray-50 hover:bg-white font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 px-4 rounded-lg transition transform hover:scale-105 shadow-lg disabled:shadow-none flex items-center justify-center gap-2 text-lg"
          >
            {loading ? (
              <>
                <span>⏳</span>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>🔓</span>
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-2 border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-white text-gray-600 font-semibold">or</span>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-700 font-medium">
          Don't have an account?{' '}
          <Link 
            to="/register" 
            className="text-blue-600 hover:text-blue-700 font-bold text-lg underline decoration-2 decoration-blue-300 hover:decoration-blue-500 transition"
          >
            Register here
          </Link>
        </p>

        {/* Bottom decoration */}
        <div className="mt-8 pt-6 border-t-2 border-gray-200 text-center">
          <p className="text-gray-500 text-xs font-semibold">✨ Secure Payment Processing ✨</p>
        </div>
      </div>
    </div>
  );
};
