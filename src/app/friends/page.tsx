'use client';

import { useState, useEffect } from 'react';
import { UserPlus, User, Loader2, Check, AlertCircle } from 'lucide-react';

interface Friend {
  id: number;
  email: string;
  displayName: string | null;
}

export default function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data);
      }
    } catch (err) {
      console.error('Failed to fetch friends:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), displayName: name.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to add friend');
      }

      // Display realistic invitation email toast as well as success
      if (typeof window !== 'undefined') {
        alert(`✉️ Invitation email sent to ${email.trim()}!`);
      }

      setMessage({
        type: 'success',
        text: `Invitation email sent to ${email.trim()}! Added ${name.trim()} successfully.`,
      });
      setEmail('');
      setName('');
      fetchFriends();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Friends</h1>
          <p className="text-sm text-slate-500">Manage your contacts and view their details.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left pane: Add Friend Card */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 border border-slate-300 sticky top-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
              <UserPlus className="w-5 h-5 text-[#5bc5a7]" />
              <span>Add a Friend</span>
            </h2>

            <form onSubmit={handleAddFriend} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Friend's Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="friend@email.com"
                  className="w-full px-3 py-2 border border-slate-300 text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-[#5bc5a7] focus:border-[#5bc5a7] bg-white"
                />
              </div>

              {message && (
                <div
                  className={`p-3 flex items-start gap-2.5 text-xs border ${
                    message.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {message.type === 'success' ? (
                    <Check className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 bg-[#5bc5a7] hover:bg-[#48b093] disabled:bg-[#5bc5a7]/50 text-white font-bold text-sm transition cursor-pointer flex items-center justify-center gap-2 border border-[#48b093]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <span>Send Invite</span>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right pane: Friends List */}
        <div className="md:col-span-2">
          <div className="bg-white border border-slate-300 p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Your Friends List</h2>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-[#5bc5a7] mb-2" />
                <span className="text-sm">Loading friends...</span>
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-16 text-slate-400 bg-slate-50 border border-dashed border-slate-300">
                <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium text-slate-700">No friends added yet</p>
                <p className="text-xs mt-1">Use the panel on the left to add your first friend.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {friends.map((friend) => (
                  <div key={friend.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#5bc5a7]/10 text-[#5bc5a7] border border-[#5bc5a7]/20 flex items-center justify-center font-bold">
                        {(friend.displayName || friend.email)[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{friend.displayName || 'Unnamed Friend'}</p>
                        <p className="text-xs text-slate-500">{friend.email}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
