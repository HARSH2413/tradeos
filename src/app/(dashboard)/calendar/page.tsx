import Link from "next/link"
import { Metadata } from "next"
import { redirect } from "next/navigation"
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
} from "date-fns"
import { Star, BookOpen, Bot } from "lucide-react"

import { MonthSelector } from "@/components/dashboard/month-selector"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateDailyPnlPercent, getTradeResult } from "@/lib/calculations"
import { getEquityAtDate } from "@/lib/finance/equity"
import { type AppTrade, type AppSettings, type AppTradingDay, type AppCapitalTransaction } from "@/lib/dashboard-data"
import { formatCurrency, formatCompactCurrency, formatPercentage } from "@/lib/formatters"
import { getSupabaseSession } from "@/lib/supabase/session"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Calendar | Dashboard",
  description: "View your trades and daily performance on a calendar.",
}

export const revalidate = 30

export default async function CalendarPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string; day?: string }>
}) {
  const params = (await searchParams) ?? {}
  const { supabase, user } = await getSupabaseSession()

  if (!user) redirect("/login")

  const selectedMonth = params.month ? parseISO(`${params.month}-01`) : new Date()
  const monthKey = format(selectedMonth, "yyyy-MM")
  const monthStart = startOfMonth(selectedMonth)
  const monthEnd = endOfMonth(selectedMonth)
  const [
    { data: settingsData }, 
    { data: tradesData }, 
    { data: daysData }, 
    { data: allDatesRaw }, 
    { data: statsData }, 
    startEquityData, 
    { data: capitalData }
  ] = await Promise.all([
    supabase
      .from("settings")
      .select("default_brokerage,default_tax")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("trades")
      .select("*,strategies(name)")
      .eq("user_id", user.id)
      .gte("date", format(monthStart, "yyyy-MM-dd"))
      .lte("date", format(monthEnd, "yyyy-MM-dd"))
      .order("date", { ascending: true }),
    supabase
      .from("trading_days")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", format(monthStart, "yyyy-MM-dd"))
      .lte("date", format(monthEnd, "yyyy-MM-dd")),
    supabase
      .from("trades")
      .select("date")
      .eq("user_id", user.id)
      .order("date", { ascending: false }),
    // Fetch equity for accurate daily P&L % — see financial-model.ts
    supabase.rpc("get_dashboard_stats", { p_user_id: user.id }),
    // Fetch start-of-month equity for cash-flow adjusted daily returns
    getEquityAtDate(supabase, user.id, format(subDays(new Date(monthStart), 1), "yyyy-MM-dd")),
    // Fetch this month's capital transactions
    supabase
      .from("capital_transactions")
      .select("*")
      .eq("user_id", user.id)
      .gte("date", format(monthStart, "yyyy-MM-dd"))
      .lte("date", format(monthEnd, "yyyy-MM-dd"))
      .order("date", { ascending: true }),
  ])

  const settings = settingsData as AppSettings | null
  const trades = (tradesData ?? []) as AppTrade[]
  const tradingDaysList = (daysData ?? []) as AppTradingDay[]
  const monthStartEquity = Number(startEquityData ?? 0)
  const capitalTxs = (capitalData ?? []) as AppCapitalTransaction[]
  
  const allDates = (allDatesRaw ?? []) as { date: string }[]
  const months = Array.from(new Set(allDates.map((t) => t.date.slice(0, 7))))
  const days = eachDayOfInterval({
    start: startOfWeek(monthStart),
    end: endOfWeek(monthEnd),
  })
  const tradesByDay = groupTradesByDay(trades)
  
  const tradingDaysByDate = new Map<string, AppTradingDay[]>()
  for (const td of tradingDaysList) {
    const existing = tradingDaysByDate.get(td.date) || []
    tradingDaysByDate.set(td.date, [...existing, td])
  }

  // Pre-calculate Beginning Equity for each day to do proper cash-flow adjusted daily returns
  const beginningEquityByDate = new Map<string, number>()
  let runningEquity = monthStartEquity
  
  // Sort all unique days in the month
  const allDaysInMonth = eachDayOfInterval({ start: new Date(monthStart), end: new Date(monthEnd) })
  for (const dateObj of allDaysInMonth) {
    const dateStr = format(dateObj, "yyyy-MM-dd")
    beginningEquityByDate.set(dateStr, runningEquity)
    
    // Calculate end-of-day equity for tomorrow's beginning equity
    const dayTrades = tradesByDay.get(dateStr) ?? []
    const dayPnl = dayTrades.reduce((sum, trade) => sum + trade.net_pnl, 0)
    
    const dayDeposits = capitalTxs
      .filter((tx) => tx.date.startsWith(dateStr) && tx.transaction_type === "deposit")
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
      
    const dayWithdrawals = capitalTxs
      .filter((tx) => tx.date.startsWith(dateStr) && tx.transaction_type === "withdrawal")
      .reduce((sum, tx) => sum + Number(tx.amount), 0)
      
    runningEquity = runningEquity + dayPnl + dayDeposits - dayWithdrawals
  }

  const selectedDay = params.day
  const selectedTrades = selectedDay ? tradesByDay.get(selectedDay) ?? [] : []
  const selectedNetPnl = selectedTrades.reduce((sum, trade) => sum + trade.net_pnl, 0)
  const selectedTradingDays = selectedDay ? (tradingDaysByDate.get(selectedDay) || []) : []
  
  const monthNetPnl = trades.reduce((sum, trade) => sum + trade.net_pnl, 0)
  const monthGrossPnl = trades.reduce((sum, trade) => sum + trade.gross_pnl, 0)
  const monthBrokerage = trades.reduce((sum, trade) => sum + trade.brokerage, 0)
  const monthTaxes = trades.reduce((sum, trade) => sum + trade.taxes, 0)

  const previousMonth = format(subMonths(selectedMonth, 1), "yyyy-MM")
  const nextMonth = format(addMonths(selectedMonth, 1), "yyyy-MM")

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
            Calendar
          </p>
          <div className="mt-2 flex items-center gap-3">
            <MonthSelector months={months} currentMonth={monthKey} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5" href={`/calendar?month=${previousMonth}`}>
            Previous
          </Link>
          <Link className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5" href={`/calendar?month=${nextMonth}`}>
            Next
          </Link>
        </div>
      </div>

      <Card className="border-white/10 bg-white/[0.035]">
        <CardContent className="p-3">
          <div className="grid grid-cols-7 gap-2 pb-2 text-center text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day}>{day}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayTrades = tradesByDay.get(key) ?? []
              const netPnl = dayTrades.reduce((sum, trade) => sum + trade.net_pnl, 0)
              
              // Daily Return = Adjusted P&L (which is netPnl) / Beginning Equity
              const dayBeginningEquity = beginningEquityByDate.get(key) ?? 10000
              const dailyReturn = calculateDailyPnlPercent(netPnl, dayBeginningEquity)

              return (
                <Link
                  key={key}
                  href={`/calendar?month=${monthKey}&day=${key}`}
                  className={cn(
                    "relative min-h-28 rounded-lg border p-3 transition hover:border-emerald-400/40",
                    isSameMonth(day, selectedMonth) ? "border-white/10 bg-slate-950" : "border-white/5 bg-slate-950/40 opacity-50",
                    dayTrades.length > 0 && netPnl > 0 && "border-emerald-400/20 bg-emerald-400/10",
                    dayTrades.length > 0 && netPnl < 0 && "border-red-400/20 bg-red-400/10",
                    dayTrades.length > 0 && netPnl === 0 && "border-amber-400/20 bg-amber-400/10",
                    selectedDay === key && "ring-2 ring-emerald-300/40"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="text-sm font-semibold text-white">{format(day, "d")}</div>
                    
                    {tradingDaysByDate.has(key) && (
                      <div className="flex gap-1">
                        {tradingDaysByDate.get(key)!.some(d => d.post_market_completed) && (
                          <Star className="size-3 text-yellow-500 fill-yellow-500" />
                        )}
                        {tradingDaysByDate.get(key)!.some(d => d.pre_market_completed && !d.post_market_completed) && (
                          <BookOpen className="size-3 text-blue-400" />
                        )}
                        {/* Placeholder for AI Complete */}
                        {false && <Bot className="size-3 text-purple-400" />}
                      </div>
                    )}
                  </div>
                  {dayTrades.length > 0 && (
                    <div className="mt-4 space-y-1 text-xs">
                      <p className={cn("font-medium", netPnl >= 0 ? "text-emerald-200" : "text-red-200")}>
                        {netPnl > 0 ? "+" : ""}{formatCompactCurrency(netPnl)}
                      </p>
                      <p className={dailyReturn >= 0 ? "text-emerald-300" : "text-red-300"}>
                        {formatPercentage(dailyReturn)}
                      </p>
                      <p className="text-slate-400">{dayTrades.length} trades</p>
                    </div>
                  )}
                </Link>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-white">Summary</h2>
        <Card className="border-white/10 bg-white/[0.035]">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 gap-y-6">
              <div>
                <p className="text-sm text-slate-500">Net P&L</p>
                <p className={cn("mt-1 text-2xl font-semibold", monthNetPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {formatCurrency(monthNetPnl)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Gross P&L</p>
                <p className={cn("mt-1 text-2xl font-semibold", monthGrossPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                  {formatCurrency(monthGrossPnl)}
                </p>
              </div>
              
              <div className="col-span-2 border-t border-white/10"></div>
              
              <div>
                <p className="text-sm text-slate-500">Brokerage</p>
                <p className="mt-1 text-lg font-medium text-white">
                  {formatCurrency(monthBrokerage)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Regulatory charges</p>
                <p className="mt-1 text-lg font-medium text-white">
                  {formatCurrency(monthTaxes)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {selectedDay && (
        <div className="space-y-4">
          {selectedTradingDays.length > 0 && (
            <Card className="border-white/10 bg-white/[0.035]">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-lg">Journal Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {selectedTradingDays.map((day) => (
                  <div key={day.id} className="grid gap-4 sm:grid-cols-4 text-sm items-center border-b border-white/5 pb-4 last:border-0 last:pb-0">

                    <div>
                      <p className="text-slate-500 mb-1">Prediction / Bias</p>
                      <div className="flex gap-2">
                        {day.market_bias ? (
                          <Badge variant="outline" className={cn("border-white/10 bg-slate-900", day.market_bias === "bullish" ? "text-emerald-400" : day.market_bias === "bearish" ? "text-red-400" : "text-amber-400")}>
                            {day.market_bias.toUpperCase()}
                          </Badge>
                        ) : <span className="text-slate-600">—</span>}
                        {day.expected_market && (
                          <Badge variant="outline" className="border-white/10 bg-slate-900 text-slate-300">
                            {day.expected_market}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Execution</p>
                      <p className="font-medium text-slate-300">
                        {day.plan_followed ? day.plan_followed.toUpperCase() : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Day Rating</p>
                      <p className={cn("font-bold text-lg", day.overall_day_rating ? (day.overall_day_rating >= 8 ? "text-emerald-400" : day.overall_day_rating >= 5 ? "text-amber-400" : "text-red-400") : "text-slate-600")}>
                        {day.overall_day_rating ? `${day.overall_day_rating}/10` : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card className="border-white/10 bg-white/[0.035]">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-white">
              {format(parseISO(selectedDay), "dd MMM yyyy")} · {formatCurrency(selectedNetPnl)}
            </CardTitle>
            <Link 
              href={`/journal?date=${selectedDay}`}
              className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-emerald-500/20"
            >
              View Journal
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedTrades.length === 0 ? (
              <p className="text-sm text-slate-500">No trades for this day.</p>
            ) : (
              selectedTrades.map((trade) => {
                const result = getTradeResult(trade.net_pnl)
                return (
                  <div key={trade.id} className="grid grid-cols-1 gap-4 rounded-lg border border-white/10 bg-slate-950 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="font-semibold text-white">{trade.symbol}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        <span className={trade.trade_type === "buy" ? "text-emerald-400 font-medium uppercase" : "text-red-400 font-medium uppercase"}>{trade.trade_type}</span>
                        {" "}· {trade.quantity} qty
                      </p>
                      <p className="mt-1 text-xs text-slate-500 line-clamp-1">{trade.strategies?.name ?? "No strategy"}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Entry & Exit</p>
                      <p className="text-sm text-slate-300">
                        In: {formatCurrency(trade.entry_price)}
                      </p>
                      <p className="text-sm text-slate-300">
                        Out: {formatCurrency(trade.exit_price)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Capital</p>
                      <p className="text-sm text-slate-300">
                        Used: {formatCurrency(trade.capital_used)}
                      </p>
                      <p className="text-sm text-slate-300">
                        Return: {formatPercentage(trade.trade_return_percent)}
                      </p>
                    </div>

                    <div className="flex flex-col items-start justify-center gap-2 sm:items-end">
                      <span className={cn("text-lg font-semibold", trade.net_pnl >= 0 ? "text-emerald-300" : "text-red-300")}>
                        {formatCurrency(trade.net_pnl)}
                      </span>
                      <Badge className={result === "WIN" ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-200" : result === "LOSS" ? "bg-red-400/10 border-red-400/20 text-red-200" : "bg-amber-400/10 border-amber-400/20 text-amber-200"}>
                        {result}
                      </Badge>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
        </div>
      )}
    </div>
  )
}

function groupTradesByDay(trades: AppTrade[]) {
  const grouped = new Map<string, AppTrade[]>()
  for (const trade of trades) {
    grouped.set(trade.date, [...(grouped.get(trade.date) ?? []), trade])
  }
  return grouped
}
