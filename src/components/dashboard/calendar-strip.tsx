import Link from "next/link"
import { format, subDays } from "date-fns"
import { ArrowRight } from "lucide-react"

import { getSupabaseSession } from "@/lib/supabase/session"
import { cn } from "@/lib/utils"

export async function CalendarStrip() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return null

  // Get last 7 days
  const today = new Date()
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    return format(subDays(today, 6 - i), "yyyy-MM-dd")
  })

  const { data: rawData } = await supabase
    .from("trading_days")
    .select("date, trades(net_pnl)")
    .eq("user_id", user.id)
    .gte("date", last7Days[0])

  const data = rawData as { date: string; trades: unknown }[] | null

  const dayStatus = last7Days.map(dateStr => {
    const dayData = data?.find(d => d.date === dateStr)
    let status = "none"
    if (dayData) {
      const trades = Array.isArray(dayData.trades) ? dayData.trades : []
      if (trades.length === 0) {
        status = "neutral"
      } else {
        const pnl = trades.reduce((sum: number, t: { net_pnl: number | string }) => sum + Number(t.net_pnl), 0)
        status = pnl > 0 ? "profit" : (pnl < 0 ? "loss" : "neutral")
      }
    }
    return {
      date: dateStr,
      status
    }
  })

  return (
    <section className="rounded-xl border border-white/10 bg-slate-950 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Last 7 Days</h2>
        <Link 
          href="/calendar"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-white"
        >
          View Calendar <ArrowRight className="size-4" />
        </Link>
      </div>
      <div className="flex gap-2">
        {dayStatus.map(day => (
          <div 
            key={day.date}
            title={day.date}
            className={cn(
              "h-12 flex-1 rounded-md border",
              day.status === "profit" ? "bg-emerald-500/20 border-emerald-500/30" :
              day.status === "loss" ? "bg-rose-500/20 border-rose-500/30" :
              day.status === "neutral" ? "bg-slate-700/50 border-slate-600" :
              "bg-slate-900/50 border-white/5"
            )}
          />
        ))}
      </div>
    </section>
  )
}
