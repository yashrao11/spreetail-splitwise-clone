import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { groupMembers, groups, users, friends, settlements } from '@/db/schema';
import { eq, or, and, inArray, isNull } from 'drizzle-orm';
import Link from 'next/link';
import { ensureUserSynced } from '@/utils/db/user-sync';
import CreateGroupModal from '@/components/CreateGroupModal';
import SettleUpModal from '@/components/SettleUpModal';
import { calculateGroupDebts } from '@/utils/math/debts';
import {
  TrendingDown,
  TrendingUp,
  Coins,
  Users,
  ArrowRight,
  User,
  Sparkles,
} from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Synchronize user profile in the database
  const dbUser = await ensureUserSynced(
    user.id,
    user.email!,
    user.user_metadata?.displayName || user.user_metadata?.display_name || user.email!.split('@')[0],
    user.user_metadata?.avatar_url
  );

  // Fetch groups where the user is a member
  let userMemberships: any[] = [];
  if (dbUser.id !== 0) {
    userMemberships = await db.query.groupMembers.findMany({
      where: eq(groupMembers.userId, dbUser.id),
      with: {
        group: true,
      },
    });
  }

  const groupIds = userMemberships.map((m) => m.groupId);

  // Query groups with their nested relations (members, expenses with splits/payments, and settlements)
  const groupsData = groupIds.length > 0
    ? await db.query.groups.findMany({
        where: inArray(groups.id, groupIds),
        with: {
          members: {
            with: {
              user: true,
            },
          },
          expenses: {
            with: {
              splits: true,
              payments: true,
            },
          },
          settlements: true,
        },
      })
    : [];

  // Query global (group-less) settlements involving the current user
  const globalSettlements = await db.query.settlements.findMany({
    where: and(
      isNull(settlements.groupId),
      or(
        eq(settlements.payerId, dbUser.id),
        eq(settlements.payeeId, dbUser.id)
      )
    ),
  });

  // Calculate resolved debts per group
  const totalDebts: { debtorId: number; creditorId: number; amount: number }[] = [];

  groupsData.forEach((g) => {
    const groupMembersList = g.members.map((m) => m.user);
    const groupDebts = calculateGroupDebts(groupMembersList, g.expenses, g.settlements);
    totalDebts.push(...groupDebts);
  });

  // Incorporate global settlements
  const globalBalanceMap: Record<number, number> = {};
  globalSettlements.forEach((s) => {
    const otherId = s.payerId === dbUser.id ? s.payeeId : s.payerId;
    if (globalBalanceMap[otherId] === undefined) {
      globalBalanceMap[otherId] = 0;
    }

    if (s.payerId === dbUser.id) {
      globalBalanceMap[otherId] += parseFloat(s.amount);
    } else {
      globalBalanceMap[otherId] -= parseFloat(s.amount);
    }
  });

  Object.entries(globalBalanceMap).forEach(([otherIdStr, bal]) => {
    const otherId = parseInt(otherIdStr, 10);
    if (bal > 0.005) {
      totalDebts.push({ debtorId: otherId, creditorId: dbUser.id, amount: bal });
    } else if (bal < -0.005) {
      totalDebts.push({ debtorId: dbUser.id, creditorId: otherId, amount: -bal });
    }
  });

  // Consolidate global debts relative to the logged-in user
  const consolidatedDebts: Record<number, number> = {};
  totalDebts.forEach((d) => {
    if (d.debtorId === dbUser.id) {
      const otherId = d.creditorId;
      if (!consolidatedDebts[otherId]) consolidatedDebts[otherId] = 0;
      consolidatedDebts[otherId] -= d.amount;
    } else if (d.creditorId === dbUser.id) {
      const otherId = d.debtorId;
      if (!consolidatedDebts[otherId]) consolidatedDebts[otherId] = 0;
      consolidatedDebts[otherId] += d.amount;
    }
  });

  // Fetch profiles for users we have outstanding balances with
  const otherUserIds = Object.keys(consolidatedDebts).map(Number);
  const otherUsers = otherUserIds.length > 0
    ? await db
        .select({
          id: users.id,
          email: users.email,
          displayName: users.displayName,
        })
        .from(users)
        .where(inArray(users.id, otherUserIds))
    : [];

  let totalOwedToYou = 0;
  let totalYouOwe = 0;

  const debtSummaries: {
    user: { id: number; email: string; displayName: string | null };
    amount: number;
    type: 'owe_them' | 'owes_you';
  }[] = [];

  otherUsers.forEach((otherUser) => {
    const net = consolidatedDebts[otherUser.id] || 0;
    if (Math.abs(net) >= 0.005) {
      if (net > 0) {
        totalOwedToYou += net;
        debtSummaries.push({
          user: otherUser,
          amount: net,
          type: 'owes_you',
        });
      } else {
        totalYouOwe += Math.abs(net);
        debtSummaries.push({
          user: otherUser,
          amount: Math.abs(net),
          type: 'owe_them',
        });
      }
    }
  });

  const netBalance = totalOwedToYou - totalYouOwe;

  // Prepare members list for Settle Up modal (current user + friends + anyone with balance)
  const settleUpMembersMap = new Map<number, { id: number; displayName: string | null; email: string }>();
  settleUpMembersMap.set(dbUser.id, { id: dbUser.id, displayName: dbUser.displayName, email: dbUser.email });
  
  otherUsers.forEach((u) => {
    settleUpMembersMap.set(u.id, u);
  });

  // Fetch friends to include in Settle Up dropdown
  const friendsList = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
    })
    .from(friends)
    .innerJoin(
      users,
      or(
        and(eq(friends.userId1, dbUser.id), eq(friends.userId2, users.id)),
        and(eq(friends.userId2, dbUser.id), eq(friends.userId1, users.id))
      )
    );

  friendsList.forEach((f) => {
    settleUpMembersMap.set(f.id, f);
  });

  const settleUpMembers = Array.from(settleUpMembersMap.values());

  return (
    <div className="relative flex-1 bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-slate-800">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-slate-300 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight sm:text-3xl">
            Welcome back,{' '}
            <span className="text-[#5bc5a7]">
              {dbUser.displayName || 'Friend'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Here is a breakdown of your shared bills and expenses.
          </p>
        </div>
        
        {/* Top level Dashboard actions */}
        <div className="flex items-center gap-3 shrink-0">
          <SettleUpModal
            members={settleUpMembers}
            currentDbUserId={dbUser.id}
          />
          <CreateGroupModal />
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Balance Stat Board */}
        <div className="md:col-span-2 border border-slate-300 bg-white p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6 border-b border-slate-200 pb-3">
              <h2 className="text-sm font-bold text-slate-905 text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                <Coins className="w-4 h-4 text-[#5bc5a7]" />
                <span>Total Balance Overview</span>
              </h2>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">USD Ledger</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-2">
              {/* Owed to Me */}
              <div className="bg-slate-50 border border-slate-300 p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Owed to you
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xl font-extrabold text-[#5bc5a7]">
                    ${totalOwedToYou.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#5bc5a7] mt-1 font-bold">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span>
                    {totalOwedToYou > 0 ? 'Outstanding credits' : 'No active credits'}
                  </span>
                </div>
              </div>

              {/* You Owe */}
              <div className="bg-slate-50 border border-slate-300 p-4 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  You owe others
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xl font-extrabold text-[#ff652f]">
                    ${totalYouOwe.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-[#ff652f] mt-1 font-bold">
                  <TrendingDown className="w-3.5 h-3.5" />
                  <span>
                    {totalYouOwe > 0 ? 'Outstanding debts' : 'No active debts'}
                  </span>
                </div>
              </div>

              {/* Net Balance */}
              <div className={`border p-4 flex flex-col justify-between ${
                netBalance > 0
                  ? 'bg-emerald-50/10 border-emerald-200 text-[#5bc5a7]'
                  : netBalance < 0
                  ? 'bg-rose-50/10 border-rose-200 text-[#ff652f]'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Net balance
                </span>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-xl font-extrabold`}>
                    {netBalance >= 0 ? `$${netBalance.toFixed(2)}` : `-$${Math.abs(netBalance).toFixed(2)}`}
                  </span>
                </div>
                <div className="text-[10px] font-bold mt-1 uppercase tracking-wider">
                  {netBalance > 0
                    ? 'You are owed overall'
                    : netBalance < 0
                    ? 'You owe overall'
                    : 'All settled up!'}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-6 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
            <span>Simplify debts by clicking "Settle Up" to log cash payments.</span>
          </div>
        </div>

        {/* Card 2: User Profile Card */}
        <div className="border border-slate-300 bg-white p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-905 text-slate-900 flex items-center gap-2 mb-4 uppercase tracking-wide border-b border-slate-200 pb-3">
              <User className="w-4 h-4 text-[#5bc5a7]" />
              <span>User Profile</span>
            </h2>
            <div className="flex items-center gap-4 bg-slate-50 p-4 border border-slate-300">
              <div className="h-10 w-10 bg-[#5bc5a7]/10 flex items-center justify-center text-[#5bc5a7] border border-[#5bc5a7]/20 font-bold text-base">
                {(dbUser.displayName || 'Friend')[0].toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="font-bold text-slate-800 text-xs truncate">{dbUser.displayName || 'Friend'}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">{dbUser.email}</div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Member since <span suppressHydrationWarning>{new Date(dbUser.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</span>
          </div>
        </div>

        {/* Card 3: Debt summaries detailed ledger */}
        <div className="md:col-span-3 border border-slate-300 bg-white p-6 sm:p-8">
          <h2 className="text-sm font-bold text-slate-905 text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide border-b border-slate-200 pb-3">
            <Coins className="w-4 h-4 text-[#5bc5a7]" />
            <span>Outstanding Pairwise Sheets</span>
          </h2>

          {debtSummaries.length === 0 ? (
            <div className="text-center py-12 text-slate-400 bg-slate-50 border border-dashed border-slate-300">
              <Sparkles className="w-8 h-8 mx-auto text-[#5bc5a7]/40 mb-3" />
              <p className="font-bold text-slate-700 text-xs">All settled up!</p>
              <p className="text-[10px] mt-1">No outstanding balances with any friends.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 max-h-72 overflow-y-auto">
              {debtSummaries.map((summary) => (
                <div
                  key={summary.user.id}
                  className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs border border-slate-300">
                      {(summary.user.displayName || summary.user.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 text-xs">
                        {summary.user.displayName || 'Friend'}
                      </p>
                      <p className="text-[10px] text-slate-500">{summary.user.email}</p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className={`font-extrabold text-xs uppercase tracking-wide ${
                      summary.type === 'owes_you' ? 'text-[#5bc5a7]' : 'text-[#ff652f]'
                    }`}>
                      {summary.type === 'owes_you' ? 'owes you' : 'you owe'} ${summary.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Groups Card */}
        <div className="md:col-span-3 border border-slate-300 bg-white p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-250 border-slate-200 pb-3">
            <h2 className="text-sm font-bold text-slate-905 text-slate-900 flex items-center gap-2 uppercase tracking-wide">
              <Users className="w-4 h-4 text-[#5bc5a7]" />
              <span>Your Share Rooms</span>
            </h2>
          </div>

          {userMemberships.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-300 bg-slate-50">
              <Users className="w-8 h-8 text-slate-400 mb-3" />
              <h3 className="font-bold text-slate-805 text-slate-800 text-xs">No groups yet</h3>
              <p className="text-[10px] text-slate-500 mt-1 max-w-sm leading-relaxed">
                Get started by creating a share room or ask your friends to invite you to their existing groups.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {userMemberships.map((membership) => (
                <Link
                  key={membership.id}
                  href={`/groups/${membership.group.id}`}
                  className="group flex items-center justify-between p-4 border border-slate-300 bg-white hover:border-[#5bc5a7]/50 hover:bg-slate-50 transition-all duration-150"
                >
                  <div className="overflow-hidden">
                    <div className="font-bold text-slate-805 text-slate-850 text-slate-800 group-hover:text-[#5bc5a7] transition-colors text-xs truncate">
                      {membership.group.name}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate mt-0.5">
                      {membership.group.description || 'No description'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 group-hover:text-[#5bc5a7] transition-colors shrink-0 pl-2">
                    <span className="text-[10px] text-slate-450 uppercase font-semibold">{membership.group.currency}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
