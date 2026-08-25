import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"

import { Card, CardContent } from "@/components/ui/card"
import { calculateProfitFactor, calculateWinRate, formatProfitFactor, generateDailyPerformanceRecords, calculatePerformanceReturn, calculateMaxDrawdown } from "@/lib/calculations"
import { type AppTrade, type AppCapitalTransaction } from "@/lib/dashboard-data"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { KpiTooltip } from "@/components/dashboard/kpi-tooltip"
import { getSupabaseSession } from "@/lib/supabase/session"

export const metadata: Metadata = {
  title: "Analytics | Dashboard",
  description: "Deep dive into your trading analytics and performance metrics.",
}

export const revalidate = 60

export default async function AnalyticsPage() {
  const { user } = await getSupabaseSession()
  if (!user) redirect("/login")

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Analytics</h1>
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent userId={user.id} />
      </Suspense>
    </div>
  )
}

async function AnalyticsContent({ userId }: { userId: string }) {
  const { supabase } = await getSupabaseSession()
  
  const [tradesResponse, capitalResponse] = await Promise.all([
    supabase
      .from("trades")
      .select("date,net_pnl,brokerage,taxes,trade_return_percent,strategy_id,strategies(name)")
      .eq("user_id", userId),
    supabase
      .from("capital_transactions")
      .select("*")
      .eq("user_id", userId)
  ])

  const trades = (tradesResponse.data ?? []) as AppTrade[]
  const capitalTxs = (capitalResponse.data ?? []) as AppCapitalTransaction[]

  const wins = trades.filter((trade) => trade.net_pnl > 0)
  const losses = trades.filter((trade) => trade.net_pnl < 0)
  const totalBrokerage = trades.reduce((sum, trade) => sum + Number(trade.brokerage), 0)
  const totalTaxes = trades.reduce((sum, trade) => sum + Number(trade.taxes), 0)
  const totalCosts = totalBrokerage + totalTaxes
  const totalTradingPnl = trades.reduce((sum, trade) => sum + Number(trade.net_pnl), 0)

  // Cash-flow Adjusted Daily Performance Engine
  const dailyRecords = generateDailyPerformanceRecords(
    trades.map(t => ({ date: t.date, net_pnl: Number(t.net_pnl) })),
    capitalTxs.map(t => ({ date: t.date, transaction_type: t.transaction_type, amount: Number(t.amount) }))
  )

  const twr = calculatePerformanceReturn(
    trades.map(t => ({ date: t.date, net_pnl: t.net_pnl })),
    capitalTxs.map(t => ({ date: t.date, transaction_type: t.transaction_type, amount: Number(t.amount) }))
  )
  const maxDrawdown = calculateMaxDrawdown(dailyRecords)
  
  const dailyReturns = dailyRecords.map(r => r.return_percent)
  const avgDailyReturn = dailyReturns.length > 0 ? dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length : 0
  const bestDay = dailyReturns.length > 0 ? Math.max(...dailyReturns) : 0
  const worstDay = dailyReturns.length > 0 ? Math.min(...dailyReturns) : 0

  return (
    <div className="space-y-12">
      {/* SECTION: ACCOUNT PERFORMANCE */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-emerald-400">Account Performance</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Trading P&L" value={formatCurrency(totalTradingPnl)} tone={totalTradingPnl >= 0 ? "profit" : "loss"} info="Total profit/loss from all trades" />
          <Metric title="TWR" value={formatPercentage(twr)} tone={twr >= 0 ? "profit" : "loss"} info="Time-Weighted Return adjusted for deposits & withdrawals" />
          <Metric title="Max Drawdown" value={formatPercentage(maxDrawdown)} tone={maxDrawdown < 0 ? "loss" : "neutral"} info="Maximum peak-to-trough drop in equity" />
          <Metric title="Avg Daily Return" value={formatPercentage(avgDailyReturn)} tone={avgDailyReturn >= 0 ? "profit" : "loss"} info="Average daily percentage return" />
        </div>
      </section>

      {/* SECTION: TRADING STATISTICS */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Trading Statistics</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Metric title="Total Trades" value={String(trades.length)} info="Total number of trades taken" />
          <Metric title="Win Rate" value={formatPercentage(calculateWinRate(trades))} info="Percentage of trades that were profitable" />
          <Metric title="Profit Factor" value={formatProfitFactor(calculateProfitFactor(trades))} tone={calculateProfitFactor(trades) >= 1 ? "profit" : "loss"} info="Gross Profit / Gross Loss (Ideal > 1.5)" />
          <Metric title="Total Costs" value={formatCurrency(totalCosts)} info="Total brokerage and taxes paid" />
        </div>
      </section>

      {/* SECTION: DAILY EXTREMES & TRADE PERFORMANCE */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Daily Performance</h2>
          <Card className="border-white/10 bg-slate-950 shadow-none">
            <CardContent className="grid gap-3 sm:grid-cols-2 p-4">
              <Metric title="Best Day" value={formatPercentage(bestDay)} tone="profit" compact />
              <Metric title="Worst Day" value={formatPercentage(worstDay)} tone="loss" compact />
            </CardContent>
          </Card>
        </div>
        
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Trade Performance</h2>
          <Card className="border-white/10 bg-slate-950 shadow-none">
            <CardContent className="grid gap-3 sm:grid-cols-2 p-4">
              <Metric title="Avg Win" value={formatCurrency(wins.length ? wins.reduce((s, t) => s + t.net_pnl, 0) / wins.length : 0)} tone="profit" compact />
              <Metric title="Avg Loss" value={formatCurrency(losses.length ? losses.reduce((s, t) => s + t.net_pnl, 0) / losses.length : 0)} tone="loss" compact />
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Winning Trades</p>
                <p className="mt-1 text-lg font-semibold text-white">{wins.length}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-slate-900/50 p-3">
                <p className="text-xs uppercase tracking-wider text-slate-500">Losing Trades</p>
                <p className="mt-1 text-lg font-semibold text-white">{losses.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* SECTION: STRATEGY ANALYTICS */}
      <section>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-300">Strategy Analytics</h2>
        <Card className="border-white/10 bg-slate-950 shadow-none">
          <CardContent className="p-4 space-y-3">
            {Object.entries(groupByStrategy(trades)).map(([name, items]) => {
              const strWins = items.filter(t => t.net_pnl > 0).length
              const strWinRate = items.length > 0 ? (strWins / items.length) * 100 : 0
              const strPnl = items.reduce((s, t) => s + t.net_pnl, 0)
              return (
                <div key={name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-white/5 bg-slate-900/50 p-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="font-medium text-white">{name}</span>
                    <span className="text-xs text-slate-500">{items.length} trades</span>
                  </div>
                  <div className="flex items-center gap-6 text-right">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500">Win Rate</span>
                      <span className="font-medium text-slate-300">{formatPercentage(strWinRate)}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500">Net P&L</span>
                      <span className={cn("font-semibold tabular-nums", strPnl >= 0 ? "text-emerald-400" : "text-rose-400")}>
                        {strPnl > 0 ? "+" : ""}{formatCurrency(strPnl)}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
            {trades.length === 0 && (
              <div className="text-center text-sm text-slate-500 py-4">No trades found.</div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

import { cn } from "@/lib/utils"

function Metric({ title, value, compact = false, tone = "neutral", info }: { title: string; value: string; compact?: boolean, tone?: "neutral" | "profit" | "loss", info?: string }) {
  return (
    <Card className="border-white/10 bg-slate-950 shadow-none">
      <CardContent className={compact ? "p-3" : "p-5"}>
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          {info && <KpiTooltip info={info} />}
        </div>
        <p className={cn("mt-2 text-2xl font-bold tabular-nums", tone === "profit" ? "text-emerald-400" : tone === "loss" ? "text-rose-400" : "text-white")}>
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function groupByStrategy(trades: AppTrade[]) {
  return trades.reduce<Record<string, AppTrade[]>>((groups, trade) => {
    const name = trade.strategies?.name ?? "No strategy"
    groups[name] = [...(groups[name] ?? []), trade]
    return groups
  }, {})
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.035] p-4 h-24" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 h-64" />
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 h-64" />
      </div>
    </div>
  )
}
