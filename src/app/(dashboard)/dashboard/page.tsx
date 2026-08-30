import { Suspense } from "react"
import { Metadata } from "next"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  Activity,
  BarChart3,
  Percent,
  Wallet,
} from "lucide-react"
import { getSupabaseSession } from "@/lib/supabase/session"
import { getEquityAtDate } from "@/lib/finance/equity"
import { generateDailyPerformanceRecords, calculateCurrentDrawdown } from "@/lib/calculations"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import type { AppCapitalTransaction } from "@/lib/dashboard-data"
import { TodayTradingStatus } from "@/components/dashboard/today-trading-status"
import { TodayJournalStatus } from "@/components/dashboard/today-journal-status"
import { computeStatus } from "@/lib/journal/computeStatus"
import { format, subDays } from "date-fns"
import { redirect } from "next/navigation"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { DayOfWeekPerformance } from "@/components/dashboard/day-of-week-performance"

export const metadata: Metadata = {
  title: "Dashboard",
  description: "View your overarching account statistics, equity curve, and monthly P&L.",
}

export const revalidate = 60

const EquityCurve = dynamic(
  () => import("@/components/dashboard/equity-curve").then((module) => module.EquityCurve)
)



/**
 * Stats returned by the `get_dashboard_stats` RPC.
 * See: src/lib/financial-model.ts for canonical definitions.
 */
type DashboardStats = {
  total_net_pnl: number;
  today_net_pnl: number;
  pnl_before_today: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  gross_profit: number;
  gross_loss: number;
  /** Net Contributions = Total Deposits − Total Withdrawals */
  net_contributions: number;
  /** Equity = Net Contributions + Trading P&L */
  equity: number;
  /** Overall Return = Trading P&L / Net Contributions */
  overall_return: number;
}


export default async function DashboardPage() {
  const { user } = await getSupabaseSession()

  if (!user) {
    redirect("/login")
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
          Overview
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Dashboard
        </h1>
      </div>



      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent userId={user.id} />
      </Suspense>
    </div>
  )
}


