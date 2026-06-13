# AI_CONTEXT.md: Splitwise Clone Master Specification (Next.js & Supabase Edition)
This document stands as the absolute source of truth for the Splitwise Clone application. It defines the product roadmap, user personas, relational database schemas, precision mathematical splitting engines, the greedy debt simplification solver, Supabase Realtime configurations, and the Next.js 14 App Router layout.

---

## 1. Product Goals & Splitwise Research
- **The Core Problem**: Eliminating the fatigue of manual memory, calculations, and tracking when traveling or sharing cost environments. 
- **The Solution**: A fast, integrated, and fully mobilized splitting platform that synchronizes debts, payment histories, and direct chats.
- **The "Magic" UX**: A simplified settlement option that resolves complex, cyclic web debts down into the absolute lowest number of transaction movements.

---

## 2. User Personas & Core Workflows
- **Logged-In Users**: Authenticated securely using **Supabase Authentication**. On successful sign-up or sign-in, their authenticated profile triggers database records mapping `id` (serial), `uid` (matching Supabase auth `uuid` string), `email`, `displayName`, and dynamic avatar URLs.
- **Primary Workflows**:
  1. **Supabase Auth**: Email/password authentication or passwordless Magic Link flow, establishing secure client and server-side JWT session cookies.
  2. **Room Directory**: Allows creation of distinct expense groups (with optional descriptions and default currencies: USD, EUR, GBP, or INR).
  3. **Room Members Entry**: User searches registered email directories to invite friends into the split room (linked securely via group junction rows).
  4. **Multi-Style Expense Logging**: Split purchases among active room participants using high-precision mathematical models.
  5. **Real-time Discussion Tray**: Instant WhatsApp-style chat rooms tied individually to expenses via **Supabase Realtime Broadcast Channels**.
  6. **Record Settle Up**: Record manual cash transaction events to clear outstanding balance differences.

---

## 3. Specialized MVP Engineering Logic
### A. The 4 Precision Splitting Mathematical Engines
Expenses can be split according to four structures, calculating results to two decimal places:
1. **EQUAL**: Divides overall cost equally. Any remaining precision rounding fractions (e.g. splitting $10.00 among 3 users results in $3.33, $3.33, $3.34) are automatically absorbed by the last participant to ensure ledger sums add up exactly.
2. **UNEQUAL**: Sum of specific custom numerical inputs is validated against total.
3. **PERCENTAGE**: Allocates proportion ratios according to entered percentages (must sum to exactly 100%). Penny roundings are dynamically settled by adjusting the last participant's record.
4. **SHARE**: Splits by weighted shares. Individual split is calculated as $\text{Amount} \times \frac{\text{Shares}}{\text{Total Shares}}$, with precision rounding absorbed.

### B. Member Deletion Constraint Rules
To maintain mathematical ledger integrity, a member **STRICTLY CANNOT** be removed or deleted from a group if their outstanding net balance inside that group is non-zero (i.e. if $\text{Net Balance} \ge |0.01|$). They must "Settle Up" first.

---

## 4. Relational Database Schema (PostgreSQL via Supabase)
We utilize **Drizzle ORM** configured to communicate directly with **Supabase PostgreSQL** via pgpool/direct connection strings:

- **`users`**: Synced profile information corresponding to Supabase Auth UUID strings.
- **`groups`**: Metadata registry of share rooms.
- **`group_members`**: Link junction table mapping active memberships (with cascading deletes).
- **`expenses`**: Purchases recorded inside a group (storing payer, amount, default currency, and splitting model type).
- **`splits`**: Individual splitting weights inside an expense.
- **`payments`**: Manual cash settlements recorded inside a group.
- **`chats`**: Real-time comment messages associated with an expense.
- **`payment_votes`** (Phase 2): Dispute resolutions.
- **`expense_proofs`** (Phase 2): Cloud receipt image attachments.

---

## 5. Architectural Next.js 14 App Router Structure
We use a unified Next.js 14 structure utilizing server-side api routes and client components:
- `/src/app/layout.tsx`: Root shell setting up Supabase client providers, fonts, and global themes.
- `/src/app/page.tsx`: Landing page, login & sign-up forms using Supabase Auth.
- `/src/app/dashboard/page.tsx`: Consolidated bento dashboard showing groups, invite triggers, and net financial balances.
- `/src/app/group/[id]/page.tsx`: Detailed multi-pane workspace listing ledger transactions, balances, settlement buttons, and debt minimizer toggles.
- `/src/app/api/groups/route.ts` & `[groupId]/route.ts`: Serverless API handlers fetching and creating structured groups.
- `/src/app/api/expenses/route.ts` & `/src/app/api/payments/route.ts`: Submits computed ledger logs.
- `/src/app/api/users/route.ts`: Profiles lookup for email directories.

---

## 6. Greedy Max-Debt Heap Solver Algorithm
Rather than recording multiple unnecessary cyclic transits (e.g., A owes B \$10, B owes C \$10, C owes A \$5), we collapse and minimize transfers using a Greedy heap algorithm:
1. Parse all expenses, splits and cash payments inside the group; calculate each member's final `netBalance` ($\text{Credit} - \text{Debit}$).
2. Build two lists: Debtoes (members with a negative balance) and Creditoes (members with a positive balance).
3. Repeatedly select the maximum debtor ($D$) and the maximum creditor ($C$).
4. Calculate the settlement transaction value: $V = \min(|D_{\text{balance}}|, |C_{\text{balance}}|)$.
5. Transmit a simplified transaction transfer record ($D \xrightarrow{V} C$).
6. Adjust balances. Repeat until all balances are fully minimized to $0.00$.

---

## 7. Supabase Realtime Broadcast Channel Topology
Instead of maintaining a custom running stateful Node.js WebSocket process, we utilize **Supabase Realtime Broadcast** client-side channels for instant updates without any server-side state overhead:
- **Subscription**: Clients connect to a dedicated channel: `realtime:expense_chats:[expenseId]`.
- **Broadcast**: On click/send, the sender's client broadcasts a `chat_message` payload containing `{ messageId, text, senderId, senderName, senderPhotoUrl }` across the broadcast lane, allowing other connected workspace tabs to append the message dynamically to their chat bubbles.
- **Sync**: Comments are simultaneously written to the Supabase database via an API route post request so they persist across sessions.

---

## 8. Front-End Layout & Responsive UI Elements
- **Bento Stat Board**: Displays total values (Owed to Me in green, I owe others in crimson, plus a styled consolidated Net row).
- **Group Details panel**: Contains active action matrices ("Settle Up", "Record Expense") alongside a member directory, a simplification toggle switch, and a scroll of transactions.
- **Expense Chat Overlay**: Sliding right-hand sidebar built atop dark themes that connects real-time, displays live socket indicators, and scrolls automatically.
- **UI Components**: Rendered with Radix UI primitives styled with Tailwind CSS utility classes and imported via shadcn/ui.
