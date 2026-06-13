'use client';

import React from 'react';
import { Bell } from 'lucide-react';

interface ReminderButtonProps {
  friendName: string;
}

export default function ReminderButton({ friendName }: ReminderButtonProps) {
  const handleReminder = () => {
    if (typeof window !== 'undefined') {
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('Spreetail Splitwise', {
            body: `🔔 A friendly reminder was sent to ${friendName} to settle up!`,
            icon: '/favicon.ico',
          });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then((permission) => {
            if (permission === 'granted') {
              new Notification('Spreetail Splitwise', {
                body: `🔔 A friendly reminder was sent to ${friendName} to settle up!`,
                icon: '/favicon.ico',
              });
            }
          });
        }
      }
      // Trigger user-visible feedback
      alert(`🔔 Reminder sent to ${friendName}!`);
    }
  };

  return (
    <button
      onClick={handleReminder}
      className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition duration-150 cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-slate-100 border border-slate-200"
      title={`Remind ${friendName} to settle up`}
    >
      <Bell className="w-3.5 h-3.5 text-[#5bc5a7]" />
      <span>Remind</span>
    </button>
  );
}
