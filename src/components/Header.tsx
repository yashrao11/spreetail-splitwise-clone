'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { LogOut, Receipt } from 'lucide-react';
import Link from 'next/link';

export default function Header({ userEmail }: { userEmail?: string }) {
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="p-2 rounded-xl bg-[#5bc5a7]/10 text-[#5bc5a7] group-hover:bg-[#5bc5a7]/20 transition-all duration-300">
            <Receipt className="w-6 h-6" />
          </div>
          <span className="font-bold text-lg text-slate-800 tracking-tight">
            Spreetail Splitwise
          </span>
        </Link>

        {userEmail && (
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 hidden sm:inline-block">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-655 text-slate-600 hover:text-slate-850 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 transition duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-slate-400" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
