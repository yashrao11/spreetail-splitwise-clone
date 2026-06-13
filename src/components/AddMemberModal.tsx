'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, X, Loader2, User, Check, AlertCircle } from 'lucide-react';

interface Friend {
  id: number;
  email: string;
  displayName: string | null;
}

export default function AddMemberModal({ groupId }: { groupId: number }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Friend list fetching for easy click-to-add
  const [friends, setFriends] = useState<Friend[]>([]);
  const [fetchingFriends, setFetchingFriends] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFetchingFriends(true);
      fetch('/api/friends')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setFriends(data);
          }
        })
        .catch((err) => console.error('Failed to load friends:', err))
        .finally(() => setFetchingFriends(false));
    }
  }, [isOpen]);

  const handleAddFriendByEmail = async (emailToAdd: string, nameToAdd?: string) => {
    if (!emailToAdd.trim()) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: emailToAdd.trim(),
          name: nameToAdd ? nameToAdd.trim() : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to add member.');
      } else {
        // Trigger simulated invite email toast
        if (typeof window !== 'undefined') {
          alert(`✉️ Invitation email sent to ${emailToAdd.trim()}!`);
        }

        setSuccessMsg(`Invitation email sent to ${emailToAdd.trim()}! Member added.`);
        setEmail('');
        setName('');
        setTimeout(() => {
          setIsOpen(false);
          setSuccessMsg(null);
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAddFriendByEmail(email, name);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-[#5bc5a7] hover:bg-[#4bb597] border border-[#4bb597] transition duration-200 cursor-pointer"
      >
        <UserPlus className="w-4 h-4" />
        <span>Add Member</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-md bg-white border border-slate-300 p-6 sm:p-8 overflow-hidden text-slate-800 flex flex-col max-h-[90vh]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 transition duration-200 cursor-pointer border border-transparent"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="shrink-0 mb-4">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
                Add Friend/Member
              </h3>
              <p className="text-xs text-slate-500">
                Quick-add a contact from your friends list or invite a new member by email.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-4">
              {/* Quick Add from Friends */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Quick-Add Friends
                </label>
                {fetchingFriends ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#5bc5a7]" />
                    <span>Loading friends list...</span>
                  </div>
                ) : friends.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No friends available to add.</p>
                ) : (
                  <div className="max-h-40 overflow-y-auto border border-slate-300 p-1.5 space-y-1 bg-slate-50">
                    {friends.map((friend) => (
                      <button
                        key={friend.id}
                        type="button"
                        onClick={() => handleAddFriendByEmail(friend.email, friend.displayName || undefined)}
                        disabled={loading}
                        className="w-full flex items-center justify-between p-2 text-left text-xs font-semibold hover:bg-white border border-transparent hover:border-slate-300 text-slate-700 transition"
                      >
                        <div className="flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{friend.displayName || friend.email}</span>
                        </div>
                        <span className="text-[10px] bg-[#5bc5a7]/10 text-[#5bc5a7] font-bold px-1.5 py-0.5 border border-[#5bc5a7]/20 opacity-0 hover:opacity-100 transition">
                          Add
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Invite new friend by email */}
              <form onSubmit={handleSubmit} className="space-y-4 border-t border-slate-100 pt-4 shrink-0">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                    Invite New Member
                  </h4>
                  
                  {/* Name field (Primary / Required) */}
                  <div className="mb-3">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Member's Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] text-sm transition-all"
                      placeholder="e.g. Eric Chen"
                    />
                  </div>

                  {/* Email field (Secondary) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] text-sm transition-all"
                      placeholder="friend@example.com"
                    />
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 border border-rose-200 bg-rose-50 text-rose-600 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs flex items-start gap-2">
                    <Check className="w-4 h-4 text-[#5bc5a7] shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 border border-slate-300 text-sm font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center justify-center gap-2 py-2 px-5 text-sm font-semibold text-white bg-[#5bc5a7] hover:bg-[#4bb597] border border-[#4bb597] transition duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Invite'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
