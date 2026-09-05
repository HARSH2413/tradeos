import { formatPercentage } from "@/lib/formatters"
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

  // First, group trades by unique date to get daily P&L
  const dailyPnlMap = new Map<string, number>()
  
  trades.forEach(trade => {
    const dateStr = trade.date.slice(0, 10)
    dailyPnlMap.set(dateStr, (dailyPnlMap.get(dateStr) ?? 0) + Number(trade.net_pnl))
  })

  // Then, aggregate the daily results by day of the week
  dailyPnlMap.forEach((dayNetPnl, dateStr) => {
    const date = parseISO(dateStr)
    const dayOfWeek = getDay(date)
    
    if (dayStats.has(dayOfWeek)) {
      const stats = dayStats.get(dayOfWeek)!
      stats.count += 1
      stats.pnl += dayNetPnl
      if (dayNetPnl > 0) {
        stats.wins += 1
      }
    }
  })

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950 p-6 flex flex-col h-full">
      <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-300">Performance by Day</h2>
      
      <div className="flex-1 space-y-4">
        {DAYS.map(day => {
          const stats = dayStats.get(day.id)!
          const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0
          
          return (
            <div key={day.id} className="group">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-300 text-sm">{day.full}</span>
                <span className="text-sm font-medium tabular-nums text-emerald-400">
                  {formatPercentage(winRate)}
                </span>
              </div>
              
              <div className="h-1.5 w-full bg-white/[0.03] rounded-full overflow-hidden flex items-center">
                <div 
                  className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                  style={{ width: `${winRate}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
