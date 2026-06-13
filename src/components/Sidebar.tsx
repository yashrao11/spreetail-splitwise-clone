'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Activity,
  Users,
  User,
  Receipt,
} from 'lucide-react';

interface SidebarGroup {
  id: number;
  name: string;
}

interface SidebarFriend {
  id: number;
  displayName: string | null;
  email: string;
}

interface SidebarProps {
  groups: SidebarGroup[];
  friends: SidebarFriend[];
}

export default function Sidebar({ groups, friends }: SidebarProps) {
  const pathname = usePathname();

  const isLinkActive = (path: string) => pathname === path;

  return (
    <aside className="w-64 bg-slate-100 border-r border-slate-300 flex flex-col shrink-0 h-full">
      {/* Brand logo header */}
      <div className="h-16 border-b border-slate-300 px-6 flex items-center gap-2 shrink-0 bg-white">
        <Receipt className="w-6 h-6 text-[#5bc5a7]" />
        <span className="font-bold text-sm uppercase tracking-wider text-slate-805 text-slate-800">
          Spreetail Splitwise
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6 select-none">
        <div className="space-y-0.5">
          <Link
            href="/dashboard"
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-all duration-150 border-l-2 ${
              isLinkActive('/dashboard')
                ? 'bg-white border-[#5bc5a7] text-slate-900'
                : 'border-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-slate-500" />
            <span>Dashboard</span>
          </Link>

          <Link
            href="/activity"
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-all duration-150 border-l-2 ${
              isLinkActive('/activity')
                ? 'bg-white border-[#5bc5a7] text-slate-900'
                : 'border-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4 text-slate-500" />
            <span>Recent Activity</span>
          </Link>

          <Link
            href="/friends"
            className={`flex items-center gap-2.5 px-3 py-2 text-xs font-bold transition-all duration-150 border-l-2 ${
              isLinkActive('/friends')
                ? 'bg-white border-[#5bc5a7] text-slate-900'
                : 'border-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Manage Friends</span>
          </Link>
        </div>

        {/* Groups list */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Groups</span>
          </div>
          {groups.length === 0 ? (
            <div className="px-3 text-xs text-slate-400 italic">No groups yet</div>
          ) : (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {groups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-l-2 ${
                    isLinkActive(`/groups/${group.id}`)
                      ? 'bg-white border-[#5bc5a7] text-slate-900'
                      : 'border-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-905 hover:text-slate-800'
                  }`}
                >
                  <span className="truncate">{group.name}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Friends list (Clickable details list) */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Friends</span>
          </div>
          {friends.length === 0 ? (
            <div className="px-3 text-xs text-slate-400 italic">No friends added</div>
          ) : (
            <div className="space-y-0.5 max-h-40 overflow-y-auto">
              {friends.map((friend) => {
                const friendPath = `/friends/${friend.id}`;
                const displayName = friend.displayName || friend.email.split('@')[0];
                return (
                  <Link
                    key={friend.id}
                    href={friendPath}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-l-2 ${
                      isLinkActive(friendPath)
                        ? 'bg-white border-[#5bc5a7] text-slate-900'
                        : 'border-transparent text-slate-600 hover:bg-slate-200 hover:text-slate-905 hover:text-slate-800'
                    }`}
                  >
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate" title={friend.email}>
                      {displayName}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
