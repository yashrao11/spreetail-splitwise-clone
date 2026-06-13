# AI_CONTEXT.md: Spreetail Splitwise Clone

## 1. Product Understanding
The app is a refined, full-stack clone of Splitwise, built to eliminate the cognitive load of calculating "who owes whom."
*   **The "Magic":** A synchronized platform with multiple layers and groups where users don't have the fatigue of remembering every shared expense on a trip, holiday, or shared apartment. Everything is in one place, instantly updating debts, history, and pendency easily.
*   **Target User Personas:** Multi-device users logging in securely. They value speed, exact mathematical splitting across currencies, and immediate local communication to iron out payment questions.

## 2. Product Scope
**MVP (In-Scope for the 2-Day Build)**
*   **Authentication:** Real-world user sign-in via Supabase Auth.
*   **Global Friends System:** Users can add existing friends by Email/Name before adding them to groups.
*   **Group Management:** Create groups, add friends, and remove users. *Strict Business Rule:* A user cannot be removed from a group if they have an active outstanding balance.
*   **Expense Management:** Support for standard currencies (USD, EUR, GBP, INR). Includes editing and deleting expenses.
*   **Real-Time Contextual Chat:** Instant chat threads nested directly inside individual expenses using WebSockets.
*   **Simplified Debt Settlement:** "Settle Up" feature to record cash payments between users.

**Future Product Vision & Phase 2 Roadmap (Out of Scope for 48h MVP)**
*The following features are part of the core product vision but were deferred to Phase 2 to ensure database stability within the strict 2-day deadline:*
1.  **Payment Gateways:** Integration with real payment gateways (UPI, Razorpay, Credit Cards for Indian/Global users) for automated settle-up verification.
2.  **AI Expense Chatbot Summarizer:** A conversational LLM helper to review group histories, summarize who spent the most, identify waste, and forecast costs based on user prompts.
3.  **Dispute Voting Protocol:** If a user logs a payment on behalf of another, the recipient must accept or deny. If denied with a reason, a group poll occurs (excluding the two parties) where the majority wins.
4.  **Photographic Proof:** High-resolution receipt/photo attachments under the payer's transaction with historical timestamps.

## 3. Implementation Decisions
*   **Framework Pivot:** The initial AI blueprint suggested Express.js + Vite + Google Cloud SQL. I recognized this would jeopardize the 2-day deployment deadline. I immediately forced a pivot to a unified **Next.js App Router + Supabase** stack for serverless API routes and zero cold-starts.
*   **UI/UX Aesthetic:** Shifted from an AI-generated "glassmorphic" dark mode to an authentic, utilitarian Splitwise clone. Implemented a Left Sidebar layout, flat white cards (`bg-white`), and strict Splitwise color codes (Teal `#5bc5a7` for positive balances, Orange `#ff652f` for debts).
*   **Email Simulation:** Instead of configuring an SMTP server (which takes hours), friend invitations trigger a realistic UI Toast Notification and create a database stub.

## 4. Engineering Requirements & Math Logic
The most critical engineering requirement is the mathematical engine.
*   **Net Balance Formula:** `Net Balance = Amount Paid - Assigned Share`. (e.g., If User A pays $100 and splits equally with User B, User A's share is $50. User A's Net = +$50. User B's Net = -$50).
*   **Equal Splits:** Divides the total cost equally. *Crucial Rule:* Any remaining precision rounding fractions (e.g., splitting $10.00 among 3 people = $3.33, $3.33) leave 1 extra cent. That extra cent is explicitly allocated to the group creator or payer.
*   **Unequal & Percentage:** Precise numeric declarations. UI validates that the sum exactly equals the total or 100%.
*   **Shares:** Splits by weight ratio (e.g., 2 shares vs 1 share).
*   **Simplify Debts:** A greedy heap-based settlement minimizer that collapses cyclic debts (if A owes B $10 and B owes C $10, A pays C $10 directly).

## 5. Tech Stack
*   **Frontend & API:** Next.js 14 (App Router), React, TypeScript.
*   **Styling:** Tailwind CSS, shadcn/ui, Lucide Icons.
*   **Database & Auth:** Supabase (PostgreSQL), Supabase Auth (Server-Side Rendering).
*   **Real-Time Engine:** Supabase Realtime (WebSockets).
*   **ORM Layer:** Drizzle ORM.
*   **Deployment:** Vercel.

## 6. Database Schema (PostgreSQL via Drizzle)
*   `users`: `id`, `uid` (Supabase Auth UUID), `email`, `display_name`.
*   `friends`: Junction table linking `user_id_1` and `user_id_2`.
*   `groups`: Group metadata (`name`, `currency`).
*   `group_members`: Links `users` and `groups` (Cascade deletes).
*   `expenses`: `total_amount`, `payer_id`, `split_type`, `group_id`.
*   `expense_payments`: Supports multi-payer transactions (how much each user physically paid).
*   `splits`: Exact owed amounts assigned to specific users.
*   `chats`: WebSocket chat messages tied to an `expense_id`.
*   `settlements`: Records manual payments to clear balances.

## 7. API Design
*   `GET /api/groups`: Fetches user's groups.
*   `POST /api/friends`: Adds a friend by email.
*   `POST /api/groups/[id]/expenses`: Wrapped in a database transaction. Inserts expense, payments, and splits simultaneously.
*   `POST /api/settlements`: Records cash transfers and updates net balances.

## 8. Frontend Structure
*   **Navigation:** Left Sidebar (Dashboard, Recent Activity, Friends list, Groups list).
*   `/dashboard`: Aggregated total balances (Owed to You vs. You Owe).
*   `/groups/[id]`: Group-specific ledger, member list, and specific pairwise balances.
*   **Modals:** Centralized logic for `AddExpenseModal`, `CreateGroupModal`, and `SettleUpModal`.

## 9. Prompts and AI Responses (Collaboration Summary)
*   *Prompt:* "Design a database schema for an expense sharing app." -> *Response:* Basic tables. I corrected it to include `expense_payments` for multi-payer support and a `friends` table.
*   *Prompt:* "The UI looks too AI-generated (dark mode)." -> *Response:* Reskinned to flat white, teal buttons, and a Left Sidebar.
*   *Prompt:* "The math logic is backwards. Payer is showing as owing money." -> *Response:* AI updated the aggregation queries to strictly follow `Net = Paid - Split`.

## 10. Changes Made During Implementation
*   **Dashboard Aggregation:** The initial build failed to calculate global balances. Re-architected the Drizzle query to correctly aggregate `splits`, `expenses`, and `settlements` across all groups.
*   **Hydration Errors:** Fixed React Server vs. Client date-formatting mismatches by suppressing hydration warnings on timestamps.

## 11. Known Limitations
*   Real payment integrations (UPI/Razorpay) are UI placeholders; they currently record as manual cash settlements.
*   Multi-currency conversion relies on the group's default currency; real-time FX rates are not implemented.