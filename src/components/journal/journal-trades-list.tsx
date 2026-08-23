import { cn } from "@/lib/utils"

export interface JournalTrade {
  id: string
  symbol: string
  net_pnl: number
  result: "WIN" | "LOSS" | "BREAK EVEN"
  trade_type: "buy" | "sell"
  trade_rule_adherence?: { rule_id: string; status: "followed" | "broken" }[]
  trade_mistakes?: { mistakes: { name: string } | null }[]
}

export function JournalTradesList({ trades }: { trades: JournalTrade[] }) {
  if (trades.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-500">
        No trades logged yet.
      </div>
    )
  }

  const totalTrades = trades.length
  const totalNetPnl = trades.reduce((sum, t) => sum + Number(t.net_pnl), 0)

  return (
    <div className="mt-4 rounded-lg border border-white/5 bg-slate-950/50">
      <div className="flex flex-col p-2">
        {trades.map((trade, idx) => (
          <div key={trade.id} className="flex flex-col py-3 px-2 border-b border-white/5 last:border-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="w-6 text-xs text-slate-500 font-mono">#{idx + 1}</span>
                <span className="font-medium text-slate-300">{trade.symbol}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className={cn(
                  "font-medium tabular-nums", 
                  Number(trade.net_pnl) > 0 ? "text-emerald-400" : Number(trade.net_pnl) < 0 ? "text-red-400" : "text-slate-400"
                )}>
                  {Number(trade.net_pnl) > 0 ? "+" : ""}{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(trade.net_pnl))}
                </span>
                <span className={cn(
                  "w-[72px] text-center rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  trade.result === "WIN" ? "bg-emerald-500/10 text-emerald-400" :
                  trade.result === "LOSS" ? "bg-red-500/10 text-red-400" :
                  "bg-slate-500/10 text-slate-400"
                )}>
                  {trade.result}
                </span>
              </div>
            </div>
            {trade.trade_mistakes && trade.trade_mistakes.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2 pl-[40px]">
                {trade.trade_mistakes.map((tm, mIdx) => tm.mistakes?.name ? (
                  <span key={mIdx} className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                    {tm.mistakes.name}
                  </span>
                ) : null)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-white/10 bg-white/[0.02] p-4 text-sm font-medium text-slate-300">
        <span>{totalTrades} Trade{totalTrades !== 1 ? "s" : ""}</span>
        <span className={cn(
          "tabular-nums",
          totalNetPnl > 0 ? "text-emerald-400" : totalNetPnl < 0 ? "text-red-400" : "text-slate-400"
        )}>
          {totalNetPnl > 0 ? "+" : ""}{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totalNetPnl)}
        </span>
      </div>
    </div>
  )
}
