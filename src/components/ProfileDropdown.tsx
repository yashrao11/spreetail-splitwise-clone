'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { User, LogOut, Calculator, Settings, HelpCircle } from 'lucide-react';

interface ProfileDropdownProps {
  userEmail: string;
  displayName?: string | null;
}

export default function ProfileDropdown({ userEmail, displayName }: ProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [calcInput, setCalcInput] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Safe evaluation of simple math
      // Remove any characters that are not digits, operators, dots, or spaces
      const cleanInput = calcInput.replace(/[^0-9+\-*/().\s]/g, '');
      // eslint-disable-next-line no-eval
      const result = eval(cleanInput);
      setCalcResult(String(result));
    } catch (err) {
      setCalcResult('Error');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-1.5 rounded-full hover:bg-slate-100 transition-colors focus:outline-none"
      >
        <div className="w-8 h-8 rounded-full bg-[#5bc5a7]/10 text-[#5bc5a7] flex items-center justify-center font-bold text-sm">
          {displayName ? displayName[0].toUpperCase() : userEmail[0].toUpperCase()}
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Signed in as</p>
            <p className="text-sm font-bold text-slate-800 truncate">{displayName || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{userEmail}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                alert(`Account details:\nName: ${displayName || 'N/A'}\nEmail: ${userEmail}`);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>My Account</span>
            </button>

            <button
              onClick={() => {
                setShowCalculator(!showCalculator);
              }}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Calculator className="w-4 h-4 text-slate-400" />
                <span>Calculator</span>
              </div>
              <span className="text-[10px] bg-[#5bc5a7]/10 text-[#5bc5a7] font-bold px-1.5 py-0.5 rounded">
                Quick Math
              </span>
            </button>

            {showCalculator && (
              <div className="px-4 py-2 bg-slate-50 border-y border-slate-100">
                <form onSubmit={handleCalculate} className="space-y-2">
                  <input
                    type="text"
                    value={calcInput}
                    onChange={(e) => setCalcInput(e.target.value)}
                    placeholder="e.g. 100 / 3 + 12"
                    className="w-full text-xs px-2 py-1 bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] text-slate-800"
                  />
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-700">Result: {calcResult}</span>
                    <button
                      type="submit"
                      className="bg-[#5bc5a7] text-white px-2 py-0.5 rounded text-[10px] font-bold hover:bg-[#48b093] transition-colors"
                    >
                      Calc
                    </button>
                  </div>
                </form>
              </div>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                alert("Splitwise help & support placeholder");
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-slate-400" />
              <span>Help & Support</span>
            </button>
          </div>

          <div className="border-t border-slate-100 pt-1 mt-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors font-semibold"
            >
              <LogOut className="w-4 h-4 text-red-400" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
