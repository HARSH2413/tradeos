import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { getSupabaseSession } from "@/lib/supabase/session"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { cn } from "@/lib/utils"

export async function RecentTrades() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return null

  const { data } = await supabase
    .from("trades")
    .select("id, symbol, date, trade_type, net_pnl, trade_return_percent")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5)

  const trades = (data as { id: string, symbol: string, date: string, trade_type: string, net_pnl: number, trade_return_percent: number }[]) ?? []

  return (
    <section className="flex flex-col rounded-xl border border-white/10 bg-slate-950 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Recent Trades</h2>
        <Link 
          href="/trades"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
        >
          View all <ArrowRight className="size-4" />
        </Link>
      </div>
      
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-white/5 text-slate-500">
              <th className="pb-2 font-medium">Symbol</th>
              <th className="pb-2 font-medium">Date</th>
              <th className="pb-2 font-medium text-right">P&L</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {trades.map(trade => (
              <tr key={trade.id} className="text-slate-300">
                <td className="py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[10px] font-bold",
                      trade.trade_type === "buy" ? "bg-blue-500/10 text-blue-400" : "bg-rose-500/10 text-rose-400"
                    )}>
                      {trade.trade_type === "buy" ? "B" : "S"}
                    </span>
                    <span className="font-medium">{trade.symbol}</span>
                  </div>
                </td>
                <td className="py-3">{trade.date}</td>
                <td className="py-3 text-right">
                  <div className="flex flex-col items-end">
                    <span className={cn("font-medium", Number(trade.net_pnl) >= 0 ? "text-emerald-400" : "text-rose-400")}>
                      {Number(trade.net_pnl) > 0 ? "+" : ""}{formatCurrency(Number(trade.net_pnl))}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {Number(trade.trade_return_percent) > 0 ? "+" : ""}{formatPercentage(Number(trade.trade_return_percent))}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-slate-500">No trades yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
