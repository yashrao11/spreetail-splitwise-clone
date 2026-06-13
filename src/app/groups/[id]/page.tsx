import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { groups, groupMembers, expenses, settlements } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ensureUserSynced } from '@/utils/db/user-sync';
import Link from 'next/link';
import AddMemberModal from '@/components/AddMemberModal';
import AddExpenseModal from '@/components/AddExpenseModal';
import SettleUpModal from '@/components/SettleUpModal';
import ReminderButton from '@/components/ReminderButton';
import GroupLedger from '@/components/GroupLedger';
import { calculateGroupDebts } from '@/utils/math/debts';
import {
  ArrowLeft,
  Users,
  Calendar,
  Sparkles,
  Info,
  Coins,
} from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function GroupDetailsPage({ params }: PageProps) {
  const { id } = await params;
  const groupId = parseInt(id, 10);

  if (isNaN(groupId)) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Ensure user is synced in DB
  const dbUser = await ensureUserSynced(
    user.id,
    user.email!,
    user.user_metadata?.displayName || user.user_metadata?.display_name || user.email!.split('@')[0],
    user.user_metadata?.avatar_url
  );

  // Check group membership for security
  const membership = await db.query.groupMembers.findFirst({
    where: and(
      eq(groupMembers.groupId, groupId),
      eq(groupMembers.userId, dbUser.id)
    ),
  });

  if (!membership) {
    redirect('/dashboard');
  }

  // Fetch group details along with members
  const group = await db.query.groups.findFirst({
    where: eq(groups.id, groupId),
    with: {
      members: {
        with: {
          user: true,
        },
      },
    },
  });

  if (!group) {
    redirect('/dashboard');
  }

  // Fetch group expenses along with splits, payments, and payer profiles
  const groupExpenses = await db.query.expenses.findMany({
    where: eq(expenses.groupId, groupId),
    with: {
      paidBy: true,
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
    },
    orderBy: (expenses, { desc }) => [desc(expenses.createdAt)],
  });

  // Fetch group settlements
  const groupSettlements = await db.query.settlements.findMany({
    where: eq(settlements.groupId, groupId),
    with: {
      payer: true,
      payee: true,
    },
    orderBy: (settlements, { desc }) => [desc(settlements.createdAt)],
  });

  // Map members details
  const activeMembers = group.members.map((m) => ({
    id: m.user.id,
    displayName: m.user.displayName,
    email: m.user.email,
  }));

  // Calculate pairwise simplified debts inside this group
  const groupDebts = calculateGroupDebts(activeMembers, groupExpenses, groupSettlements);

  // Compute pairwise debts specifically for the current user's reminders
  const groupPairwiseDebts: Record<number, Record<number, number>> = {};
  const addGroupDebt = (debtor: number, creditor: number, amt: number) => {
    if (debtor === creditor) return;
    if (!groupPairwiseDebts[debtor]) groupPairwiseDebts[debtor] = {};
    if (!groupPairwiseDebts[debtor][creditor]) groupPairwiseDebts[debtor][creditor] = 0;
    groupPairwiseDebts[debtor][creditor] += amt;
  };

  groupExpenses.forEach((expense) => {
    const totalAmount = parseFloat(expense.amount);
    if (totalAmount <= 0) return;

    const paymentsList: { userId: number; amount: string }[] = (expense.payments && expense.payments.length > 0)
      ? expense.payments
      : expense.paidById
      ? [{ userId: expense.paidById, amount: expense.amount }]
      : [];

    paymentsList.forEach((payment) => {
      const payerId = payment.userId;
      const paidAmt = parseFloat(payment.amount);
      if (paidAmt <= 0) return;

      expense.splits.forEach((split) => {
        const splitterId = split.userId;
        const splitAmt = parseFloat(split.amount || '0');
        if (splitAmt <= 0) return;

        const lentAmt = splitAmt * (paidAmt / totalAmount);
        addGroupDebt(splitterId, payerId, lentAmt);
      });
    });
  });

  groupSettlements.forEach((settlement) => {
    const amt = parseFloat(settlement.amount);
    addGroupDebt(settlement.payerId, settlement.payeeId, -amt);
  });

  // Helper to format currency values
  const formatAmount = (value: string | number, curr: string) => {
    const num = parseFloat(value.toString());
    const symbol = curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : curr === 'INR' ? '₹' : '$';
    return `${symbol}${num.toFixed(2)}`;
  };

  // Combine expenses and settlements chronologically
  const ledgerFeed = [
    ...groupExpenses.map((e) => ({ ...e, ledgerType: 'expense' as const })),
    ...groupSettlements.map((s) => ({ ...s, ledgerType: 'settlement' as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="relative flex-1 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-slate-800">
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

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 pb-6 border-b border-slate-300 mb-8">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold bg-[#5bc5a7]/10 text-[#5bc5a7] border border-[#5bc5a7] mb-3">
            <Sparkles className="w-3 h-3" />
            <span>Share Room</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight sm:text-4xl">
            {group.name}
          </h1>
          {group.description && (
            <p className="text-sm text-slate-500 mt-2 max-w-2xl">{group.description}</p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3 shrink-0">
          <SettleUpModal
            groupId={group.id}
            members={activeMembers}
            currentDbUserId={dbUser.id}
            defaultCurrency={group.currency}
          />
          <AddMemberModal groupId={group.id} />
          <AddExpenseModal
            groupId={group.id}
            members={activeMembers}
            currentDbUserId={dbUser.id}
            defaultCurrency={group.currency}
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left/Middle Pane: Ledger Feed */}
        <div className="lg:col-span-3 space-y-6">
          <GroupLedger
            initialFeed={ledgerFeed as any[]}
            groupId={group.id}
            members={activeMembers}
            currentDbUserId={dbUser.id}
          />
        </div>

        {/* Right Pane: Room Meta, Group Balances, Members List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Group Balances Card */}
          <div className="border-2 border-slate-300 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-[#5bc5a7]" />
              <span>Group Balances</span>
            </h2>

            {groupDebts.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 border border-dashed border-slate-300">
                <p className="font-bold text-slate-700 text-xs">All settled up!</p>
                <p className="text-[10px] mt-0.5">No outstanding balances inside this room.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {groupDebts.map((debt, index) => {
                  const debtor = activeMembers.find((m) => m.id === debt.debtorId);
                  const creditor = activeMembers.find((m) => m.id === debt.creditorId);

                  const debtorName = debtor?.displayName || debtor?.email.split('@')[0] || 'Unknown';
                  const creditorName = creditor?.displayName || creditor?.email.split('@')[0] || 'Unknown';

                  return (
                    <div
                      key={index}
                      className="bg-slate-50 p-3 border border-slate-300 flex items-center justify-between gap-2 text-xs"
                    >
                      <div className="min-w-0">
                        <span className="font-bold text-slate-800">{debtorName}</span>
                        <span className="text-slate-500 mx-1">owes</span>
                        <span className="font-bold text-slate-800">{creditorName}</span>
                      </div>
                      <span className="font-extrabold text-[#5bc5a7] shrink-0">
                        {formatAmount(debt.amount, group.currency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Members list card */}
          <div className="border-2 border-slate-300 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#5bc5a7]" />
              <span>Room Members ({group.members.length})</span>
            </h2>

            <div className="space-y-3">
              {group.members.map((member) => {
                const owedByUToOther = groupPairwiseDebts[dbUser.id]?.[member.user.id] || 0;
                const owedByOtherToU = groupPairwiseDebts[member.user.id]?.[dbUser.id] || 0;
                const net = owedByOtherToU - owedByUToOther;

                const memberName = member.user.displayName || member.user.email.split('@')[0];

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between bg-slate-50 p-3 border border-slate-300"
                  >
                    <div className="flex items-center gap-3 overflow-hidden mr-2">
                      <div className="h-8 w-8 bg-[#5bc5a7]/10 flex items-center justify-center text-[#5bc5a7] border border-[#5bc5a7]/20 text-xs font-bold shrink-0">
                        {memberName[0].toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-slate-800 text-xs truncate">
                          {memberName}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate mt-0.5">
                          {net > 0 ? (
                            <span className="text-[#5bc5a7] font-semibold">
                              owes you {formatAmount(net, group.currency)}
                            </span>
                          ) : net < 0 ? (
                            <span className="text-[#ff652f] font-semibold">
                              you owe {formatAmount(Math.abs(net), group.currency)}
                            </span>
                          ) : (
                            <span className="text-slate-400">settled up</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Show reminder bell if they owe the current user */}
                    {net > 0 && member.user.id !== dbUser.id && (
                      <ReminderButton
                        friendName={memberName}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Group details card */}
          <div className="border-2 border-slate-300 bg-white p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5 text-[#5bc5a7]" />
              <span>Room Information</span>
            </h2>

            <div className="space-y-4 text-xs text-slate-500 font-medium">
              <div className="flex items-center justify-between">
                <span>Default Currency</span>
                <span className="font-bold text-slate-800 uppercase">{group.currency}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Created At</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span suppressHydrationWarning>
                    {new Date(group.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
