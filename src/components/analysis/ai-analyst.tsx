"use client"

import { useState, useEffect, useMemo } from "react"
import { Sparkles, RefreshCw, AlertTriangle, Brain, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { asAppSupabase } from "@/lib/dashboard-data"
import { generateAIAnalysis, checkGroqKey } from "@/app/(dashboard)/analysis/actions"

// ─── Types ────────────────────────────────────────────────────────────────────

type TradeRow = {
  id: string
  date: string
  symbol: string
  trade_type: string
  entry_price: number
  exit_price: number
  quantity: number
  capital_used: number
  net_pnl: number
  trade_return_percent: number
  trade_review_score: number | null
  strategy_id: string | null
  strategies: { name: string } | null
  trade_mistakes: { mistake_id: string }[]
}

type StrategyRow = { id: string; name: string }
type RuleRow = { category: string; title: string }
type MistakeRow = { id: string; name: string }
type LastAnalysis = { id: string; content: string; trade_count: number; created_at: string }

type Props = {
  userId: string
  trades: TradeRow[]
  strategies: StrategyRow[]
  rules: RuleRow[]
  mistakes: MistakeRow[]
  currentEquity: number
  lastAnalysis: LastAnalysis | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n)
}

type WeeklyStats = {
  trades: number
  wins: number
  losses: number
  winRate: number
  pnl: number
  avgWin: number
  avgLoss: number
  mistakeCount: number
}

function computeWeeklyStats(trades: TradeRow[]): { thisWeek: WeeklyStats; lastWeek: WeeklyStats; hasData: boolean } {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1

  const thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - mondayOffset)
  thisWeekStart.setHours(0, 0, 0, 0)

  const lastWeekStart = new Date(thisWeekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)

  const lastWeekEnd = new Date(thisWeekStart)
  lastWeekEnd.setDate(lastWeekEnd.getDate() - 1)
  lastWeekEnd.setHours(23, 59, 59, 999)

  const toDate = (d: string) => new Date(d + "T00:00:00")

  const thisWeekTrades = trades.filter((t) => {
    const d = toDate(t.date)
    return d >= thisWeekStart && d <= today
  })
  const lastWeekTrades = trades.filter((t) => {
    const d = toDate(t.date)
    return d >= lastWeekStart && d <= lastWeekEnd
  })

  function calcStats(arr: TradeRow[]): WeeklyStats {
    const wins = arr.filter((t) => t.net_pnl > 0)
    const losses = arr.filter((t) => t.net_pnl < 0)
    return {
      trades: arr.length,
      wins: wins.length,
      losses: losses.length,
      winRate: arr.length ? (wins.length / arr.length) * 100 : 0,
      pnl: arr.reduce((s, t) => s + t.net_pnl, 0),
      avgWin: wins.length ? wins.reduce((s, t) => s + t.net_pnl, 0) / wins.length : 0,
      avgLoss: losses.length ? Math.abs(losses.reduce((s, t) => s + t.net_pnl, 0) / losses.length) : 0,
      mistakeCount: arr.reduce((s, t) => s + (t.trade_mistakes?.length ?? 0), 0),
    }
  }

  return {
    thisWeek: calcStats(thisWeekTrades),
    lastWeek: calcStats(lastWeekTrades),
    hasData: thisWeekTrades.length > 0 || lastWeekTrades.length > 0,
  }
}

function formatWeeklyComparison(thisWeek: WeeklyStats, lastWeek: WeeklyStats): string {
  return `WEEK-OVER-WEEK COMPARISON (This Week vs Last Week):
- Trades: ${thisWeek.trades} vs ${lastWeek.trades}
- Win Rate: ${thisWeek.winRate.toFixed(1)}% vs ${lastWeek.winRate.toFixed(1)}%
- P&L: ${fmt(thisWeek.pnl)} vs ${fmt(lastWeek.pnl)}
- Avg Win: ${fmt(thisWeek.avgWin)} vs ${fmt(lastWeek.avgWin)}
- Avg Loss: ${fmt(thisWeek.avgLoss)} vs ${fmt(lastWeek.avgLoss)}
- Mistakes: ${thisWeek.mistakeCount} vs ${lastWeek.mistakeCount}`
}

