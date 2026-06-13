import Link from 'next/link';
import { ArrowRight, Receipt, Users, MessageSquare, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="relative flex-1 flex flex-col justify-center items-center overflow-hidden bg-zinc-950 px-6 py-24 sm:py-32 lg:px-8">
      {/* Background glow effects */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.teal.900/15),theme(colors.zinc.950))]" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -z-10 h-[250px] w-[600px] rounded-full bg-teal-500/10 blur-[120px]" />
      
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />

      <div className="mx-auto max-w-2xl text-center">
        {/* Subtle pill badge */}
        <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-teal-500/10 text-teal-400 ring-1 ring-inset ring-teal-500/20 mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          <span>New: Real-time Group Expense Splitting</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Share Expenses, <br />
          <span className="bg-gradient-to-r from-teal-400 via-emerald-400 to-teal-500 bg-clip-text text-transparent">
            Without the Stress.
          </span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-400">
          The ultimate companion for travelers, roommates, and friends. Track bills, settle balances, and simplify debt calculations using our high-precision splitting math.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Link
            href="/login"
            className="group relative inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-zinc-950 bg-teal-400 rounded-xl hover:bg-teal-300 shadow-lg shadow-teal-500/20 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="#features"
            className="text-sm font-semibold leading-6 text-zinc-300 hover:text-white transition duration-200"
          >
            Learn more <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>

      {/* Feature Section Preview */}
      <div id="features" className="mx-auto mt-24 max-w-5xl sm:mt-32">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-6">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Group Rooms</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Create rooms for trips or houses. Invite friends instantly and track all costs in one unified directory.
            </p>
          </div>

          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-6">
              <Receipt className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">4 Splitting Engines</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Split bills equally, by exact percentages, custom shares, or unequal parts with perfect penny roundings.
            </p>
          </div>

          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 backdrop-blur-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-6">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Realtime Discussions</h3>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Resolve bills with instant in-app chat rooms, keeping communication simple and documented.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
