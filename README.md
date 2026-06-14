# Spreetail Splitwise Clone

A full-stack, real-time financial utility application designed to track shared expenses and balances among friends, roommates, and groups. Built as part of the Spreetail Software Engineering Internship Assessment.

🔗 **[Live Public URL]** -> *(https://spreetail-splitwise-clone.vercel.app/dashboard)*

## 🚀 Tech Stack
* **Frontend:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui.
* **Backend:** Next.js Serverless Route Handlers.
* **Database & Auth:** Supabase (PostgreSQL), Supabase Auth.
* **ORM:** Drizzle ORM.
* **Real-time Engine:** Supabase Realtime (WebSockets) for live expense chats.

## ✨ Core Features
* **Authentication:** Secure login and registration via Supabase.
* **Global Friends & Groups:** Add friends by email/name and organize them into specific share rooms.
* **Precision Expense Engine:** Split bills 4 ways: Equally, Exact Amounts, Percentages, and Proportional Shares. Includes multi-payer support.
* **Live Chat:** Real-time, instant messaging inside individual expenses using WebSockets.
* **Settle Up:** Dynamic cash transaction logging to minimize and clear outstanding debts.
* **Light/Dark Theme:** Fully responsive, accessible, and themeable UI.

---

## 🛠️ Local Setup Instructions

To run this project locally on your machine, follow these steps:

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/spreetail-splitwise-clone.git
cd spreetail-splitwise-clone
2. Install dependencies
code
Bash
npm install
3. Configure Environment Variables
Create a .env.local file in the root directory and add your Supabase credentials:
code
Env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
DATABASE_URL=your_supabase_postgres_connection_string
4. Push the Database Schema
Ensure Drizzle ORM pushes the relational tables to your Supabase instance:
code
Bash
npx drizzle-kit push
5. Run the Development Server
code
Bash
npm run dev
Open http://localhost:3000 with your browser to see the result.
🤖 AI Collaboration Process
As per the assignment requirements, this application was built using an AI collaborator (Cursor IDE's inbuilt agent / Claude 3.5 Sonnet).
How I directed the AI:
Architectural Authority: I acted as the Senior Engineer. When the AI initially suggested an overly complex Express/Vite/Cloud SQL architecture, I forced a pivot to Next.js and Supabase to guarantee deployment success within the 48-hour deadline.
Mathematical Logic Validation: I strictly defined the math engine algorithms (Net Balance = Paid - Share) to prevent the AI from generating backwards financial logic (a common hallucination in AI coding).
Product Vision: I directed the AI to maintain a rigorous AI_CONTEXT.md file, explicitly separating MVP features from Phase 2 product visions (UPI integrations, Dispute Voting) to manage scope creep while demonstrating product thinking.
For complete details on the architecture, schema, and trade-offs, please view AI_CONTEXT.md and BUILD_PLAN.md included in this repository.
