import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ProfileDropdown from '@/components/ProfileDropdown';
import { createClient } from '@/utils/supabase/server';
import { db } from '@/db';
import { users, groups, groupMembers, friends } from '@/db/schema';
import { eq, or, and } from 'drizzle-orm';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Spreetail Splitwise',
  description: 'Eliminating the fatigue of shared costs and debt simplification.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let userEmail: string | undefined;
  let authenticated = false;
  let userGroups: { id: number; name: string }[] = [];
  let friendsList: { id: number; email: string; displayName: string | null }[] = [];
  let dbUser: { id: number; email: string; displayName: string | null } | undefined;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (user) {
        userEmail = user.email;
        authenticated = true;

        // Fetch user from DB to get internal ID
        const [foundUser] = await db
          .select({
            id: users.id,
            email: users.email,
            displayName: users.displayName,
          })
          .from(users)
          .where(eq(users.uid, user.id))
          .limit(1);

        if (foundUser) {
          dbUser = foundUser;

          // Fetch user's groups
          userGroups = await db
            .select({
              id: groups.id,
              name: groups.name,
            })
            .from(groups)
            .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
            .where(eq(groupMembers.userId, dbUser.id));

          // Fetch user's friends
          friendsList = await db
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
        }
      }
    } catch (error) {
      console.error('Failed to load user session or layout details:', error);
    }
  }

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      style={{ colorScheme: 'light' }}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-800 selection:bg-teal-500/10 selection:text-teal-900">
        {authenticated ? (
          <div className="flex w-full h-screen overflow-hidden">
            <Sidebar groups={userGroups} friends={friendsList} />
            <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
              <header className="h-16 border-b border-slate-300 bg-white px-6 flex items-center justify-between shrink-0">
                <span className="text-sm font-semibold text-slate-500">
                  Welcome to Spreetail Splitwise
                </span>
                <ProfileDropdown userEmail={userEmail!} displayName={dbUser?.displayName} />
              </header>
              <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <Header userEmail={userEmail} />
            <main className="flex-1 flex flex-col">{children}</main>
          </div>
        )}
      </body>
    </html>
  );
}
