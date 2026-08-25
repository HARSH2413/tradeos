import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"

import { calculateWinRate, generateDailyPerformanceRecords } from "@/lib/calculations"
import { getEquityAtDate } from "@/lib/finance/equity"
import { type AppTrade } from "@/lib/dashboard-data"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { getSupabaseSession } from "@/lib/supabase/session"

export const metadata: Metadata = {
  title: "Monthly Reports | Dashboard",
  description: "View your trading performance reports by month — each month in isolation.",
}

export const revalidate = 60

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>
}) {
  const params = (await searchParams) ?? {}
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  // Lightweight fetch: just dates to derive month list
  const { data: allDatesRaw } = await supabase
    .from("trades")
    .select("date")
    .eq("user_id", user.id)
    .order("date", { ascending: false })

  const allDates = (allDatesRaw ?? []) as { date: string }[]
  const months = Array.from(new Set(allDates.map((t) => t.date.slice(0, 7))))
  const month = params.month ?? months[0] ?? new Date().toISOString().slice(0, 7)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">Monthly View</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Monthly Reports</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Each month is shown in isolation — starting balance is the ending balance of the previous month, not your original capital.
        </p>
      </div>

      {months.length === 0 ? (
        <Card className="border-white/10 bg-white/[0.035]">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">No trades recorded yet. Add some trades to see monthly reports.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <form className="flex items-center gap-3">
            <select
              name="month"
              defaultValue={month}
              className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
            >
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <button
              type="submit"
              className="h-9 rounded-lg bg-emerald-400 px-4 text-sm font-medium text-slate-950 transition hover:bg-emerald-300"
            >
              View
            </button>
          </form>

          <Suspense fallback={<ReportSkeleton />} key={month}>
            <ReportContent userId={user.id} month={month} />
          </Suspense>
        </>
      )}
    </div>
  )
}



