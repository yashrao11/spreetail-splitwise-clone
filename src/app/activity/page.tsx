import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { groupMembers, expenses, settlements } from '@/db/schema';
import { eq, inArray, or, desc } from 'drizzle-orm';
import { ensureUserSynced } from '@/utils/db/user-sync';
import Link from 'next/link';
import { Activity, Calendar, Coins, ArrowRight, Receipt } from 'lucide-react';

export default async function ActivityPage() {
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

  // Fetch groups where the user is a member
  const memberships = await db.query.groupMembers.findMany({
    where: eq(groupMembers.userId, dbUser.id),
  });

  const groupIds = memberships.map((m) => m.groupId);

  // Fetch recent expenses
  const recentExpenses = groupIds.length > 0
    ? await db.query.expenses.findMany({
        where: inArray(expenses.groupId, groupIds),
        with: {
          group: true,
          paidBy: true,
        },
        orderBy: [desc(expenses.createdAt)],
        limit: 15,
      })
    : [];

  // Fetch recent settlements
  const recentSettlements = await db.query.settlements.findMany({
    where: groupIds.length > 0
      ? or(
          inArray(settlements.groupId, groupIds),
          eq(settlements.payerId, dbUser.id),
          eq(settlements.payeeId, dbUser.id)
        )
      : or(
          eq(settlements.payerId, dbUser.id),
          eq(settlements.payeeId, dbUser.id)
        ),
    with: {
      group: true,
      payer: true,
      payee: true,
    },
    orderBy: [desc(settlements.createdAt)],
    limit: 15,
  });

  // Helper to format currency
  const formatAmount = (value: string | number, curr: string) => {
    const num = parseFloat(value.toString());
    const symbol = curr === 'EUR' ? '€' : curr === 'GBP' ? '£' : curr === 'INR' ? '₹' : '$';
    return `${symbol}${num.toFixed(2)}`;
  };

  // Merge and sort
  const combinedActivity = [
    ...recentExpenses.map((e) => ({ ...e, activityType: 'expense' as const })),
    ...recentSettlements.map((s) => ({ ...s, activityType: 'settlement' as const })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 15);

  return (
    <div className="max-w-3xl mx-auto space-y-6 text-slate-805 text-slate-800">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-6 h-6 text-[#5bc5a7]" />
          <span>Recent Activity</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Chronological breakdown of payments and expenses added across your rooms.
        </p>
      </div>

      <div className="border border-slate-300 bg-white p-6">
        {combinedActivity.length === 0 ? (
          <div className="text-center py-16 text-slate-400 bg-slate-50 border border-dashed border-slate-300">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-bold text-slate-700 text-xs">No activity logged yet</p>
            <p className="text-[10px] mt-0.5">Add expenses or log settlements to populate the ledger.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {combinedActivity.map((item, index) => {
              const dateStr = new Date(item.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              if (item.activityType === 'settlement') {
                const payerName = item.payer?.displayName || item.payer?.email.split('@')[0] || 'Member';
                const payeeName = item.payee?.displayName || item.payee?.email.split('@')[0] || 'Member';
                const groupName = item.group?.name || 'Globally';

                return (
                  <div key={`settlement-${item.id}-${index}`} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-50 text-emerald-600 border border-emerald-200">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">
                          <strong>{payerName}</strong> settled with <strong>{payeeName}</strong>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          In room: <strong>{groupName}</strong> • <span suppressHydrationWarning>{dateStr}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-emerald-600">
                        {formatAmount(item.amount, item.currency)}
                      </span>
                    </div>
                  </div>
                );
              }

              // Render Expense Activity
              const payerName = item.paidBy?.displayName || item.paidBy?.email.split('@')[0] || 'Someone';
              const groupName = item.group?.name || 'Room';

              return (
                <div key={`expense-${item.id}-${index}`} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 text-slate-600 border border-slate-300">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-850 text-slate-800">
                        <strong>{payerName}</strong> added "<strong>{item.description}</strong>"
                      </p>
                      <p className="text-[10px] text-slate-550 mt-0.5 text-slate-500">
                        In room:{' '}
                        <Link href={`/groups/${item.groupId}`} className="text-slate-700 hover:text-[#5bc5a7] font-bold">
                          {groupName}
                        </Link>{' '}
                        • <span suppressHydrationWarning>{dateStr}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs font-extrabold text-slate-900">
                      {formatAmount(item.amount, item.currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
