import { Suspense } from "react"
import { Metadata } from "next"
import { redirect } from "next/navigation"

import { TradeForm } from "@/components/trades/trade-form"
import { TradeTable } from "@/components/trades/trade-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { calculateDailyPnlPercent } from "@/lib/calculations"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { getSupabaseSession } from "@/lib/supabase/session"
import type { Database } from "@/lib/supabase/types"

export const metadata: Metadata = {
  title: "Trades | Dashboard",
  description: "Record each trade with manual brokerage and live capital, P&L, return, and result calculations.",
}

export const revalidate = 60

type SettingsRow = Pick<
  Database["public"]["Tables"]["settings"]["Row"],
  "default_brokerage" | "default_tax"
>
type StrategyRow = Pick<Database["public"]["Tables"]["strategies"]["Row"], "id" | "name">
type MistakeRow = Pick<Database["public"]["Tables"]["mistakes"]["Row"], "id" | "name">
type RuleRow = Pick<Database["public"]["Tables"]["rules"]["Row"], "id" | "title" | "category">

export default async function TradesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const { user } = await getSupabaseSession()

  if (!user) {
    redirect("/login")
  }

  const resolvedParams = await searchParams
  const page = Number(resolvedParams?.page) || 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
            Trade Journal
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            Trades
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Record each trade with manual brokerage and live capital, P&L, return, and result calculations.
          </p>
        </div>
      </div>

      <Suspense fallback={<TradesSkeleton />} key={page}>
        <TradesContent userId={user.id} page={page} />
      </Suspense>
    </div>
  )
}

async function TradesContent({ userId, page }: { userId: string; page: number }) {
  const ITEMS_PER_PAGE = 25
  const from = (page - 1) * ITEMS_PER_PAGE
  const to = from + ITEMS_PER_PAGE - 1

  const { supabase } = await getSupabaseSession()
  
  const [settingsResult, strategiesResult, mistakesResult, rulesResult, statsResult, tradesResult] = await Promise.all([
      supabase
        .from("settings")
        .select("default_brokerage,default_tax")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("strategies")
        .select("id,name")
        .eq("user_id", userId)
        .order("name", { ascending: true }),
      supabase.from("mistakes").select("id,name").order("name", { ascending: true }),
      supabase.from("rules").select("id,title,category").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.rpc("get_dashboard_stats", { p_user_id: userId }),
      supabase
        .from("trades")
        .select(`
          id, date, symbol, trade_type, entry_price, exit_price, quantity, capital_used, capital_used_percent, gross_pnl, brokerage, taxes, net_pnl, trade_return_percent, trade_review_score, notes, strategy_id,
          strategies(name),
          trade_mistakes(mistake_id),
          trade_rule_adherence(rule_id, status)
        `, { count: "exact" })
        .eq("user_id", userId)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to),
    ])

  const settingsData = settingsResult.data as SettingsRow | null
  const strategiesData = strategiesResult.data as StrategyRow[] | null
  const mistakesData = mistakesResult.data as MistakeRow[] | null
  type TradeData = Database["public"]["Tables"]["trades"]["Row"] & {
    strategies: { name: string } | null;
    trade_mistakes: { mistake_id: string }[];
    trade_rule_adherence: { rule_id: string; status: string }[];
  }

  const rulesData = rulesResult.data as RuleRow[] | null
  const statsData = statsResult.data as Record<string, number> | null
  const tradesData = tradesResult.data as unknown as TradeData[] | null
  const totalCount = tradesResult.count ?? 0

  const settings = (settingsData ?? {
    default_brokerage: 0,
    default_tax: 0,
  }) as SettingsRow
  const strategies = (strategiesData ?? []) as StrategyRow[]
  const mistakes = (mistakesData ?? []) as MistakeRow[]
  const rules = (rulesData ?? []) as RuleRow[]
  
  // Format paginated trades to match TradeTableRow
  const trades = (tradesData ?? []).map((t) => ({
    ...t,
    notes: t.notes ?? "",
    mistakes: t.trade_mistakes.map((m: { mistake_id: string }) => m.mistake_id),
    rules: t.trade_rule_adherence.reduce((acc: Record<string, "followed" | "broken" | "na">, curr: { rule_id: string; status: string }) => {
      acc[curr.rule_id] = curr.status as "followed" | "broken" | "na"
      return acc
    }, {})
  }))

  const totalNetPnl = Number(statsData?.total_net_pnl ?? 0)
  const todayNetPnl = Number(statsData?.today_net_pnl ?? 0)
  // Use equity from RPC for accurate daily P&L % (not the legacy starting_capital)
  // Equity = Net Contributions + Trading P&L — see src/lib/financial-model.ts
  const equity = Number(statsData?.equity ?? 0)

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE))

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        {/* startingCapital is a legacy client-side fallback for preview calculations.
            The server uses getEquityAtDate (equity) for stored values.
            See: src/lib/financial-model.ts */}
        <TradeForm
          equityForPreview={equity}
          defaultBrokerage={Number(settings.default_brokerage)}
          defaultTax={Number(settings.default_tax)}
          strategies={strategies}
          mistakes={mistakes}
          rules={rules}
        />
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <JournalStat title="Total Trades" value={String(totalCount)} />
        <JournalStat
          title="Total Net P&L"
          value={formatCurrency(totalNetPnl)}
          tone={totalNetPnl >= 0 ? "profit" : "loss"}
        />
        <JournalStat
          title="Today's P&L %"
          value={formatPercentage(
            calculateDailyPnlPercent(todayNetPnl, equity)
          )}
          tone={todayNetPnl >= 0 ? "profit" : "loss"}
        />
      </section>

      <TradeTable 
        trades={trades} 
        equityForPreview={equity}
        defaultBrokerage={Number(settings.default_brokerage)}
        defaultTax={Number(settings.default_tax)}
        strategies={strategies}
        mistakes={mistakes}
        rules={rules}
        currentPage={page}
        totalPages={totalPages}
      />
    </div>
  )
}

function JournalStat({
  title,
  value,
  tone = "neutral",
}: {
  title: string
  value: string
  tone?: "profit" | "loss" | "neutral"
}) {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs uppercase tracking-[0.14em] text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={
            tone === "profit"
              ? "text-2xl font-semibold text-emerald-300"
              : tone === "loss"
                ? "text-2xl font-semibold text-red-300"
                : "text-2xl font-semibold text-white"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  )
}

function TradesSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex justify-end mb-4">
        <div className="h-10 w-32 rounded bg-white/10" />
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-lg border border-white/10 bg-white/[0.035] p-6">
            <div className="mb-4 h-4 w-24 rounded bg-white/10" />
            <div className="h-8 w-32 rounded bg-white/[0.05]" />
          </div>
        ))}
      </section>
      <div className="h-96 w-full rounded-lg bg-white/[0.035]" />
    </div>
  )
}
