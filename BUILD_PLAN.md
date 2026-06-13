# BUILD_PLAN.md: Engineering & Execution Roadmap

## 1. Product Research
*   **How I studied Splitwise:** I analyzed the core user journeys: adding friends, creating trips, logging complex expenses (equal, exact, percentage), and settling up. I evaluated the utilitarian UI (flat design, Left Sidebar, Teal/Orange color indicators).
*   **What I learned:** The core "magic" is the mathematical ledger. The system must perfectly calculate `Net Balance = Amount Paid - Assigned Share` and absorb floating-point rounding errors (extra cents).
*   **Workflows identified:** Auth -> Add Global Friend -> Create Group -> Add Expense (with Split Validation) -> Real-time Chat -> Settle Up.
*   **Product Assumptions:** I assumed that while users desire real UPI/Razorpay integrations, a robust "manual ledger" system is sufficient for the MVP to prove the relational database architecture is sound.

## 2. Architecture
*   **Tech Stack:** Next.js 14 (App Router) with TypeScript, Tailwind CSS, Supabase (PostgreSQL, Auth, Realtime WebSockets), Drizzle ORM, and Vercel.
*   **Database Schema:** A strict relational structure utilizing `users`, `friends`, `groups`, `group_members`, `expenses`, `expense_payments` (for multi-payers), `splits`, `chats`, and `settlements`. 
*   **API Design:** Next.js Serverless Route Handlers executing Drizzle ORM transactions.
*   **Frontend Structure:** Client-side React components for Modals and Forms, Server-Side Rendered pages for dashboards and ledgers to maximize speed.
*   **Deployment Approach:** Git repository linked directly to Vercel for continuous integration and automated deployments. Environment variables securely injected via Vercel dashboard.

## 3. AI Collaboration Process
*   **How I instructed the AI:** I acted as the Product Manager and Senior Architect. I enforced strict boundaries on the tech stack and provided the exact mathematical formulas required.
*   **What questions the AI asked:** The AI asked about scope (e.g., "Do we need multiple currencies?", "How should rounding pennies be handled?", "Should we use Express or Next.js?").
*   **How I answered:** I defined the 2-day MVP constraints. I instructed it to give the extra penny to the payer, handle currencies via UI dropdowns, and forced the pivot to Next.js + Supabase.
*   **How the plan evolved:** Initially, the AI generated a complex Express + Vite + Cloud SQL plan. I halted the implementation, ordered a wipe, and pivoted to Next.js App Router for faster deployment. Later, I ordered a UI rewrite to remove "dark mode" and mirror Splitwise's exact Left Sidebar layout.
*   **How AI_CONTEXT.md was maintained:** I explicitly commanded the AI to update the context file whenever a major architectural change occurred (e.g., adding the Global Friends system) or to preserve my Phase 2 product visions (UPI, Chatbots).

## 4. Tradeoffs
*   **What I simplified:** I simulated email invitations using UI Toast notifications instead of configuring a real SMTP server to save time. Multi-currency support exists as a label, but real-time exchange rate conversion was omitted.
*   **What I hardcoded:** The "Simplify Debts" algorithm runs eagerly on the client/API side rather than using complex, recursive PostgreSQL triggers.
*   **What I avoided:** I explicitly scoped out OCR receipt photo scanning, AI Chatbot summarizers, and group voting systems for disputed settlements. 
*   **Why:** These features introduce high risk for a 48-hour deadline. They were documented in the `AI_CONTEXT.md` as a "Phase 2 Roadmap" to prove product thinking, while focusing engineering effort on a bug-free, mathematically sound core MVP.

## 5. What I would improve with more time
*   Integrate Razorpay and UPI deep-linking to allow users to settle debts with real money directly through the app.
*   Implement OCR (Optical Character Recognition) so users can upload grocery receipts and the app automatically itemizes the splits.
*   Build the "Dispute Voting Protocol" to democratize rejected settlements within a group.