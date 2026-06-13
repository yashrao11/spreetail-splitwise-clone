'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DollarSign, X, Loader2, ArrowRight, Smartphone, CreditCard, ShieldCheck } from 'lucide-react';

interface SettlementMember {
  id: number;
  displayName: string | null;
  email: string;
}

interface SettleUpModalProps {
  groupId?: number | null;
  members: SettlementMember[];
  currentDbUserId: number;
  defaultCurrency?: string;
}

export default function SettleUpModal({
  groupId = null,
  members,
  currentDbUserId,
  defaultCurrency = 'USD',
}: SettleUpModalProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  
  // Tab selector: 'cash' | 'online'
  const [method, setMethod] = useState<'cash' | 'online'>('cash');
  
  const [payerId, setPayerId] = useState<number>(currentDbUserId);
  const [payeeId, setPayeeId] = useState<number>(() => {
    const other = members.find((m) => m.id !== currentDbUserId);
    return other ? other.id : currentDbUserId;
  });
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(defaultCurrency);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (payerId === payeeId) {
      setErrorMsg('The payer and payee cannot be the same person.');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid positive settlement amount.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId,
          payerId,
          payeeId,
          amount: parsedAmount.toFixed(2),
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to record settlement.');
      } else {
        setAmount('');
        setIsOpen(false);
        router.refresh();
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const triggerPlaceholder = (gateway: string) => {
    if (typeof window !== 'undefined') {
      alert(`🚀 ${gateway} Integration Coming Soon in Phase 3!`);
    }
  };

  const payer = members.find((m) => m.id === payerId);
  const payee = members.find((m) => m.id === payeeId);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 transition duration-150 cursor-pointer"
      >
        <DollarSign className="w-4 h-4 text-[#5bc5a7]" />
        <span>Settle Up</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-white border border-slate-300 p-6 sm:p-8 overflow-hidden text-slate-805 text-slate-800 animate-fade-in">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 transition duration-150 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-4">
              Settle Up
            </h3>

            {/* Toggle tabs */}
            <div className="flex bg-slate-100 p-0.5 border border-slate-350 border-slate-300 mb-6 select-none">
              <button
                type="button"
                onClick={() => setMethod('cash')}
                className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer ${
                  method === 'cash' ? 'bg-white text-slate-900 border border-slate-300' : 'text-slate-500'
                }`}
              >
                Record Cash Payment
              </button>
              <button
                type="button"
                onClick={() => setMethod('online')}
                className={`flex-1 py-2 text-xs font-bold transition-all cursor-pointer ${
                  method === 'online' ? 'bg-white text-slate-900 border border-slate-300' : 'text-slate-500'
                }`}
              >
                Online Payment
              </button>
            </div>

            {method === 'online' ? (
              /* Online payment placeholders */
              <div className="space-y-4">
                <p className="text-xs text-slate-500 mb-4 text-center leading-relaxed">
                  Settle balances instantly using one of our verified digital transaction gateways.
                </p>

                <button
                  type="button"
                  onClick={() => triggerPlaceholder('UPI Transfer')}
                  className="w-full py-3 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <Smartphone className="w-4 h-4 text-[#5bc5a7]" />
                  <span>Pay via UPI</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPlaceholder('Razorpay Checkout')}
                  className="w-full py-3 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <ShieldCheck className="w-4 h-4 text-[#5bc5a7]" />
                  <span>Pay via Razorpay</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerPlaceholder('Credit Card Merchant')}
                  className="w-full py-3 border border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <CreditCard className="w-4 h-4 text-[#5bc5a7]" />
                  <span>Pay via Credit Card</span>
                </button>

                <div className="pt-4 border-t border-slate-100 flex justify-end mt-6">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition duration-150 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Record Cash Payment Form */
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-300 text-xs font-bold text-slate-600">
                  <span className="truncate">
                    {payer?.displayName || payer?.email.split('@')[0] || 'Someone'}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#5bc5a7] shrink-0" />
                  <span className="truncate">
                    {payee?.displayName || payee?.email.split('@')[0] || 'Someone'}
                  </span>
                </div>

                {/* Payer selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Who Paid?
                  </label>
                  <select
                    value={payerId}
                    onChange={(e) => setPayerId(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#5bc5a7] text-sm cursor-pointer"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === currentDbUserId ? 'You' : m.displayName || m.email.split('@')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payee selection */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                    Who Received?
                  </label>
                  <select
                    value={payeeId}
                    onChange={(e) => setPayeeId(Number(e.target.value))}
                    className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#5bc5a7] text-sm cursor-pointer"
                  >
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.id === currentDbUserId ? 'You' : m.displayName || m.email.split('@')[0]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount & Currency selection */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5bc5a7] text-sm"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#5bc5a7] text-sm cursor-pointer"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 bg-rose-50 border border-rose-250 border-rose-200 text-[#ff652f] text-xs font-semibold">
                    {errorMsg}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition duration-150 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2 px-5 text-xs font-bold text-white bg-[#5bc5a7] hover:bg-[#4bb597] transition duration-150 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Record Settlement'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