async function DashboardContent({ userId }: { userId: string }) {
  const { supabase } = await getSupabaseSession()

  const [statsResult, rawTradesResult, capitalTxResult, dailyRulesResult] = await Promise.all([
    supabase.rpc("get_dashboard_stats", { p_user_id: userId }),
    supabase.from("trades").select("date, net_pnl").eq("user_id", userId),
    supabase.from("capital_transactions").select("*").eq("user_id", userId).order("date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("trading_days").select("pre_market_completed, post_market_completed").eq("user_id", userId).eq("date", format(new Date(), "yyyy-MM-dd")).maybeSingle()
  ])

  const rawStats = statsResult.data as unknown
  const statsData = (Array.isArray(rawStats) ? rawStats[0] : rawStats) as DashboardStats | null
  const capitalTxs = (capitalTxResult.data ?? []) as AppCapitalTransaction[]
  
  // Financial model terms — see src/lib/financial-model.ts
  const netContributions = Number(statsData?.net_contributions ?? 0)
  const equity = Number(statsData?.equity ?? 0)
  
  // To correctly calculate Today's Return (cash-flow adjusted), we need the Beginning Equity of today.
  // Beginning Equity = Yesterday's Ending Equity (which correctly ignores today's deposits/withdrawals).
  const yesterdayStr = format(subDays(new Date(), 1), "yyyy-MM-dd")
  const yesterdayEndingEquity = await getEquityAtDate(supabase, userId, yesterdayStr)

  const todayNetPnl = Number(statsData?.today_net_pnl ?? 0)

  // True daily return % (Adjusted P&L / Beginning Equity)
  const todayReturn = yesterdayEndingEquity > 0 ? (todayNetPnl / yesterdayEndingEquity) * 100 : 0

  // Time-Weighted Return (TWR) for cash-flow adjusted overall performance
  const rawTrades = (rawTradesResult.data ?? []) as { date: string; net_pnl: number }[]
  
  const dailyRecords = generateDailyPerformanceRecords(rawTrades, capitalTxs)
  const equityData = dailyRecords.map(r => ({ date: r.date, equity: r.ending_equity }))

  // Win / Loss Today
  const todayTrades = rawTrades.filter(t => t.date === format(new Date(), "yyyy-MM-dd"))
  const todayWins = todayTrades.filter(t => t.net_pnl > 0).length
  const todayLosses = todayTrades.filter(t => t.net_pnl <= 0).length
  
  // Journal Status Today
  const dayResult = dailyRulesResult.data as { pre_market_completed: boolean, post_market_completed: boolean } | null
  const journalStatus = computeStatus({
    pre_market_completed: dayResult?.pre_market_completed ?? false,
    post_market_completed: dayResult?.post_market_completed ?? false,
    hasTrades: todayTrades.length > 0,
  })
  // Total deposited / withdrawn
  const totalDeposited = capitalTxs.filter(t => t.transaction_type === "deposit").reduce((sum, t) => sum + Number(t.amount), 0)
  const totalWithdrawn = capitalTxs.filter(t => t.transaction_type === "withdrawal").reduce((sum, t) => sum + Number(t.amount), 0)

  // Current Drawdown calculation
  const currentDrawdown = calculateCurrentDrawdown(dailyRecords)
  
  let currentEquitySubtext = <span className="text-emerald-400 font-medium">At peak</span>
  if (currentDrawdown.amount < 0) {
    currentEquitySubtext = (
      <span className="text-slate-400">
        &darr; {formatCurrency(Math.abs(currentDrawdown.amount))} &middot; {Math.abs(currentDrawdown.percent).toFixed(2)}% below peak
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. KPI Row (4 cards) */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Current Equity" 
          value={formatCurrency(equity)} 
          icon={Wallet} 
          subtext={currentEquitySubtext}
          info="Net Contributions + Trading P&L"
        />
        <KpiCard 
          title="Trading P&L" 
          value={formatCurrency(Number(statsData?.total_net_pnl ?? 0))} 
          icon={Activity} 
          tone={Number(statsData?.total_net_pnl ?? 0) >= 0 ? "profit" : "loss"}
          info="Total profit/loss from all closed trades"
        />
        <KpiCard 
          title="Net Contributions" 
          value={formatCurrency(netContributions)} 
          icon={BarChart3} 
          info="Total Deposited - Total Withdrawn"
        />
        <KpiCard 
          title="Today's Return" 
          value={formatPercentage(todayReturn)} 
          icon={Percent} 
          tone={todayReturn > 0 ? "profit" : (todayReturn < 0 ? "loss" : "neutral")}
          info="Today's Net P&L / Yesterday's Ending Equity"
        />
      </section>

      {/* 2. Equity Curve */}
      <section className="col-span-full">
        <Suspense fallback={<ChartSkeleton />}>
          <EquityCurve data={equityData} />
        </Suspense>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        {/* 3. Today's Trading */}
        <TodayTradingStatus 
          todayNetPnl={todayNetPnl}
          tradesCount={todayTrades.length}
          winsCount={todayWins}
          lossesCount={todayLosses}
          beginningEquity={yesterdayEndingEquity}
          todayReturn={todayReturn}
        />

        {/* 4. Today's Journal */}
        <TodayJournalStatus 
          status={journalStatus}
          tradesCount={todayTrades.length}
          todayNetPnl={todayNetPnl}
        />
      </section>

      {/* Day of Week Performance */}
      <section>
        <DayOfWeekPerformance trades={rawTrades} />
      </section>

      {/* 5. Capital Ledger */}
      <section>
        <div className="rounded-xl border border-white/10 bg-slate-950 p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-slate-300">Capital Ledger</h2>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Net Contributions</p>
                <p className="text-2xl font-semibold tracking-tight text-white">{formatCurrency(netContributions)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Total Deposited</p>
                <p className="text-2xl font-semibold tracking-tight text-emerald-400">{formatCurrency(totalDeposited)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-slate-500">Total Withdrawn</p>
                <p className="text-2xl font-semibold tracking-tight text-rose-400">{formatCurrency(totalWithdrawn)}</p>
              </div>
            </div>
          </div>
          <Link href="/capital" className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-6 py-3 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all border border-emerald-500/20 whitespace-nowrap shrink-0">
            <Wallet className="h-4 w-4" />
            Manage Capital &rarr;
          </Link>
        </div>
      </section>
    </div>
  )
}



function ChartSkeleton() {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
      <div className="mb-4 h-4 w-32 animate-pulse rounded bg-white/10" />
      <div className="h-64 animate-pulse rounded bg-white/[0.05]" />
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.035] p-6 h-32" />
        ))}
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.035] p-6 h-32" />
        ))}
      </section>
      <section className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.035] p-6 h-32" />
        ))}
      </section>
      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 h-80" />
        <div className="rounded-lg border border-white/10 bg-white/[0.035] p-6 h-80" />
      </section>
    </div>
  )
}
