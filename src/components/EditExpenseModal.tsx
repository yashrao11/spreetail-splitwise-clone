'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Loader2, DollarSign, Calculator, AlertCircle } from 'lucide-react';

interface Member {
  id: number;
  displayName: string | null;
  email: string;
}

interface Split {
  id: number;
  userId: number;
  amount: string | null;
  percent: string | null;
  share: string | null;
}

interface Payment {
  id: number;
  userId: number;
  amount: string;
}

interface Expense {
  id: number;
  description: string;
  amount: string;
  currency: string;
  paidById: number | null;
  splitType: string;
  splits: Split[];
  payments: Payment[];
}

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: number;
  expense: Expense;
  members: Member[];
  currentDbUserId: number;
}

type SplitType = 'EQUAL' | 'UNEQUAL' | 'PERCENTAGE' | 'SHARE';

export default function EditExpenseModal({
  isOpen,
  onClose,
  groupId,
  expense,
  members,
  currentDbUserId,
}: EditExpenseModalProps) {
  const router = useRouter();
  const [description, setDescription] = useState(expense.description);
  const [amount, setAmount] = useState(expense.amount);
  const [currency, setCurrency] = useState(expense.currency);
  const [splitType, setSplitType] = useState<SplitType>(expense.splitType as SplitType);

  // Who Paid configuration
  const [whoPaidSelect, setWhoPaidSelect] = useState<string>(
    expense.paidById === null ? 'multiple' : String(expense.paidById)
  );
  const [payerContributions, setPayerContributions] = useState<Record<number, string>>({});

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Split inputs
  const [exactAmounts, setExactAmounts] = useState<Record<number, string>>({});
  const [percentages, setPercentages] = useState<Record<number, string>>({});
  const [shares, setShares] = useState<Record<number, string>>({});

  // Prefill inputs when expense changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDescription(expense.description);
      setAmount(expense.amount);
      setCurrency(expense.currency);
      setSplitType(expense.splitType as SplitType);
      setWhoPaidSelect(expense.paidById === null ? 'multiple' : String(expense.paidById));
      setErrorMsg(null);

      const initialExact: Record<number, string> = {};
      const initialPercent: Record<number, string> = {};
      const initialShares: Record<number, string> = {};
      const initialContribs: Record<number, string> = {};

      members.forEach((m) => {
        initialExact[m.id] = '';
        initialPercent[m.id] = '';
        initialShares[m.id] = '1';
        initialContribs[m.id] = '';
      });

      expense.payments?.forEach((p) => {
        initialContribs[p.userId] = parseFloat(p.amount).toFixed(2);
      });

      expense.splits?.forEach((s) => {
        if (s.amount) initialExact[s.userId] = parseFloat(s.amount).toFixed(2);
        if (s.percent) initialPercent[s.userId] = parseFloat(s.percent).toString();
        if (s.share) initialShares[s.userId] = parseFloat(s.share).toString();
      });

      setExactAmounts(initialExact);
      setPercentages(initialPercent);
      setShares(initialShares);
      setPayerContributions(initialContribs);
    }
  }, [isOpen, expense, members]);

  const totalAmountVal = parseFloat(amount) || 0;
  const isMultiPayer = whoPaidSelect === 'multiple';

  // Calculators
  const getExactTotal = () => {
    return Object.values(exactAmounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const getPercentTotal = () => {
    return Object.values(percentages).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const getSharesTotal = () => {
    return Object.values(shares).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const getPayerContributionsTotal = () => {
    return Object.values(payerContributions).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  const handleExactChange = (memberId: number, value: string) => {
    setExactAmounts((prev) => ({ ...prev, [memberId]: value }));
  };

  const handlePercentChange = (memberId: number, value: string) => {
    setPercentages((prev) => ({ ...prev, [memberId]: value }));
  };

  const handleShareChange = (memberId: number, value: string) => {
    setShares((prev) => ({ ...prev, [memberId]: value }));
  };

  // Split mapping builders
  const buildEqualSplits = () => {
    const count = members.length;
    if (count === 0) return [];
    const baseCents = Math.floor((totalAmountVal * 100) / count);
    const remainderCents = Math.round(totalAmountVal * 100) - baseCents * count;

    return members.map((m, i) => {
      let cents = baseCents;
      if (i === count - 1) {
        cents += remainderCents;
      }
      return {
        userId: m.id,
        amount: (cents / 100).toFixed(2),
        percent: (100 / count).toFixed(2),
        share: '1.00',
      };
    });
  };

  const buildExactSplits = () => {
    return members.map((m) => {
      const amt = parseFloat(exactAmounts[m.id]) || 0;
      return {
        userId: m.id,
        amount: amt.toFixed(2),
        percent: totalAmountVal > 0 ? ((amt / totalAmountVal) * 100).toFixed(2) : '0.00',
        share: null,
      };
    });
  };

  const buildPercentSplits = () => {
    let allocatedCents = 0;
    const totalCents = Math.round(totalAmountVal * 100);

    return members.map((m, i) => {
      const pct = parseFloat(percentages[m.id]) || 0;
      let cents = Math.floor((totalCents * pct) / 100);

      if (i === members.length - 1) {
        cents = totalCents - allocatedCents;
      } else {
        allocatedCents += cents;
      }

      return {
        userId: m.id,
        amount: (cents / 100).toFixed(2),
        percent: pct.toFixed(2),
        share: null,
      };
    });
  };

  const buildShareSplits = () => {
    const totalShares = getSharesTotal();
    let allocatedCents = 0;
    const totalCents = Math.round(totalAmountVal * 100);

    return members.map((m, i) => {
      const sh = parseFloat(shares[m.id]) || 0;
      let cents = totalShares > 0 ? Math.floor((totalCents * sh) / totalShares) : 0;

      if (i === members.length - 1) {
        cents = totalCents - allocatedCents;
      } else {
        allocatedCents += cents;
      }

      return {
        userId: m.id,
        amount: (cents / 100).toFixed(2),
        percent: totalAmountVal > 0 ? (((cents / 100) / totalAmountVal) * 100).toFixed(2) : '0.00',
        share: sh.toFixed(2),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      setErrorMsg('Description is required.');
      return;
    }

    if (totalAmountVal <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }

    // Payer validation
    let finalPaymentsList: { userId: number; amount: string }[] = [];
    let paidById: number | null = null;

    if (isMultiPayer) {
      const totalPaid = getPayerContributionsTotal();
      if (Math.abs(totalPaid - totalAmountVal) >= 0.01) {
        setErrorMsg(`Total paid ($${totalPaid.toFixed(2)}) must equal total expense amount ($${totalAmountVal.toFixed(2)}).`);
        return;
      }
      finalPaymentsList = Object.entries(payerContributions)
        .map(([userId, val]) => ({
          userId: parseInt(userId, 10),
          amount: (parseFloat(val) || 0).toFixed(2),
        }))
        .filter((p) => parseFloat(p.amount) > 0);
    } else {
      paidById = parseInt(whoPaidSelect, 10);
      finalPaymentsList = [
        {
          userId: paidById,
          amount: totalAmountVal.toFixed(2),
        },
      ];
    }

    // Splits validation
    let splitsList: any[] = [];

    if (splitType === 'EQUAL') {
      splitsList = buildEqualSplits();
    } else if (splitType === 'UNEQUAL') {
      const totalAllocated = getExactTotal();
      if (Math.abs(totalAllocated - totalAmountVal) >= 0.01) {
        setErrorMsg(`Splits sum ($${totalAllocated.toFixed(2)}) must equal total amount ($${totalAmountVal.toFixed(2)}).`);
        return;
      }
      splitsList = buildExactSplits();
    } else if (splitType === 'PERCENTAGE') {
      const totalPct = getPercentTotal();
      if (Math.abs(totalPct - 100) >= 0.01) {
        setErrorMsg(`Percentages sum (${totalPct.toFixed(2)}%) must equal exactly 100%.`);
        return;
      }
      splitsList = buildPercentSplits();
    } else if (splitType === 'SHARE') {
      const totalShares = getSharesTotal();
      if (totalShares <= 0) {
        setErrorMsg('Total shares weight must be greater than zero.');
        return;
      }
      splitsList = buildShareSplits();
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expense.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
          amount: totalAmountVal.toFixed(2),
          currency,
          paidById,
          splitType,
          splitsList,
          paymentsList: finalPaymentsList,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save changes.');
      } else {
        onClose();
        router.refresh();
      }
    } catch (err) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (curr: string) => {
    switch (curr) {
      case 'EUR':
        return '€';
      case 'GBP':
        return '£';
      case 'INR':
        return '₹';
      default:
        return '$';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-300 p-6 sm:p-8 overflow-hidden text-slate-800 my-8 max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 transition duration-150 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="shrink-0 mb-4 border-b border-slate-300 pb-3">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#5bc5a7]" />
            <span>Edit Expense</span>
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Modify this shared bill, re-assign splits, or update contributors.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Description
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="block w-full px-3 py-2.5 border border-slate-300 bg-white text-slate-805 text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5bc5a7] text-sm"
                placeholder="e.g. Flight ticket"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <span className="text-sm font-semibold">{getCurrencySymbol(currency)}</span>
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="block w-full pl-8 pr-3 py-2 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5bc5a7] text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                  Currency
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="block w-full px-2 py-2 border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#5bc5a7] text-sm cursor-pointer"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="INR">INR (₹)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Who Paid?
              </label>
              <select
                value={whoPaidSelect}
                onChange={(e) => setWhoPaidSelect(e.target.value)}
                className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 focus:outline-none focus:border-[#5bc5a7] text-sm transition-all cursor-pointer"
              >
                {members.map((m) => (
                  <option key={m.id} value={String(m.id)}>
                    {m.displayName || m.email.split('@')[0]}
                  </option>
                ))}
                <option value="multiple">Multiple People...</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Split Method
              </label>
              <div className="flex bg-slate-100 p-0.5 border border-slate-300">
                <button
                  type="button"
                  onClick={() => setSplitType('EQUAL')}
                  className={`flex-1 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    splitType === 'EQUAL' ? 'bg-white text-slate-900 border border-slate-300' : 'text-slate-500'
                  }`}
                >
                  Equal
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('UNEQUAL')}
                  className={`flex-1 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    splitType === 'UNEQUAL' ? 'bg-white text-slate-900 border border-slate-300' : 'text-slate-500'
                  }`}
                >
                  Exact
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('PERCENTAGE')}
                  className={`flex-1 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    splitType === 'PERCENTAGE' ? 'bg-white text-slate-900 border border-slate-300' : 'text-slate-500'
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('SHARE')}
                  className={`flex-1 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                    splitType === 'SHARE' ? 'bg-white text-slate-900 border border-slate-300' : 'text-slate-500'
                  }`}
                >
                  Shares
                </button>
              </div>
            </div>
          </div>

          {/* Multi-payer panel */}
          {isMultiPayer && (
            <div className="border border-slate-300 bg-slate-50/50 p-4 space-y-3">
              <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Multi-Payer Contributions ({currency})
              </span>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-2">
                <span>Total Paid: {getCurrencySymbol(currency)}{getPayerContributionsTotal().toFixed(2)}</span>
                <span className={Math.abs(getPayerContributionsTotal() - totalAmountVal) < 0.01 ? 'text-[#5bc5a7]' : 'text-[#ff652f]'}>
                  Remaining: {getCurrencySymbol(currency)}{(totalAmountVal - getPayerContributionsTotal()).toFixed(2)}
                </span>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 bg-white p-2 border border-slate-300">
                    <span className="text-xs font-bold text-slate-700 truncate">{m.displayName || m.email.split('@')[0]}</span>
                    <div className="relative w-32 shrink-0">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                        {getCurrencySymbol(currency)}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={payerContributions[m.id] || ''}
                        onChange={(e) => setPayerContributions({ ...payerContributions, [m.id]: e.target.value })}
                        placeholder="0.00"
                        className="block w-full pl-6 pr-2 py-1 text-xs border border-slate-300 bg-white text-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Splitting Inputs Section */}
          <div className="border border-slate-300 bg-slate-50/50 p-4 max-h-56 overflow-y-auto space-y-3">
            <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Ledger Details
            </span>

            {splitType === 'EQUAL' && (
              <div className="text-xs text-slate-655 text-slate-600 leading-relaxed bg-white border border-slate-300 p-3">
                Splitting equally among all <strong>{members.length}</strong> room members.
                {totalAmountVal > 0 && (
                  <span className="block mt-1 text-slate-800">
                    Calculated cost per member:{' '}
                    <strong>{getCurrencySymbol(currency)}{(totalAmountVal / members.length).toFixed(2)}</strong>
                  </span>
                )}
              </div>
            )}

            {splitType === 'UNEQUAL' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-2">
                  <span>Exact Amount Assigned: {getCurrencySymbol(currency)}{getExactTotal().toFixed(2)}</span>
                  <span className={Math.abs(getExactTotal() - totalAmountVal) < 0.01 ? 'text-[#5bc5a7]' : 'text-[#ff652f]'}>
                    Remaining: {getCurrencySymbol(currency)}{(totalAmountVal - getExactTotal()).toFixed(2)}
                  </span>
                </div>
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 bg-white p-2 border border-slate-300">
                    <span className="text-xs font-bold text-slate-700 truncate">{m.displayName || m.email.split('@')[0]}</span>
                    <div className="relative w-32 shrink-0">
                      <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                        {getCurrencySymbol(currency)}
                      </div>
                      <input
                        type="number"
                        step="0.01"
                        value={exactAmounts[m.id] || ''}
                        onChange={(e) => handleExactChange(m.id, e.target.value)}
                        placeholder="0.00"
                        className="block w-full pl-6 pr-2 py-1 text-xs border border-slate-300 bg-white text-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {splitType === 'PERCENTAGE' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-2">
                  <span>Total Percentage Assigned: {getPercentTotal().toFixed(2)}%</span>
                  <span className={Math.abs(getPercentTotal() - 100) < 0.01 ? 'text-[#5bc5a7]' : 'text-[#ff652f]'}>
                    Remaining: {(100 - getPercentTotal()).toFixed(2)}%
                  </span>
                </div>
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 bg-white p-2 border border-slate-300">
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {m.displayName || m.email.split('@')[0]}
                      {totalAmountVal > 0 && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Calculated: {getCurrencySymbol(currency)}{(totalAmountVal * (parseFloat(percentages[m.id]) || 0) / 100).toFixed(2)}
                        </span>
                      )}
                    </span>
                    <div className="relative w-28 shrink-0">
                      <input
                        type="number"
                        step="0.01"
                        value={percentages[m.id] || ''}
                        onChange={(e) => handlePercentChange(m.id, e.target.value)}
                        placeholder="0.00"
                        className="block w-full pr-6 pl-2 py-1 text-xs text-right border border-slate-300 bg-white text-slate-850 text-slate-800"
                      />
                      <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none text-slate-400 text-xs font-bold">
                        %
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {splitType === 'SHARE' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mb-2">
                  <span>Total Shares Weight: {getSharesTotal().toFixed(2)}</span>
                </div>
                {members.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 bg-white p-2 border border-slate-300">
                    <span className="text-xs font-bold text-slate-700 truncate">
                      {m.displayName || m.email.split('@')[0]}
                      {totalAmountVal > 0 && getSharesTotal() > 0 && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Calculated: {getCurrencySymbol(currency)}{(totalAmountVal * (parseFloat(shares[m.id]) || 0) / getSharesTotal()).toFixed(2)}
                        </span>
                      )}
                    </span>
                    <div className="w-24 shrink-0">
                      <input
                        type="number"
                        step="1"
                        value={shares[m.id] || ''}
                        onChange={(e) => handleShareChange(m.id, e.target.value)}
                        placeholder="1"
                        className="block w-full px-2 py-1 text-xs text-right border border-slate-300 bg-white text-slate-800"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Errors Display */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-[#ff652f] text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-300 mt-6 shrink-0">
            <button
              type="button"
              onClick={onClose}
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
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
