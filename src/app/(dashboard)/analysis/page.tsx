import { Metadata } from "next"
import { redirect } from "next/navigation"

import { AiAnalyst } from "@/components/analysis/ai-analyst"
import { getSupabaseSession } from "@/lib/supabase/session"
import { getEquityAtDate } from "@/lib/finance/equity"
import { format } from "date-fns"

export const metadata: Metadata = {
  title: "AI Trade Analyst | Dashboard",
  description: "Get an AI-powered analysis of your trading performance using your real trade data.",
}

export default async function AnalysisPage() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  // Fetch all required data server-side and pass to client component
  const [tradesResult, strategiesResult, rulesResult, mistakesResult, lastAnalysisResult, currentEquity] =
    await Promise.all([
      supabase
        .from("trades")
        .select("id,date,symbol,trade_type,entry_price,exit_price,quantity,capital_used,net_pnl,trade_return_percent,trade_review_score,strategy_id,strategies(name),trade_mistakes(mistake_id)")
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
      supabase.from("strategies").select("id,name").eq("user_id", user.id),
      supabase.from("rules").select("category,title").eq("user_id", user.id).order("category"),
      supabase.from("mistakes").select("id,name"),
      supabase
        .from("ai_analysis")
        .select("id,content,trade_count,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      getEquityAtDate(supabase, user.id, format(new Date(), "yyyy-MM-dd"))
    ])

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">AI Powered</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Trade Analyst</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Get an honest, specific, data-driven analysis of your trading. Powered by GPT-OSS 120B via Groq.
        </p>
      </div>

      {/* startingCapital is a legacy client-side fallback — see financial-model.ts */}
      <AiAnalyst
        userId={user.id}
        trades={(tradesResult.data ?? []) as TradeRow[]}
        strategies={(strategiesResult.data ?? []) as StrategyRow[]}
        rules={(rulesResult.data ?? []) as RuleRow[]}
        mistakes={(mistakesResult.data ?? []) as MistakeRow[]}
        currentEquity={currentEquity as number}
        lastAnalysis={(lastAnalysisResult.data as LastAnalysis | null) ?? null}
      />
    </div>
  )
}

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
