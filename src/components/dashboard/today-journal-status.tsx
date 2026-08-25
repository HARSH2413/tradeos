import Link from "next/link"
import { ArrowRight, CheckCircle2 } from "lucide-react"

import { formatCurrency } from "@/lib/formatters"
import type { JournalStatus } from "@/lib/journal/computeStatus"

interface TodayJournalStatusProps {
  status: JournalStatus
  tradesCount: number
  todayNetPnl: number
}

export function TodayJournalStatus({
  status,
  tradesCount,
  todayNetPnl,
}: TodayJournalStatusProps) {
  
  let content = null

  if (status === "planning") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-2">
          <span className="flex size-2 rounded-full bg-slate-500" />
          <span className="font-semibold text-slate-300">Planning</span>
        </div>
        <p className="text-sm text-slate-500 mb-6">Today&apos;s journal hasn&apos;t been completed yet.</p>
        <Link 
          href="/journal" 
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          Open Journal <ArrowRight className="size-4" />
        </Link>
      </>
    )
  } else if (status === "trading") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-2">
          <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="font-semibold text-amber-400">Trading</span>
        </div>
        <div className="text-sm text-slate-300 mb-6 space-y-1">
          <p>Pre-market plan completed.</p>
          <p className="text-slate-500">Trading in progress...</p>
        </div>
        <Link 
          href="/journal" 
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500/10 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
        >
          Open Journal <ArrowRight className="size-4" />
        </Link>
      </>
    )
  } else if (status === "reviewing") {
    content = (
      <>
        <div className="flex items-center gap-2 mb-2">
          <span className="flex size-2 rounded-full bg-rose-500" />
          <span className="font-semibold text-rose-400">Reviewing</span>
        </div>
        <div className="text-sm text-slate-300 mb-6 space-y-1">
          <p className="font-medium text-white">{tradesCount} trades &middot; <span className={todayNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>{todayNetPnl > 0 ? "+" : ""}{formatCurrency(todayNetPnl)}</span></p>
          <p className="text-slate-500">Post-market review pending.</p>
        </div>
        <Link 
          href="/journal" 
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
        >
          Complete Review <ArrowRight className="size-4" />
        </Link>
      </>
    )
  } else {
    content = (
      <>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="size-4 text-emerald-500" />
          <span className="font-semibold text-emerald-400">Completed</span>
        </div>
        <div className="text-sm text-slate-300 mb-6 space-y-1">
          <p className="font-medium text-white">{tradesCount} trades &middot; <span className={todayNetPnl >= 0 ? "text-emerald-400" : "text-rose-400"}>{todayNetPnl > 0 ? "+" : ""}{formatCurrency(todayNetPnl)}</span></p>
          <p className="text-emerald-500/80">Day completed.</p>
        </div>
        <Link 
          href="/journal" 
          className="mt-auto flex w-full items-center justify-center gap-2 rounded-lg bg-white/5 hover:bg-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors"
        >
          View Journal <ArrowRight className="size-4" />
        </Link>
      </>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-6 flex flex-col h-full">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-300">Today&apos;s Journal</h2>
      <div className="flex-1 flex flex-col">
        {content}
      </div>
    </div>
  )
}
