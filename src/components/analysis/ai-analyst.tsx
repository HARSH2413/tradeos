"use client"

import { useState, useEffect } from "react"
import { Sparkles, RefreshCw, AlertTriangle, Brain } from "lucide-react"
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

function buildPrompts(
  trades: TradeRow[],
  strategies: StrategyRow[],
  rules: RuleRow[],
  mistakes: MistakeRow[],
  currentEquity: number
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

  // All trades table (newest first, cap at 100 for token limits)
  const tradesToShow = trades.slice(0, 100)
  const tradeLines = tradesToShow
    .map((t) => {
      const mistakeNames = (t.trade_mistakes ?? []).map((m) => mistakeMap[m.mistake_id] ?? m.mistake_id).join(", ") || "None"
      return `  ${t.date} | ${t.symbol} | ${t.trade_type.toUpperCase()} | Entry: ${t.entry_price} | Exit: ${t.exit_price} | Qty: ${t.quantity} | Capital: ${fmt(t.capital_used)} | Net P&L: ${fmt(t.net_pnl)} | Trade Return: ${t.trade_return_percent.toFixed(2)}% | Strategy: ${t.strategies?.name ?? "None"} | Mistakes: ${mistakeNames} | Score: ${t.trade_review_score ?? "—"}`
    })
    .join("\n")

  const systemPrompt = `You are an expert trading coach and performance analyst specialising in Indian F&O markets (NIFTY, BANKNIFTY). Analyse the trader's data and give honest, specific, actionable feedback. Never be vague. Always reference specific numbers from their data. Format your response in clean markdown with these exact sections.`

  const userPrompt = `Here is my complete trading data. Analyse it and give me a full performance review.

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

Please analyse and return ONLY these sections:

## What's working
(specific strategies, days, symbols performing well with actual numbers from my data)

## Where I'm losing money
(specific patterns in losing trades — symbol, mistake tags, strategy failures with numbers)

## My biggest weakness
(most costly mistake pattern with total rupees lost)

## Strategy performance
(rank each strategy by win rate and net P&L, note which to use more and which to stop)

## Specific suggestions
(5 concrete things to change based on my data, not generic advice — each with a reason from my actual numbers)

## This week's focus
(one single specific thing to work on based on my most recent 10 trades)`

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

// ─── Main component ────────────────────────────────────────────────────────────

export function AiAnalyst({ userId, trades, strategies, rules, mistakes, currentEquity, lastAnalysis }: Props) {
  const [analysis, setAnalysis] = useState<string | null>(lastAnalysis?.content ?? null)
  const [tradeCount, setTradeCount] = useState<number>(lastAnalysis?.trade_count ?? 0)
  const [analysisDate, setAnalysisDate] = useState<string | null>(lastAnalysis?.created_at ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState(true)

  useEffect(() => {
    checkGroqKey().then(setHasKey)
  }, [])

  const hasTrades = trades.length >= 5

  const firstDate = trades.length ? trades[trades.length - 1].date : null
  const lastDate = trades.length ? trades[0].date : null

  async function runAnalysis() {
    setLoading(true)
    setError(null)

    try {
      const { systemPrompt, userPrompt } = buildPrompts(trades, strategies, rules, mistakes, currentEquity)

      const content = await generateAIAnalysis(systemPrompt, userPrompt)

      // Save to Supabase
      const supabase = asAppSupabase(createClient())
      const { error: saveErr } = await supabase.from("ai_analysis").insert({
        user_id: userId,
        content,
        trade_count: trades.length,
      })
      if (saveErr) console.error("Failed to save analysis:", saveErr)

      setAnalysis(content)
      setTradeCount(trades.length)
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
        <div className="flex items-center gap-4">
          <button
            onClick={runAnalysis}
            disabled={loading || !hasKey}
            className="group flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/20 transition hover:from-emerald-400 hover:to-teal-400 hover:shadow-emerald-400/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw className="size-4 animate-spin" />
                Analysing your {trades.length} trades...
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
            <p className="text-xs text-slate-500">
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
              {firstDate && lastDate && (
                <>
                  {" "}from{" "}
                  <span className="text-white">{firstDate}</span>
                  {" "}to{" "}
                  <span className="text-white">{lastDate}</span>
                </>
              )}
            </p>
            <button
              onClick={runAnalysis}
              disabled={loading || !hasKey}
              className="mt-3 flex items-center gap-2 mx-auto rounded-lg border border-white/10 px-4 py-2 text-sm text-slate-400 transition hover:border-emerald-400/30 hover:text-emerald-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="size-3.5" />
              Regenerate Analysis
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