function buildPrompts(
  trades: TradeRow[],
  strategies: StrategyRow[],
  rules: RuleRow[],
  mistakes: MistakeRow[],
  currentEquity: number,
  timeframe: string
) {
  const mistakeMap = Object.fromEntries(mistakes.map((m) => [m.id, m.name]))

  const wins = trades.filter((t) => t.net_pnl > 0)
  const losses = trades.filter((t) => t.net_pnl < 0)
  const totalPnl = trades.reduce((s, t) => s + t.net_pnl, 0)
  const grossProfit = wins.reduce((s, t) => s + t.net_pnl, 0)
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.net_pnl, 0))
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : "∞"
  const winRate = trades.length ? ((wins.length / trades.length) * 100).toFixed(1) : "0"
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.net_pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.net_pnl, 0) / losses.length) : 0

  const bestTrade = trades.length ? trades.reduce((b, t) => (t.net_pnl > b.net_pnl ? t : b), trades[0]) : null
  const worstTrade = trades.length ? trades.reduce((w, t) => (t.net_pnl < w.net_pnl ? t : w), trades[0]) : null

  // Most traded symbol
  const symbolCount: Record<string, number> = {}
  for (const t of trades) symbolCount[t.symbol] = (symbolCount[t.symbol] ?? 0) + 1
  const mostTradedSymbol = Object.entries(symbolCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

  // Most used strategy
  const stratCount: Record<string, number> = {}
  for (const t of trades) {
    const name = t.strategies?.name ?? "No Strategy"
    stratCount[name] = (stratCount[name] ?? 0) + 1
  }
  const mostUsedStrategy = Object.entries(stratCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

  // Most common mistake
  const mistakeCount: Record<string, number> = {}
  for (const t of trades) {
    for (const m of t.trade_mistakes ?? []) {
      const name = mistakeMap[m.mistake_id] ?? m.mistake_id
      mistakeCount[name] = (mistakeCount[name] ?? 0) + 1
    }
  }
  const mostCommonMistake = Object.entries(mistakeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "None"

  // Strategy breakdown
  const stratPnl: Record<string, { wins: number; total: number; pnl: number }> = {}
  for (const t of trades) {
    const name = t.strategies?.name ?? "No Strategy"
    if (!stratPnl[name]) stratPnl[name] = { wins: 0, total: 0, pnl: 0 }
    stratPnl[name].total++
    stratPnl[name].pnl += t.net_pnl
    if (t.net_pnl > 0) stratPnl[name].wins++
  }
  const stratLines = Object.entries(stratPnl)
    .map(([name, s]) => `  - ${name}: ${s.total} trades, ${((s.wins / s.total) * 100).toFixed(0)}% WR, Net P&L: ${fmt(s.pnl)}`)
    .join("\n")

  // Rules by category
  const rulesByCategory: Record<string, string[]> = {}
  for (const r of rules) {
    if (!rulesByCategory[r.category]) rulesByCategory[r.category] = []
    rulesByCategory[r.category].push(r.title)
  }
  const rulesLines = Object.entries(rulesByCategory)
    .map(([cat, titles]) => `  ${cat.replace("_", " ").toUpperCase()}:\n${titles.map((t) => `    - ${t}`).join("\n")}`)
    .join("\n")

  // All trades table (newest first, cap at 100 for token limits even if all selected)
  const tradesToShow = trades.slice(0, 100)
  const tradeLines = tradesToShow
    .map((t) => {
      const mistakeNames = (t.trade_mistakes ?? []).map((m) => mistakeMap[m.mistake_id] ?? m.mistake_id).join(", ") || "None"
      return `  ${t.date} | ${t.symbol} | ${t.trade_type.toUpperCase()} | Entry: ${t.entry_price} | Exit: ${t.exit_price} | Qty: ${t.quantity} | Capital: ${fmt(t.capital_used)} | Net P&L: ${fmt(t.net_pnl)} | Trade Return: ${t.trade_return_percent.toFixed(2)}% | Strategy: ${t.strategies?.name ?? "None"} | Mistakes: ${mistakeNames} | Score: ${t.trade_review_score ?? "—"}`
    })
    .join("\n")

  const systemPrompt = `You are an expert trading coach and performance analyst specialising in Indian F&O markets (NIFTY, BANKNIFTY). Analyse the trader's data and give highly detailed, comprehensive, and well-formatted feedback. Use clean markdown formatting (bullet points, bold text for emphasis, and paragraph breaks). DO NOT use Markdown tables under any circumstances; use bulleted lists instead. Never be vague. Always reference specific numbers, percentages, and trade counts from their data. Format your response strictly with these exact sections.`

  const timeframeContext = timeframe === "all" ? "my entire trading history" : `my last ${trades.length} trades`
  const userPrompt = `Here is my complete trading data for ${timeframeContext}. Analyse it and give me a highly detailed, thorough performance review.

SUMMARY STATS:
- Total Trades Taken: ${trades.length}
- Win Rate: ${winRate}%
- Total P&L: ${fmt(totalPnl)}
- Profit factor: ${profitFactor}
- Current Equity: ${fmt(currentEquity)}
- Best trade: ${fmt(bestTrade?.net_pnl ?? 0)} (${bestTrade?.symbol ?? "—"} on ${bestTrade?.date ?? "—"})
- Worst trade: ${fmt(worstTrade?.net_pnl ?? 0)} (${worstTrade?.symbol ?? "—"} on ${worstTrade?.date ?? "—"})
- Average win: ${fmt(avgWin)}
- Average loss: ${fmt(avgLoss)}
- Most traded symbol: ${mostTradedSymbol}
- Most used strategy: ${mostUsedStrategy}
- Most common mistake: ${mostCommonMistake}

ALL TRADES (newest first, up to 100):
${tradeLines}

MY STRATEGIES:
${stratLines || "  No strategies defined"}

MY RULES:
${rulesLines || "  No rules defined"}

Please analyse and return ONLY these sections. Provide a detailed, multi-sentence breakdown for every single section:

## What's working
(Provide a highly detailed analysis of specific strategies, days, and symbols performing well. Quote exact PnL and win rate numbers from my data to back up your claims)

## Where I'm losing money
(Break down specific patterns in losing trades in detail — focus on symbols, mistake tags, and strategy failures. Use exact numbers and explain the correlation)

## My biggest weakness
(Identify the single most costly mistake or pattern. Detail exactly how much it has cost me and why it is happening based on the data)

## Strategy performance
(Provide a detailed breakdown of each strategy used. Rank them by win rate and net P&L using bullet points. DO NOT use a table. Clearly state which one to scale up and which one to stop, and why)

## Specific suggestions
(Provide 5 concrete, highly detailed action items. Do not give generic advice. Each suggestion must include a specific reason derived from my actual numbers)

## This week's focus
(Give me one single, highly specific and detailed focus area for the upcoming week based on my most recent 10 trades)

## Progress since last week
(Compare this week's stats vs last week's stats provided in the WEEK-OVER-WEEK COMPARISON section. Highlight exactly what improved — e.g. win rate went from X% to Y% — and what got worse. If there is not enough data for one of the weeks, say so. End with one concrete action item to keep improving.)`

  return { systemPrompt, userPrompt }
}

// ─── Section card renderer ─────────────────────────────────────────────────────

const SECTION_STYLES: Record<string, { border: string; bg: string; titleColor: string }> = {
  "What's working": { border: "border-emerald-400/30", bg: "bg-emerald-400/5", titleColor: "text-emerald-300" },
  "Where I'm losing money": { border: "border-red-400/30", bg: "bg-red-400/5", titleColor: "text-red-300" },
  "My biggest weakness": { border: "border-orange-400/30", bg: "bg-orange-400/5", titleColor: "text-orange-300" },
  "Strategy performance": { border: "border-blue-400/30", bg: "bg-blue-400/5", titleColor: "text-blue-300" },
  "Specific suggestions": { border: "border-purple-400/30", bg: "bg-purple-400/5", titleColor: "text-purple-300" },
  "This week's focus": { border: "border-emerald-400/50", bg: "bg-emerald-500/10", titleColor: "text-emerald-200" },
  "Progress since last week": { border: "border-cyan-400/30", bg: "bg-cyan-400/5", titleColor: "text-cyan-300" },
}

function parseAnalysisSections(content: string): { title: string; body: string }[] {
  const sections: { title: string; body: string }[] = []
  const parts = content.split(/^## /m).filter(Boolean)
  for (const part of parts) {
    const newline = part.indexOf("\n")
    if (newline === -1) continue
    const title = part.slice(0, newline).trim()
    const body = part.slice(newline + 1).trim()
    sections.push({ title, body })
  }
  return sections
}

function AnalysisSection({ title, body }: { title: string; body: string }) {
  const style = SECTION_STYLES[title] ?? {
    border: "border-white/10",
    bg: "bg-white/[0.035]",
    titleColor: "text-white",
  }

  const lines = body.split("\n")

  return (
    <div className={`rounded-xl border p-6 ${style.border} ${style.bg}`}>
      <h2 className={`text-base font-semibold uppercase tracking-wide ${style.titleColor}`}>{title}</h2>
      <div className="mt-4 space-y-2 text-sm leading-relaxed text-slate-300">
        {lines.map((line, i) => {
          if (!line.trim()) return null
          const content = renderBoldText(line.replace(/^[-*]\s/, "").replace(/^\d+\.\s/, ""))
          if (line.startsWith("- ") || line.startsWith("* ")) {
            return (
              <div key={i} className="flex gap-2">
                <span className={`mt-1 shrink-0 text-xs ${style.titleColor}`}>▸</span>
                <span>{content}</span>
              </div>
            )
          }
          if (/^\d+\./.test(line)) {
            return (
              <div key={i} className="flex gap-2">
                <span className={`shrink-0 font-mono text-xs ${style.titleColor}`}>{line.match(/^\d+/)?.[0]}.</span>
                <span>{content}</span>
              </div>
            )
          }
          return <p key={i}>{renderBoldText(line)}</p>
        })}
      </div>
    </div>
  )
}

/** Safely renders **bold** markdown segments as <strong> elements without innerHTML */
function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i}>{part}</strong> : part
  )
}

