# BUILD_PLAN.md: Next.js & Supabase Transition Roadmap

## 1. Product Research & Pivot Rationale
*   **Study of Splitwise**:
    *   *The Magic Balance*: Consolidated ledgering minimizing micro-debts. Our unique value indicator remains the **Greedy Max-Debt Heap Solver**.
    *   *Real-Time Sync*: Pivoting from custom containerized stateful WebSockets to **Supabase Realtime Broadcast Rooms** simplifies serverless scale and delivers instant chat feed updates under a zero-cost model.
    *   *Splitting Versatility*: Equal splits, custom values, exact percentages, and share weighting logic executed client-side inside type-safe calculators with strict penny-rounding absorption.
*   **The Pivot Decision**:
    *   **Old Stack**: Express.js server, custom WebSocket handlers, Google Cloud SQL database, Firebase Auth, React/Vite client container.
    *   **New Stack**: Next.js 14 App Router (React Frontend + React Server Actions / Serverless Route Handlers), Supabase (Postgres & Auth), Drizzle ORM, Tailwind CSS + shadcn/ui, deployed seamlessly to Vercel/Supabase Serverless.
    *   **Cost & Velocity Objective**: Zero cold-starts, zero active container costs, unified API routes, and instant build-pipeline deployable in 2 days.

---

## 2. Technical Architecture

*   **Framework**: Next.js 14 (App Router) employing TypeScript.
*   **Database & Storage**: Supabase Postgres database.
*   **Authentication & Session Management**: Supabase Auth client, utilizing either PKCE authentication flows or static email JWT credential tokens.
*   **State & Real-time Comments**: Client subscriptions to Supabase Realtime socket events, enabling instant room updates.
*   **ORM Layer**: Drizzle ORM configured with standard Supabase pooler connections (port 5432 or 6543) and local schema mappings.
*   **Styling**: Tailwind CSS integration + shadcn UI components (Radix primitives).
*   **Durable Cloud Persistence Strategy**: All group members, expenses, split ratios, settlements, and chats reside directly in Supabase Postgres, synced seamlessly on action triggers.

---

## 3. Wipe and Initialization Commands

Below are the safe terminal execution scripts to wipe the Vite/Express setup and scaffold the new Next.js structure cleanly.

```bash
# 1. Back up vital business logic and assets
mkdir -p /tmp/backup
cp src/lib/debt-simplifier.ts /tmp/backup/
cp src/db/schema.ts /tmp/backup/
cp -r src/components /tmp/backup/components || true

# 2. Clean parent project folder workspace files
rm -rf src/ vite.config.ts index.html server.ts tsconfig.json package.json package-lock.json firebase-applet-config.json

# 3. Scaffold Next.js 14 App Router (Tailwind, TypeScript, App router, 'src' src directory)
# Using non-interactive defaults to configure Next.js instantly:
npx -y create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-npm

# 4. Install additional Supabase, Drizzle, and Lucide dependencies
npm install @supabase/supabase-js @supabase/ssr drizzle-orm pg lucide-react motion clsx tailwind-merge npm-run-all
npm install -D drizzle-kit typescript @types/pg
```

---

## 4. Porting Strategy for Core Modules

To port the developed modules into Next.js App Router:

### A. Database Schema (`/src/db/schema.ts`)
1. Place `schema.ts` inside `/src/db/schema.ts`.
2. Map the `users.uid` field to map the Supabase Auth UUID string:
   ```ts
   export const users = pgTable('users', {
     id: serial('id').primaryKey(),
     uid: text('uid').notNull().unique(), // Supabase Auth user.id (UUID string)
     email: text('email').notNull().unique(),
     displayName: text('display_name'),
     photoUrl: text('photo_url'),
     createdAt: timestamp('created_at').defaultNow().notNull(),
   });
   ```
3. Update `drizzle.config.ts` in the root folder to point to the Supabase database connection string (`DATABASE_URL`).

### B. Mathematical Debt Simplifier Module (`/src/lib/debt-simplifier.ts`)
- The greedy max-debt heap algorithm works out-of-the-box in the browser environment since it operates entirely on primitive types and functional JS.
- Relocate file directly to `/src/lib/debt-simplifier.ts` and import this module inside Dashboard bento boards and group pages to dynamically display simplified settlement directions when the toggle switch is activated.

### C. Serverless Route Handlers (`/src/app/api/...`)
- Replace the active Express.js `/api/...` routes with Next.js App Router Route Handlers (`route.ts`).
- **Example API Request Structure (`/src/app/api/groups/[id]/route.ts`)**:
  ```ts
  import { NextResponse } from 'next/server';
  import { db } from '@/db';
  import { groups } from '@/db/schema';
  import { eq } from 'drizzle-orm';

  export async function GET(request: Request, { params }: { params: { id: string } }) {
    const groupId = parseInt(params.id);
    const result = await db.select().from(groups).where(eq(groups.id, groupId));
    return NextResponse.json(result[0] || { error: 'Group not found' });
  }
  ```

### D. Real-Time Chat Engine with Supabase Broadcast
- Replace socket initializations in `/src/components/ExpenseChat.tsx` or `/src/app/group/[id]/page.tsx` with a Supabase client realtime listener:
  ```ts
  import { createClient } from '@supabase/supabase-js';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Join the broadcast lane
  const chatChannel = supabase.channel(`expense_chats:${expenseId}`, {
    config: { broadcast: { self: true } }
  });

  chatChannel
    .on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      // Append payload dynamically to local comments state array
      setMessages(prev => [...prev, payload]);
    })
    .subscribe();

  // Send a message
  const sendMessage = async (text: string) => {
    const payload = { text, senderName, timestamp: new Date().toISOString() };
    await chatChannel.send({
      type: 'broadcast',
      event: 'chat_message',
      payload
    });
  };
  ```

---

## 5. Deployment Instructions (Vercel)
*   **Git Sync**: Push the repository to GitHub.
*   **Vercel Project Setup**: Click "New Project" in the Vercel dashboard and select the repository.
*   **Environment Variables**:
    *   Set `DATABASE_URL` (Supabase transaction pooler link).
    *   Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
*   **Build command**: Next.js automatically detects structure, compiles Tailwind on demand, and builds serverless functions during `next build`.
