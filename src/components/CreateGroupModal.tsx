'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, User, Check, Trash2 } from 'lucide-react';

interface Friend {
  id: number;
  email: string;
  displayName: string | null;
}

interface InvitedFriend {
  name: string;
  email: string;
}

export default function CreateGroupModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Friends selection state
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<number[]>([]);
  
  // Custom invites list
  const [inviteEmails, setInviteEmails] = useState<InvitedFriend[]>([]);
  const [newInviteName, setNewInviteName] = useState('');
  const [newInviteEmail, setNewInviteEmail] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/friends')
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setFriends(data);
          }
        })
        .catch((err) => console.error('Failed to load friends in modal:', err));
    }
  }, [isOpen]);

  const toggleFriend = (friendId: number) => {
    setSelectedFriendIds((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const handleAddEmailInvite = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newInviteName.trim() || !newInviteEmail.trim() || !newInviteEmail.includes('@')) return;
    
    const emailLower = newInviteEmail.toLowerCase().trim();
    const nameTrimmed = newInviteName.trim();

    if (!inviteEmails.some((i) => i.email === emailLower)) {
      setInviteEmails((prev) => [...prev, { name: nameTrimmed, email: emailLower }]);
    }
    
    setNewInviteName('');
    setNewInviteEmail('');
  };

  const removeEmailInvite = (emailToRemove: string) => {
    setInviteEmails((prev) => prev.filter((i) => i.email !== emailToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Group name is required.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Merge any partially typed invite
    let finalInviteEmails = [...inviteEmails];
    if (newInviteName.trim() && newInviteEmail.trim() && newInviteEmail.includes('@')) {
      const emailLower = newInviteEmail.toLowerCase().trim();
      const nameTrimmed = newInviteName.trim();
      if (!finalInviteEmails.some((i) => i.email === emailLower)) {
        finalInviteEmails.push({ name: nameTrimmed, email: emailLower });
      }
    }

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          currency,
          memberUserIds: selectedFriendIds,
          inviteEmails: finalInviteEmails,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create group.');
      } else {
        // Trigger simulated emails alerts
        if (finalInviteEmails.length > 0 && typeof window !== 'undefined') {
          finalInviteEmails.forEach((invite) => {
            alert(`✉️ Invitation email sent to ${invite.email}!`);
          });
        }

        setName('');
        setDescription('');
        setCurrency('USD');
        setSelectedFriendIds([]);
        setInviteEmails([]);
        setNewInviteName('');
        setNewInviteEmail('');
        setIsOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#5bc5a7] hover:bg-[#4bb597] border border-[#4bb597] transition duration-200 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        <span>Create Group</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white border border-slate-305 border-slate-300 p-6 sm:p-8 overflow-hidden text-slate-800 my-8 max-h-[90vh] flex flex-col animate-fade-in">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 transition duration-200 cursor-pointer border border-transparent"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="shrink-0 mb-4">
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
                Create a Share Room
              </h3>
              <p className="text-xs text-slate-500">
                Create a group to track expenses with friends for trips, roommates, or events.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full px-3 py-2.5 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] text-sm transition-all"
                  placeholder="e.g. Europe Trip 2026"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] text-sm transition-all h-16 resize-none"
                  placeholder="e.g. Shared costs for accommodation"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                    Default Currency
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="block w-full px-3 py-2 border border-slate-300 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] text-sm transition-all cursor-pointer"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="INR">INR (₹)</option>
                  </select>
                </div>
              </div>

              {/* Add Friends Section */}
              <div className="border-t border-slate-100 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                  Select Friends to Add
                </label>
                {friends.length === 0 ? (
                  <p className="text-xs text-slate-400 italic mb-2">No friends added yet. You can invite below!</p>
                ) : (
                  <div className="max-h-32 overflow-y-auto border border-slate-300 p-2 space-y-1 mb-3 bg-slate-50">
                    {friends.map((friend) => {
                      const isSelected = selectedFriendIds.includes(friend.id);
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => toggleFriend(friend.id)}
                          className={`w-full flex items-center justify-between p-2 text-left text-xs font-semibold transition-colors ${
                            isSelected ? 'bg-[#5bc5a7]/10 text-teal-800' : 'hover:bg-white text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate">{friend.displayName || friend.email}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#5bc5a7]" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Invite new emails */}
              <div className="space-y-2 border-t border-slate-100 pt-4">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Invite New Member
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={newInviteName}
                      onChange={(e) => setNewInviteName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-500 mb-1">Email</label>
                    <div className="flex gap-1.5">
                      <input
                        type="email"
                        value={newInviteEmail}
                        onChange={(e) => setNewInviteEmail(e.target.value)}
                        placeholder="friend@example.com"
                        className="flex-1 px-3 py-1.5 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] text-xs"
                      />
                      <button
                        type="button"
                        onClick={handleAddEmailInvite}
                        className="px-3 py-1.5 bg-[#5bc5a7] hover:bg-[#4bb597] border border-[#4bb597] text-white text-xs font-bold transition cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>

                {inviteEmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1.5">
                    {inviteEmails.map((item) => (
                      <span
                        key={item.email}
                        className="inline-flex items-center gap-1.5 bg-[#5bc5a7]/15 text-teal-800 text-[10px] font-bold px-2 py-1 border border-[#5bc5a7]/20"
                      >
                        <span>{item.name} ({item.email})</span>
                        <button type="button" onClick={() => removeEmailInvite(item.email)}>
                          <Trash2 className="w-3.5 h-3.5 text-red-500 hover:text-red-700" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 border border-rose-200 bg-rose-50 text-rose-600 text-xs">
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6 shrink-0">
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
                    'Save'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