async function ReportContent({ userId, month }: { userId: string; month: string }) {
  const { supabase } = await getSupabaseSession()
  const [year, mon] = month.split("-").map(Number)
  const monthStart = `${month}-01`
  const monthEnd = new Date(year, mon, 0).toISOString().slice(0, 10)
  // Day before this month = last day of previous month
  const prevMonthEnd = new Date(year, mon - 1, 0).toISOString().slice(0, 10)

  const [monthStartingEquity, monthTradesResult, capitalTxsResult, mistakesResult] = await Promise.all([
    getEquityAtDate(supabase, userId, prevMonthEnd),
    // This month's trades — full data
    supabase
      .from("trades")
      .select("id,date,symbol,trade_type,net_pnl,brokerage,taxes,strategy_id,strategies(name),trade_mistakes(mistake_id),mistakes(name)")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: false }),
    // This month's capital transactions
    supabase
      .from("capital_transactions")
      .select("*")
      .eq("user_id", userId)
      .gte("date", monthStart)
      .lte("date", monthEnd)
      .order("date", { ascending: true }),
    // Mistakes list for names
    supabase.from("mistakes").select("id,name"),
  ])

  type TradeRow = AppTrade & {
    strategies: { name: string } | null
    trade_mistakes: { mistake_id: string }[]
  }

  const monthTrades = (monthTradesResult.data ?? []) as TradeRow[]
  const capitalTxs = (capitalTxsResult.data ?? []) as { date: string; transaction_type: string; amount: number }[]
  const mistakesList = (mistakesResult.data ?? []) as { id: string; name: string }[]

  // Compute this month's stats using daily records for cash-flow-adjusted Time-Weighted Return (TWR)
  const dailyRecords = generateDailyPerformanceRecords(monthTrades, capitalTxs, monthStartingEquity)
  
  const monthDeposits = capitalTxs.filter(tx => tx.transaction_type === "deposit").reduce((sum, tx) => sum + Number(tx.amount), 0)
  const monthWithdrawals = capitalTxs.filter(tx => tx.transaction_type === "withdrawal").reduce((sum, tx) => sum + Number(tx.amount), 0)
  
  const monthNetPnl = monthTrades.reduce((sum, t) => sum + Number(t.net_pnl), 0)
  
  let twrMultiplier = 1
  for (const record of dailyRecords) {
    twrMultiplier *= (1 + record.return_percent / 100)
  }
  const monthReturn = (twrMultiplier - 1) * 100
  
  // monthEndingEquity is technically the ending equity of the last daily record, or starting equity if no trades
  const monthEndingEquity = dailyRecords.length > 0 ? dailyRecords[dailyRecords.length - 1].ending_equity : monthStartingEquity

  const grossProfit = monthTrades.filter((t) => t.net_pnl > 0).reduce((s, t) => s + t.net_pnl, 0)
  const grossLoss = monthTrades.filter((t) => t.net_pnl < 0).reduce((s, t) => s + t.net_pnl, 0)

  const bestTrade = monthTrades.length
    ? monthTrades.reduce((best, t) => (t.net_pnl > best.net_pnl ? t : best), monthTrades[0])
    : null
  const worstTrade = monthTrades.length
    ? monthTrades.reduce((worst, t) => (t.net_pnl < worst.net_pnl ? t : worst), monthTrades[0])
    : null

  // Most used strategy
  const strategyCount: Record<string, { name: string; count: number }> = {}
  for (const t of monthTrades) {
    const name = t.strategies?.name ?? "No Strategy"
    if (!strategyCount[name]) strategyCount[name] = { name, count: 0 }
    strategyCount[name].count++
  }
  const mostUsedStrategy = Object.values(strategyCount).sort((a, b) => b.count - a.count)[0] ?? null

  // Most common mistake
  const mistakeCount: Record<string, { name: string; count: number }> = {}
  for (const t of monthTrades) {
    for (const m of t.trade_mistakes ?? []) {
      const mistakeName = mistakesList.find((ml) => ml.id === m.mistake_id)?.name ?? m.mistake_id
      if (!mistakeCount[mistakeName]) mistakeCount[mistakeName] = { name: mistakeName, count: 0 }
      mistakeCount[mistakeName].count++
    }
  }
  const mostCommonMistake = Object.values(mistakeCount).sort((a, b) => b.count - a.count)[0] ?? null

  const winRate = calculateWinRate(monthTrades)
  const monthLabel = new Date(`${month}-15`).toLocaleString("en-IN", { month: "long", year: "numeric" })

  if (monthTrades.length === 0) {
    return (
      <Card className="border-white/10 bg-white/[0.035]">
        <CardContent className="py-10 text-center">
          <p className="text-slate-400">No trades found for {monthLabel}.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Month Header */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-900 p-6">
        <p className="text-sm uppercase tracking-widest text-emerald-400">Report for</p>
        <p className="mt-1 text-2xl font-bold text-white">{monthLabel}</p>
        <p className="mt-1 text-sm text-slate-400">{monthTrades.length} trade{monthTrades.length !== 1 ? "s" : ""} recorded</p>
      </div>

      {/* Equity Growth */}
      <div>
        <h3 className="mb-3 text-sm font-medium uppercase tracking-widest text-slate-400">Equity Growth</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Starting Equity"
            value={formatCurrency(monthStartingEquity)}
            tone="neutral"
          />
          <StatCard
            title="Deposits"
            value={formatCurrency(monthDeposits)}
            tone="neutral"
          />
          <StatCard
            title="Withdrawals"
            value={formatCurrency(monthWithdrawals)}
            tone="neutral"
          />
          <StatCard
            title="Ending Equity"
            value={formatCurrency(monthEndingEquity)}
            tone={monthEndingEquity >= monthStartingEquity ? "profit" : "loss"}
          />
        </div>
      </div>

      {/* Trading Performance */}
      <div>
        <h3 className="mb-3 mt-4 text-sm font-medium uppercase tracking-widest text-slate-400">Trading Performance</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Trading P&L"
            value={formatCurrency(monthNetPnl)}
            tone={monthNetPnl >= 0 ? "profit" : "loss"}
          />
          <StatCard
            title="Trading Return"
            value={formatPercentage(monthReturn)}
            subtitle="Cash-flow adjusted"
            tone={monthReturn >= 0 ? "profit" : "loss"}
          />
          <StatCard
            title="Win Rate"
            value={formatPercentage(winRate)}
            subtitle={`${monthTrades.filter((t) => t.net_pnl > 0).length}W / ${monthTrades.filter((t) => t.net_pnl < 0).length}L`}
            tone={winRate >= 50 ? "profit" : "loss"}
          />
          <StatCard
            title="Gross Profit"
            value={formatCurrency(grossProfit)}
            tone="profit"
          />
          <StatCard
            title="Gross Loss"
            value={formatCurrency(grossLoss)}
            tone="loss"
          />
        </div>
      </div>

      {/* Best / Worst / Strategy / Mistake */}
      <div className="grid gap-4 sm:grid-cols-2">
        {bestTrade && (
          <TradeHighlight
            title="Best Trade"
            symbol={bestTrade.symbol}
            date={bestTrade.date}
            pnl={bestTrade.net_pnl}
            type="best"
          />
        )}
        {worstTrade && (
          <TradeHighlight
            title="Worst Trade"
            symbol={worstTrade.symbol}
            date={worstTrade.date}
            pnl={worstTrade.net_pnl}
            type="worst"
          />
        )}
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Most Used Strategy</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {mostUsedStrategy ? mostUsedStrategy.name : "—"}
          </p>
          {mostUsedStrategy && (
            <p className="mt-1 text-sm text-slate-400">{mostUsedStrategy.count} trade{mostUsedStrategy.count !== 1 ? "s" : ""}</p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Most Common Mistake</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {mostCommonMistake ? mostCommonMistake.name : "None recorded"}
          </p>
          {mostCommonMistake && (
            <p className="mt-1 text-sm text-slate-400">{mostCommonMistake.count} occurrence{mostCommonMistake.count !== 1 ? "s" : ""}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  tone = "neutral",
}: {
  title: string
  value: string
  subtitle?: string
  tone?: "profit" | "loss" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <p
        className={[
          "mt-2 text-xl font-bold",
          tone === "profit" ? "text-emerald-300" : tone === "loss" ? "text-red-300" : "text-white",
        ].join(" ")}
      >
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
    </div>
  )
}

function TradeHighlight({
  title,
  symbol,
  date,
  pnl,
  type,
}: {
  title: string
  symbol: string
  date: string
  pnl: number
  type: "best" | "worst"
}) {
  const isBest = type === "best"
  return (
    <div
      className={[
        "rounded-xl border p-5",
        isBest
          ? "border-emerald-400/20 bg-emerald-400/5"
          : "border-red-400/20 bg-red-400/5",
      ].join(" ")}
    >
      <p className={["text-xs uppercase tracking-[0.14em]", isBest ? "text-emerald-400" : "text-red-400"].join(" ")}>
        {title}
      </p>
      <p className="mt-2 text-lg font-bold text-white">{symbol}</p>
      <p className={["mt-1 text-sm font-semibold", isBest ? "text-emerald-300" : "text-red-300"].join(" ")}>
        {formatCurrency(pnl)}
      </p>
      <p className="mt-1 text-xs text-slate-500">{date}</p>
    </div>
  )
}

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-28 rounded-xl border border-white/10 bg-white/[0.035]" />
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-24 rounded-xl border border-white/10 bg-white/[0.035]" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl border border-white/10 bg-white/[0.035]" />)}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 rounded-xl border border-white/10 bg-white/[0.035]" />)}
      </div>
    </div>
  )
}
