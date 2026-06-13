import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { users, groupMembers, expenses, settlements } from '@/db/schema';
import { eq, or, and, inArray } from 'drizzle-orm';
import { ensureUserSynced } from '@/utils/db/user-sync';
import Link from 'next/link';
import SettleUpModal from '@/components/SettleUpModal';
import { ArrowLeft, User, Coins, Calendar, CheckCircle, Receipt } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FriendDetailPage({ params }: PageProps) {
  const { id } = await params;
  const friendId = parseInt(id, 10);

  if (isNaN(friendId)) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure current user profile is synced
  const dbUser = await ensureUserSynced(
    user.id,
    user.email!,
    user.user_metadata?.displayName || user.user_metadata?.display_name || user.email!.split('@')[0],
    user.user_metadata?.avatar_url
  );

  if (dbUser.id === friendId) {
    redirect('/dashboard');
  }

  // Fetch the friend's details
  const friend = await db.query.users.findFirst({
    where: eq(users.id, friendId),
  });

  if (!friend) {
    redirect('/dashboard');
  }

  const friendName = friend.displayName || friend.email.split('@')[0];

  // Fetch all shared groups
  const uMemberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, dbUser.id));

  const fMemberships = await db
    .select({ groupId: groupMembers.groupId })
    .from(groupMembers)
    .where(eq(groupMembers.userId, friendId));

  const uGroupIds = uMemberships.map((m) => m.groupId);
  const sharedGroupIds = fMemberships
    .map((m) => m.groupId)
    .filter((gid) => uGroupIds.includes(gid));

  // Fetch expenses in shared groups
  const sharedExpenses = sharedGroupIds.length > 0
    ? await db.query.expenses.findMany({
        where: inArray(expenses.groupId, sharedGroupIds),
        with: {
          splits: {
            with: {
              user: true,
            },
          },
          payments: {
            with: {
              user: true,
            },
          },
          paidBy: true,
        },
        orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
      })
    : [];

  // Fetch direct settlements between current user and this friend
  const directSettlements = await db.query.settlements.findMany({
    where: or(
      and(eq(settlements.payerId, dbUser.id), eq(settlements.payeeId, friend.id)),
      and(eq(settlements.payerId, friend.id), eq(settlements.payeeId, dbUser.id))
    ),
    with: {
      payer: true,
      payee: true,
    },
    orderBy: (settlements, { desc }) => [desc(settlements.createdAt)],
  });

  // Calculate 1-on-1 balance
  let balance = 0; // positive = friend owes U, negative = U owes friend

  // Filter shared expenses to those involving both users
  const mutualExpenses = sharedExpenses.filter((exp) => {
    const totalAmt = parseFloat(exp.amount);
    if (totalAmt <= 0) return false;

    // U's details
    const uPayment = exp.payments?.find((p) => p.userId === dbUser.id);
    const uPaid = uPayment ? parseFloat(uPayment.amount) : (!exp.payments || exp.payments.length === 0) && exp.paidById === dbUser.id ? totalAmt : 0;
    const uSplit = exp.splits?.find((s) => s.userId === dbUser.id);
    const uOwe = uSplit ? parseFloat(uSplit.amount || '0') : 0;

    // F's details
    const fPayment = exp.payments?.find((p) => p.userId === friend.id);
    const fPaid = fPayment ? parseFloat(fPayment.amount) : (!exp.payments || exp.payments.length === 0) && exp.paidById === friend.id ? totalAmt : 0;
    const fSplit = exp.splits?.find((s) => s.userId === friend.id);
    const fOwe = fSplit ? parseFloat(fSplit.amount || '0') : 0;

    const involved = uPaid > 0 || uOwe > 0 || fPaid > 0 || fOwe > 0;
    if (involved) {
      // Add contribution share debts
      const fOwesU = fOwe * (uPaid / totalAmt);
      const uOwesF = uOwe * (fPaid / totalAmt);
      balance += (fOwesU - uOwesF);
      return true;
    }
    return false;
  });

  // Add settlement entries
  directSettlements.forEach((s) => {
    const amt = parseFloat(s.amount);
    if (s.payerId === dbUser.id && s.payeeId === friend.id) {
      balance += amt;
    } else if (s.payerId === friend.id && s.payeeId === dbUser.id) {
      balance -= amt;
    }
  });

  // Merge feeds chronologically
  const feedItems = [
    ...mutualExpenses.map((e) => ({ ...e, ledgerType: 'expense' as const })),
    ...directSettlements.map((s) => ({ ...s, ledgerType: 'settlement' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Members list for Settle Up modal
  const settleUpMembers = [
    { id: dbUser.id, displayName: dbUser.displayName, email: dbUser.email },
    { id: friend.id, displayName: friend.displayName, email: friend.email },
  ];

  return (
    <div className="relative flex-1 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full text-slate-800">
      {/* Back button */}
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition duration-200 font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 pb-6 border-b border-slate-300 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-[#5bc5a7]/10 text-[#5bc5a7] border border-[#5bc5a7]/20 flex items-center justify-center font-bold text-xl">
            {friendName[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{friendName}</h1>
            <p className="text-xs text-slate-500">{friend.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <SettleUpModal
            members={settleUpMembers}
            currentDbUserId={dbUser.id}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left/Middle Pane: Shared Activity */}
        <div className="md:col-span-2 space-y-6">
          <div className="border border-slate-300 bg-white p-6">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-6 flex items-center gap-2 border-b border-slate-300 pb-3">
              <Receipt className="w-4 h-4 text-[#5bc5a7]" />
              <span>Shared Transactions Feed</span>
            </h2>

            {feedItems.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-50 border border-dashed border-slate-300">
                <Receipt className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                <p className="font-bold text-slate-700 text-xs">No shared transactions</p>
                <p className="text-[10px] mt-0.5">Expenses and settlements you share will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {feedItems.map((item) => {
                  if (item.ledgerType === 'settlement') {
                    const isPayerMe = item.payerId === dbUser.id;
                    return (
                      <div
                        key={`settlement-${item.id}`}
                        className="p-4 border border-emerald-200 bg-emerald-50/10 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-200">
                            <CheckCircle className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm leading-snug">
                              Direct Payment
                            </h4>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">
                              {isPayerMe ? 'You' : friendName} paid {isPayerMe ? friendName : 'you'}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-emerald-600">
                            ${parseFloat(item.amount).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center justify-end gap-1">
                            <Calendar className="w-3 h-3" />
                            <span suppressHydrationWarning>
                              {new Date(item.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Render Expense row
                  const isMultiPaid = item.paidById === null;
                  const payersText = isMultiPaid
                    ? 'multiple contributors'
                    : item.paidById === dbUser.id
                    ? 'you'
                    : friendName;

                  const splitMe = item.splits?.find((s) => s.userId === dbUser.id);
                  const payMe = item.payments?.find((p) => p.userId === dbUser.id);
                  const oweAmt = splitMe ? parseFloat(splitMe.amount || '0') : 0;
                  const paidAmt = payMe ? parseFloat(payMe.amount) : (!item.payments || item.payments.length === 0) && item.paidById === dbUser.id ? parseFloat(item.amount) : 0;
                  const netCost = paidAmt - oweAmt;

                  return (
                    <div
                      key={`expense-${item.id}`}
                      className="p-4 border border-slate-300 bg-white flex flex-col gap-2"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm leading-snug">
                            {item.description}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Paid by <strong className="text-slate-700">{payersText}</strong>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-extrabold text-slate-900">
                            ${parseFloat(item.amount).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-1 font-semibold flex items-center justify-end gap-1">
                            <Calendar className="w-3 h-3" />
                            <span suppressHydrationWarning>
                              {new Date(item.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-2.5 flex justify-between items-center text-xs">
                        <span className="text-slate-500">Your Share:</span>
                        <span
                          className={`font-semibold ${
                            netCost > 0
                              ? 'text-[#5bc5a7]'
                              : netCost < 0
                              ? 'text-[#ff652f]'
                              : 'text-slate-500'
                          }`}
                        >
                          {netCost > 0
                            ? `you lent $${netCost.toFixed(2)}`
                            : netCost < 0
                            ? `you owe $${Math.abs(netCost).toFixed(2)}`
                            : 'settled'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Pane: 1-on-1 Balance summary */}
        <div className="space-y-6">
          <div className="border border-slate-300 bg-white p-6">
            <h2 className="text-sm font-bold text-slate-905 text-slate-900 uppercase tracking-wide mb-4 flex items-center gap-2 border-b border-slate-300 pb-3">
              <Coins className="w-4 h-4 text-[#5bc5a7]" />
              <span>1-on-1 Balance</span>
            </h2>

            <div className={`p-4 border text-center ${
              balance > 0.005
                ? 'bg-emerald-50/20 border-emerald-200 text-[#5bc5a7]'
                : balance < -0.005
                ? 'bg-rose-50/20 border-rose-200 text-[#ff652f]'
                : 'bg-slate-50 border-slate-300 text-slate-700'
            }`}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-550 mb-1 text-slate-500">
                {balance > 0.005 ? `${friendName} owes you` : balance < -0.005 ? `You owe ${friendName}` : 'Settled balance'}
              </p>
              <p className="text-2xl font-extrabold">
                ${Math.abs(balance).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
