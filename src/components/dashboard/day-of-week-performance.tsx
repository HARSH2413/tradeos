import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { parseISO, getDay } from "date-fns"

interface DayOfWeekPerformanceProps {
  trades: { date: string; net_pnl: number }[]
}

const DAYS = [
  { id: 1, name: "Mon", full: "Monday" },
  { id: 2, name: "Tue", full: "Tuesday" },
  { id: 3, name: "Wed", full: "Wednesday" },
  { id: 4, name: "Thu", full: "Thursday" },
  { id: 5, name: "Fri", full: "Friday" },
]

export function DayOfWeekPerformance({ trades }: DayOfWeekPerformanceProps) {
  // Aggregate data by day of week
  const dayStats = new Map<number, { count: number; wins: number; pnl: number }>()
  
  DAYS.forEach(day => {
    dayStats.set(day.id, { count: 0, wins: 0, pnl: 0 })
  })

  trades.forEach(trade => {
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    const date = parseISO(trade.date)
    const dayOfWeek = getDay(date)
    
    if (dayStats.has(dayOfWeek)) {
      const stats = dayStats.get(dayOfWeek)!
      stats.count += 1
      stats.pnl += Number(trade.net_pnl)
      if (Number(trade.net_pnl) > 0) {
        stats.wins += 1
      }
    }
  })

  // Find max absolute PnL for scaling the bars
  const maxAbsPnl = Math.max(...Array.from(dayStats.values()).map(s => Math.abs(s.pnl)), 1) // avoid div by 0

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-6 flex flex-col h-full">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-300">Performance by Day</h2>
      
      <div className="flex-1 space-y-4">
        {DAYS.map(day => {
          const stats = dayStats.get(day.id)!
          const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0
          const isProfitable = stats.pnl >= 0
          
          // Width percentage based on max PnL (cap at 100%)
          const pnlWidth = Math.min((Math.abs(stats.pnl) / maxAbsPnl) * 100, 100)
          
          return (
            <div key={day.id} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-300 text-sm">{day.full}</span>
                  <span className="text-xs text-slate-500 hidden sm:inline">
                    ({stats.count} trade{stats.count !== 1 && "s"})
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400">
                    WR: {formatPercentage(winRate)}
                  </span>
                  <span className={`text-sm font-medium tabular-nums ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
                    {isProfitable ? "+" : ""}{formatCurrency(stats.pnl)}
                  </span>
                </div>
              </div>
              
              <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden flex items-center">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isProfitable ? "bg-emerald-500" : "bg-rose-500"}`}
                  style={{ width: `${pnlWidth}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
