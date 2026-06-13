'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Edit2, Trash2, Calendar, CheckCircle, Receipt, Loader2 } from 'lucide-react';
import EditExpenseModal from '@/components/EditExpenseModal';
import ExpenseChat from '@/components/ExpenseChat';

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
  user?: {
    id: number;
    email: string;
    displayName: string | null;
  };
}

interface Payment {
  id: number;
  userId: number;
  amount: string;
  user?: {
    id: number;
    email: string;
    displayName: string | null;
  };
}

interface LedgerItem {
  id: number;
  description?: string;
  amount: string;
  currency: string;
  paidById?: number | null;
  splitType?: string;
  createdAt: Date | string;
  ledgerType: 'expense' | 'settlement';
  paidBy?: {
    id: number;
    email: string;
    displayName: string | null;
  } | null;
  splits?: Split[];
  payments?: Payment[];
  payerId?: number;
  payeeId?: number;
  payer?: {
    id: number;
    email: string;
    displayName: string | null;
  } | null;
  payee?: {
    id: number;
    email: string;
    displayName: string | null;
  } | null;
}

interface GroupLedgerProps {
  initialFeed: LedgerItem[];
  groupId: number;
  members: Member[];
  currentDbUserId: number;
}

export default function GroupLedger({
  initialFeed,
  groupId,
  members,
  currentDbUserId,
}: GroupLedgerProps) {
  const router = useRouter();
  const [activeMenuId, setActiveMenuId] = useState<number | null>(null);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const formatAmount = (value: string | number, curr: string) => {
    const num = parseFloat(value.toString());
    const symbol = curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : curr === 'INR' ? '₹' : '$';
    return `${symbol}${num.toFixed(2)}`;
  };

  const toggleMenu = (itemId: number) => {
    setActiveMenuId(activeMenuId === itemId ? null : itemId);
  };

  const handleDelete = async (expenseId: number) => {
    if (!confirm('Are you sure you want to delete this expense? This will recalculate group balances.')) return;

    setDeletingId(expenseId);
    try {
      const res = await fetch(`/api/groups/${groupId}/expenses/${expenseId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.refresh();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete expense');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while deleting the expense.');
    } finally {
      setDeletingId(null);
      setActiveMenuId(null);
    }
  };

  const formatDateTime = (dateInput: Date | string) => {
    return new Date(dateInput).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-slate-800 dark:text-slate-100">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6 flex items-center gap-2 border-b border-slate-300 dark:border-slate-800 pb-3">
        <Receipt className="w-5 h-5 text-[#5bc5a7]" />
        <span className="uppercase tracking-wide text-sm">Group Activity Ledger</span>
      </h2>

      {initialFeed.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 sm:p-16 border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <Receipt className="w-12 h-12 text-slate-400 mb-4" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">No activity logged yet</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 max-w-sm leading-relaxed">
            Every shared purchase or manual settlement registered will appear here in chronological order.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {initialFeed.map((item) => {
            if (item.ledgerType === 'settlement') {
              return (
                <div
                  key={`settlement-${item.id}`}
                  className="p-4 border border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/10 dark:bg-emerald-950/10 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug">
                        Cash Settlement Recorded
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
                        <strong>
                          {item.payer?.displayName || item.payer?.email.split('@')[0]}
                        </strong>{' '}
                        paid{' '}
                        <strong>
                          {item.payee?.displayName || item.payee?.email.split('@')[0]}
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                      {formatAmount(item.amount, item.currency)}
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold flex items-center justify-end gap-1">
                      <Calendar className="w-3 h-3" />
                      <span suppressHydrationWarning>
                        {formatDateTime(item.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }

            // Render Expense Row
            const isMultiPaid = item.paidById === null;
            const payerName = isMultiPaid
              ? 'multiple contributors'
              : item.paidBy?.displayName || item.paidBy?.email.split('@')[0] || 'someone';

            return (
              <div
                key={`expense-${item.id}`}
                className="p-4 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50/30 dark:hover:bg-slate-850/20 transition-all duration-150 flex flex-col gap-3 relative"
              >
                {/* Top Row: Description, Amount, Date, Dropdown */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-snug truncate">
                      {item.description}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                      <span>
                        Paid by <strong className="text-slate-700 dark:text-slate-300">{payerName}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">•</span>
                      <span className="capitalize">{item.splitType?.toLowerCase()} split</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        {formatAmount(item.amount, item.currency)}
                      </div>
                      <div className="text-[10px] text-slate-450 dark:text-slate-500 mt-1 font-semibold flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        <span suppressHydrationWarning>
                          {formatDateTime(item.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Context menu trigger (three dots) */}
                    <div className="relative">
                      <button
                        onClick={() => toggleMenu(item.id)}
                        disabled={deletingId === item.id}
                        className="p-1 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                        ) : (
                          <MoreVertical className="w-4 h-4" />
                        )}
                      </button>

                      {activeMenuId === item.id && (
                        <div className="absolute right-0 mt-1 w-28 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 py-1 z-15 select-none shadow-sm animate-in fade-in duration-100 text-slate-800 dark:text-slate-100">
                          <button
                            onClick={() => {
                              setEditingExpense(item);
                              setActiveMenuId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left font-semibold cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#ff652f] hover:bg-red-50 dark:hover:bg-red-950/20 text-left font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#ff652f]" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Collapsible details: Splits & Realtime Chat */}
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 p-3 mt-1">
                  <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    Contributors & Splits Breakdown
                  </span>
                  
                  {isMultiPaid && (
                    <div className="mb-2.5 pb-2 border-b border-slate-300 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                      <span className="font-semibold text-slate-600 dark:text-slate-300 block">Payments Log:</span>
                      {item.payments?.map((payment) => (
                        <span key={payment.id} className="inline-block bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-1.5 py-0.5 mr-1.5 font-medium text-slate-700 dark:text-slate-300">
                          {payment.user?.displayName || payment.user?.email.split('@')[0]}: {formatAmount(payment.amount, item.currency)}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 border-b border-slate-300 dark:border-slate-800 pb-3 mb-2">
                    {item.splits?.map((split) => {
                      const userPay = item.payments?.find((p) => p.userId === split.userId);
                      const paidAmt = userPay ? parseFloat(userPay.amount) : 0;
                      const oweAmt = parseFloat(split.amount || '0');
                      const netCost = paidAmt - oweAmt;

                      return (
                        <div key={split.id} className="flex justify-between items-center text-xs">
                          <span className="text-slate-600 dark:text-slate-400 truncate mr-2">
                            {split.user?.displayName || split.user?.email.split('@')[0]}
                          </span>
                          <span
                            className={`font-semibold shrink-0 ${
                              netCost > 0
                                ? 'text-[#5bc5a7]'
                                : netCost < 0
                                ? 'text-[#ff652f]'
                                : 'text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {netCost > 0
                              ? `lent ${formatAmount(netCost, item.currency)}`
                              : netCost < 0
                              ? `owes ${formatAmount(Math.abs(netCost), item.currency)}`
                              : 'settled'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Realtime Comments Section */}
                  <ExpenseChat expenseId={item.id} currentDbUserId={currentDbUserId} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit modal display */}
      {editingExpense && (
        <EditExpenseModal
          isOpen={true}
          onClose={() => setEditingExpense(null)}
          groupId={groupId}
          expense={editingExpense}
          members={members}
          currentDbUserId={currentDbUserId}
        />
      )}
    </div>
  );
}
