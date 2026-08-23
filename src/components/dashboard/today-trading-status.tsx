import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency, formatPercentage } from "@/lib/formatters"

interface TodayTradingStatusProps {
  todayNetPnl: number
  tradesCount: number
  winsCount: number
  lossesCount: number
  beginningEquity: number
  todayReturn: number
}

export function TodayTradingStatus({
  todayNetPnl,
  tradesCount,
  winsCount,
  lossesCount,
  beginningEquity,
  todayReturn,
}: TodayTradingStatusProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-6 flex flex-col">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-300">Today&apos;s Trading</h2>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 flex-1 mb-8">
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Net P&L</span>
          <span className={cn(
            "text-2xl font-semibold tabular-nums",
            todayNetPnl > 0 ? "text-emerald-400" : todayNetPnl < 0 ? "text-red-400" : "text-slate-200"
          )}>
            {todayNetPnl > 0 ? "+" : ""}{formatCurrency(todayNetPnl)}
          </span>
        </div>
        
        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Trades</span>
          <span className="text-2xl font-semibold text-slate-200">{tradesCount}</span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Win / Loss</span>
          <span className="text-2xl font-semibold text-slate-200">
            {winsCount}W <span className="text-slate-600">/</span> {lossesCount}L
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm text-slate-500">Today&apos;s Return</span>
          <span className={cn(
            "text-2xl font-semibold tabular-nums",
            todayReturn > 0 ? "text-emerald-400" : todayReturn < 0 ? "text-red-400" : "text-slate-200"
          )}>
            {todayReturn > 0 ? "+" : ""}{formatPercentage(todayReturn)}
          </span>
        </div>
      </div>
      
      <div className="flex items-center justify-between border-t border-white/5 pt-4">
        <div className="text-sm text-slate-500">
          Beginning Equity: <span className="font-medium text-slate-300">{formatCurrency(beginningEquity)}</span>
        </div>
        <Link 
          href="/trades" 
          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 transition-colors"
        >
          View Trades <ArrowRight className="size-4" />
        </Link>
      </div>
    </div>
  )
}