// ─── Progress Cards ────────────────────────────────────────────────────────────

function ProgressCards({ thisWeek, lastWeek }: { thisWeek: WeeklyStats; lastWeek: WeeklyStats }) {
  const metrics: {
    label: string
    thisVal: string
    lastVal: string
    diff: number
    higherIsBetter: boolean
  }[] = [
    {
      label: "Win Rate",
      thisVal: `${thisWeek.winRate.toFixed(1)}%`,
      lastVal: `${lastWeek.winRate.toFixed(1)}%`,
      diff: thisWeek.winRate - lastWeek.winRate,
      higherIsBetter: true,
    },
    {
      label: "P&L",
      thisVal: fmt(thisWeek.pnl),
      lastVal: fmt(lastWeek.pnl),
      diff: thisWeek.pnl - lastWeek.pnl,
      higherIsBetter: true,
    },
    {
      label: "Avg Win",
      thisVal: fmt(thisWeek.avgWin),
      lastVal: fmt(lastWeek.avgWin),
      diff: thisWeek.avgWin - lastWeek.avgWin,
      higherIsBetter: true,
    },
    {
      label: "Avg Loss",
      thisVal: fmt(thisWeek.avgLoss),
      lastVal: fmt(lastWeek.avgLoss),
      diff: thisWeek.avgLoss - lastWeek.avgLoss,
      higherIsBetter: false,
    },
    {
      label: "Trades",
      thisVal: String(thisWeek.trades),
      lastVal: String(lastWeek.trades),
      diff: thisWeek.trades - lastWeek.trades,
      higherIsBetter: true,
    },
    {
      label: "Mistakes",
      thisVal: String(thisWeek.mistakeCount),
      lastVal: String(lastWeek.mistakeCount),
      diff: thisWeek.mistakeCount - lastWeek.mistakeCount,
      higherIsBetter: false,
    },
  ]

  return (
    <div>
      <h3 className="mb-3 text-sm font-medium uppercase tracking-widest text-cyan-300">
        Week-over-Week Progress
      </h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((m) => {
          const isImproved = m.higherIsBetter ? m.diff > 0 : m.diff < 0
          const isNeutral = m.diff === 0

          const Icon = isNeutral ? Minus : isImproved ? TrendingUp : TrendingDown
          const color = isNeutral
            ? "text-slate-400"
            : isImproved
            ? "text-emerald-400"
            : "text-red-400"
          const borderColor = isNeutral
            ? "border-white/10"
            : isImproved
            ? "border-emerald-400/20"
            : "border-red-400/20"
          const bgColor = isNeutral
            ? "bg-white/[0.035]"
            : isImproved
            ? "bg-emerald-400/5"
            : "bg-red-400/5"

          return (
            <div
              key={m.label}
              className={`rounded-xl border p-4 ${borderColor} ${bgColor}`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{m.label}</p>
                <Icon className={`size-4 ${color}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-3">
                <span className="text-lg font-bold text-white">{m.thisVal}</span>
                <span className="text-xs text-slate-500">vs {m.lastVal}</span>
              </div>
              <p className={`mt-1 text-xs font-medium ${color}`}>
                {isNeutral
                  ? "No change"
                  : isImproved
                  ? "Improved"
                  : "Declined"}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

function isGeneratedThisWeek(dateString: string | null) {
  if (!dateString) return false
  const date = new Date(dateString)
  const today = new Date()
  
  // Find the most recent Sunday at 00:00:00
  const recentSunday = new Date(today)
  const day = recentSunday.getDay() // 0 is Sunday
  recentSunday.setDate(recentSunday.getDate() - day)
  recentSunday.setHours(0, 0, 0, 0)
  
  return date >= recentSunday
}

export function AiAnalyst({ userId, trades, strategies, rules, mistakes, currentEquity, lastAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(lastAnalysis?.content ?? null)
  const [tradeCount, setTradeCount] = useState<number>(lastAnalysis?.trade_count ?? 0)
  const [analysisDate, setAnalysisDate] = useState<string | null>(lastAnalysis?.created_at ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState(true)
  const [timeframe, setTimeframe] = useState<string>("100")
  const [filteredFirstDate, setFilteredFirstDate] = useState<string | null>(null)
  const [filteredLastDate, setFilteredLastDate] = useState<string | null>(null)

  useEffect(() => {
    checkGroqKey().then(setHasKey)
  }, [])

  const hasTrades = trades.length >= 5

  const weeklyComparison = useMemo(() => computeWeeklyStats(trades), [trades])
  const alreadyGeneratedThisWeek = isGeneratedThisWeek(analysisDate)

  async function runAnalysis() {
    setLoading(true)
    setError(null)

    try {
      const limit = timeframe === "all" ? trades.length : parseInt(timeframe, 10)
      const relevantTrades = trades.slice(0, limit)

      const { systemPrompt, userPrompt: initialUserPrompt } = buildPrompts(relevantTrades, strategies, rules, mistakes, currentEquity, timeframe)
      let userPrompt = initialUserPrompt

      // Inject week-over-week comparison data into the prompt
      if (weeklyComparison.hasData) {
        const comparisonText = formatWeeklyComparison(weeklyComparison.thisWeek, weeklyComparison.lastWeek)
        userPrompt = `${userPrompt}\n\n${comparisonText}`
      }

      const content = await generateAIAnalysis(systemPrompt, userPrompt)

      // Save to Supabase
      const supabase = asAppSupabase(createClient())
      const { error: saveErr } = await supabase.from("ai_analysis").insert({
        user_id: userId,
        content,
        trade_count: relevantTrades.length,
      })
      if (saveErr) console.error("Failed to save analysis:", saveErr)

      setAnalysis(content)
      setTradeCount(relevantTrades.length)
      setFilteredFirstDate(relevantTrades.length ? relevantTrades[relevantTrades.length - 1].date : null)
      setFilteredLastDate(relevantTrades.length ? relevantTrades[0].date : null)
      setAnalysisDate(new Date().toISOString())
    } catch (err) {
      setError((err as Error).message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const sections = analysis ? parseAnalysisSections(analysis) : []

  return (
    <div className="space-y-6">
      {/* API Key Warning */}
      {!hasKey && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-400/30 bg-amber-400/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
          <div className="text-sm">
            <p className="font-medium text-amber-300">Groq API key missing</p>
            <p className="mt-1 text-slate-400">
              Add <code className="rounded bg-slate-800 px-1 text-amber-300">GROQ_API_KEY=your_key_here</code> to your{" "}
              <code className="rounded bg-slate-800 px-1 text-slate-300">.env.local</code> file, then restart the dev server.
              Get a free key at{" "}
              <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline text-amber-300">
                console.groq.com
              </a>
            </p>
          </div>
        </div>
      )}

      {/* Not enough trades */}
      {hasTrades ? null : (
        <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-6">
          <Brain className="mt-0.5 size-5 shrink-0 text-slate-500" />
          <div>
            <p className="font-medium text-white">Not enough data yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Add at least 5 trades to get a meaningful analysis. You have {trades.length} trade{trades.length !== 1 ? "s" : ""} so far.
            </p>
          </div>
        </div>
      )}

      {/* Action Button */}
      {hasTrades && (
        <div className="flex flex-wrap items-center gap-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            disabled={loading || !hasKey}
            className="h-12 rounded-xl border border-white/10 bg-slate-950 px-4 text-sm font-medium text-white shadow-lg shadow-black/20 focus:outline-none focus:ring-1 focus:ring-emerald-400/50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="50">Last 50 Trades</option>
            <option value="100">Last 100 Trades</option>
            <option value="all">All Time</option>
          </select>

          <button
            onClick={runAnalysis}
            disabled={loading || !hasKey}
            className="group flex h-12 items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Analysing trades...
              </>
            ) : analysis ? (
              <>
                <RefreshCw className="size-4 transition-transform group-hover:rotate-180" />
                Regenerate Analysis
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Analyse My Trading
              </>
            )}
          </button>

          {analysis && analysisDate && (
            <p className="text-xs text-slate-500 w-full sm:w-auto">
              Last run: {new Date(analysisDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-400/30 bg-red-400/5 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Loading shimmer */}
      {loading && (
        <div className="space-y-4 animate-pulse">
          {[240, 200, 180, 220, 260, 160].map((h, i) => (
            <div key={i} style={{ height: h }} className="rounded-xl border border-white/10 bg-white/[0.035]" />
          ))}
        </div>
      )}

      {/* Progress Cards */}
      {!loading && sections.length > 0 && weeklyComparison.hasData && (
        <ProgressCards thisWeek={weeklyComparison.thisWeek} lastWeek={weeklyComparison.lastWeek} />
      )}

      {/* Analysis sections */}
      {!loading && sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((section) => (
            <AnalysisSection key={section.title} title={section.title} body={section.body} />
          ))}

          {/* Footer */}
          <div className="rounded-xl border border-white/10 bg-white/[0.035] p-4 text-center">
            <p className="text-sm text-slate-400">
              Analysis based on{" "}
              <span className="font-semibold text-white">{tradeCount} trades</span>
              {filteredFirstDate && filteredLastDate && (
                <>
                  {" "}from{" "}
                  <span className="text-white">{filteredFirstDate}</span>
                  {" "}to{" "}
                  <span className="text-white">{filteredLastDate}</span>
                </>
              )}
            </p>
            <button
              onClick={runAnalysis}
              disabled={loading || !hasKey || alreadyGeneratedThisWeek}
              className="mt-3 flex items-center gap-2 mx-auto rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`size-3.5 ${alreadyGeneratedThisWeek ? "hidden" : ""}`} />
              {alreadyGeneratedThisWeek ? "Next Analysis Available Sunday" : "Regenerate Analysis"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
