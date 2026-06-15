'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email address is required');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'OTP sent successfully!');
        setStep(2);
      } else {
        toast.error(data.message || 'Failed to request OTP');
      }
    } catch (error) {
      console.error('Request OTP error:', error);
      toast.error('Failed to connect to authentication service');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      toast.error('All fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || 'Password reset successfully!');
        router.push('/signin');
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Failed to connect to authentication service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-gradient-to-b from-gray-100 to-white min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-auto px-4 sm:px-6">
        <div className="pt-32 pb-12 md:pt-40 md:pb-20">
          <div className="bg-white p-8 rounded-2xl border border-gray-150 shadow-lg space-y-6">
            
            {/* Header */}
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-800">
                {step === 1 ? 'Reset Your Password' : 'Verify OTP Code'}
              </h1>
              <p className="text-sm text-gray-500 mt-1.5">
                {step === 1 
                  ? "Enter your email address and we'll send you a secure One-Time Password (OTP)." 
                  : `Please check your inbox for an OTP code sent to: ${email}`}
              </p>
            </div>

            {/* Step 1: Request OTP Form */}
            {step === 1 && (
              <form onSubmit={handleRequestOtp} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1" htmlFor="email">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full text-gray-800 border-2 border-gray-200 focus:border-indigo-500 rounded-xl p-3 outline-none transition text-sm"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 text-white font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:bg-indigo-400 text-sm"
                >
                  {loading ? 'Sending OTP...' : 'Send Verification OTP'}
                </button>
              </form>
            )}

            {/* Step 2: Reset Password Form */}
            {step === 2 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1" htmlFor="otp">
                    OTP Verification Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="otp"
                    type="text"
                    maxLength="6"
                    className="w-full text-center text-gray-800 font-bold border-2 border-gray-200 focus:border-indigo-500 rounded-xl p-3 outline-none tracking-widest text-lg"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1" htmlFor="password">
                    New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="password"
                    type="password"
                    className="w-full text-gray-800 border-2 border-gray-200 focus:border-indigo-500 rounded-xl p-3 outline-none transition text-sm"
                    placeholder="Choose new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-700 text-sm font-semibold mb-1" htmlFor="confirm-password">
                    Confirm New Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    className="w-full text-gray-800 border-2 border-gray-200 focus:border-indigo-500 rounded-xl p-3 outline-none transition text-sm"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 text-white font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition disabled:bg-indigo-400 text-sm"
                  >
                    {loading ? 'Verifying...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-full py-2.5 text-indigo-600 hover:text-indigo-800 font-semibold bg-transparent hover:bg-gray-50 border border-gray-200 rounded-xl transition text-sm"
                  >
                    Back to Request
                  </button>
                </div>
              </form>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}
