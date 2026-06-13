'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Send, Loader2, MessageSquare } from 'lucide-react';

interface ChatMessage {
  id: number;
  message: string;
  createdAt: string;
  senderId: number;
  sender?: {
    id: number;
    email: string;
    displayName: string | null;
  } | null;
}

interface ExpenseChatProps {
  expenseId: number;
  currentDbUserId: number;
}

export default function ExpenseChat({ expenseId, currentDbUserId }: ExpenseChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const channelRef = useRef<any>(null);

  useEffect(() => {
    fetchChats();

    // Subscribe to Postgres changes for this specific expense's chats
    const supabase = createClient();
    const channel = supabase
      .channel(`chats-expense-${expenseId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
          filter: `expense_id=eq.${expenseId}`,
        },
        () => {
          // Re-fetch all comments to ensure we pull joined sender profiles
          fetchChats();
        }
      )
      .on(
        'broadcast',
        { event: 'new-message' },
        (payload) => {
          if (payload.payload?.chat) {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.payload.chat.id)) return prev;
              return [...prev, payload.payload.chat];
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expenseId]);

  // Scroll to bottom when messages list updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchChats = async () => {
    try {
      const res = await fetch(`/api/chats?expenseId=${expenseId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
      }
    } catch (err) {
      console.error('Failed to load chat messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = inputText.trim();
    if (!trimmedInput) return;

    setSending(true);
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expenseId, message: trimmedInput }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.chat) {
          // Immediately append the new message to the list locally
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.chat.id)) return prev;
            return [...prev, data.chat];
          });

          // Broadcast message via Supabase Realtime channel
          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'new-message',
              payload: { chat: data.chat },
            });
          }
        }
        setInputText('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to post message');
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred while sending comment.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border border-slate-300 bg-white text-slate-800 flex flex-col h-64 mt-3">
      {/* Chat header */}
      <div className="border-b border-slate-300 bg-slate-50 px-3 py-2 flex items-center gap-1.5 shrink-0">
        <MessageSquare className="w-3.5 h-3.5 text-[#5bc5a7]" />
        <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
          Discussion Notes
        </span>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 gap-1.5 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-[#5bc5a7]" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs italic">
            <span>No notes or discussions logged yet.</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentDbUserId;
            const senderName = msg.sender?.displayName || msg.sender?.email.split('@')[0] || 'Member';

            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}
              >
                <span className="text-[10px] text-slate-400 font-bold mb-0.5">
                  {isMe ? 'You' : senderName}
                </span>
                <div
                  className={`px-3 py-1.5 text-xs border ${
                    isMe
                      ? 'bg-slate-50 border-[#5bc5a7] text-slate-800'
                      : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <p className="leading-snug break-words">{msg.message}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Send message form */}
      <form onSubmit={handleSendMessage} className="border-t border-slate-300 p-2 flex gap-2 shrink-0 bg-slate-50">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a comment or resolve bill details..."
          className="flex-1 px-3 py-1.5 border border-slate-300 bg-white text-slate-800 placeholder-slate-400 text-xs focus:outline-none focus:border-[#5bc5a7]"
        />
        <button
          type="submit"
          disabled={sending || !inputText.trim()}
          className="px-3 py-1.5 bg-[#5bc5a7] hover:bg-[#4bb597] disabled:bg-slate-300 text-white font-bold text-xs uppercase transition flex items-center gap-1 cursor-pointer"
        >
          {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          <span>Post</span>
        </button>
      </form>
    </div>
  );
}
