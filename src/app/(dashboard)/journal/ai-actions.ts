"use server"

import { getSupabaseSession } from "@/lib/supabase/session"
import type { Database } from "@/lib/supabase/types"

type TradingDayRow = Database["public"]["Tables"]["trading_days"]["Row"]

type TradingDayWithRelations = TradingDayRow & {
  daily_rule_adherence?: { checked: boolean }[] | null
  trades?: {
    id: string
    symbol?: string | null
    net_pnl?: number | null
    trade_return_percent?: number | null
    trade_mistakes?: {
      mistakes?: {
        name: string
      } | null
    }[] | null
  }[] | null
}

type TradeAdherenceWithTrade = {
  status: string
  trades: { trading_day_id: string } | { trading_day_id: string }[] | null
}

type TradeMistakeWithTrade = {
  id: string
  trades: { trading_day_id: string } | { trading_day_id: string }[] | null
}

export async function calculateAndSaveDailyScores(dayId: string) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return

  // 1. Fetch day info, trades, mistakes, rule adherences
  const { data: rawDay } = await supabase
    .from("trading_days")
    .select("*, trades(id), daily_rule_adherence(checked)")
    .eq("id", dayId)
    .single()

  const day = rawDay as TradingDayWithRelations

  if (!day) return

  const { data: rawTradeAdherences } = await supabase
    .from("trade_rule_adherence")
    .select("status, trades!inner(trading_day_id)")
    .eq("trades.trading_day_id", dayId)

  const tradeAdherences = rawTradeAdherences as TradeAdherenceWithTrade[]
  
  const { data: rawTradeMistakes } = await supabase
    .from("trade_mistakes")
    .select("id, trades!inner(trading_day_id)")
    .eq("trades.trading_day_id", dayId)

  const tradeMistakes = rawTradeMistakes as TradeMistakeWithTrade[]

  // Planning Score
  let planningScore = 0
  if (day.pre_market_completed) {
    planningScore += 5
    const dailyRules = day.daily_rule_adherence || []
    if (dailyRules.length === 0) {
      planningScore += 5
    } else {
      const checkedRules = dailyRules.filter((r) => r.checked).length
      planningScore += (checkedRules / dailyRules.length) * 5
    }
  }

  // Execution Score
  let executionScore = 10
  if (tradeAdherences && tradeAdherences.length > 0) {
    const followed = tradeAdherences.filter(a => a.status === "followed").length
    executionScore = (followed / tradeAdherences.length) * 10
  }

  // Discipline Score
  let disciplineScore = (planningScore + executionScore) / 2
  const totalMistakes = tradeMistakes ? tradeMistakes.length : 0
  disciplineScore = Math.max(0, disciplineScore - totalMistakes)

  // Save scores
  await supabase
    .from("trading_days")
    .update({
      planning_score: planningScore,
      execution_score: executionScore,
      discipline_score: disciplineScore
    })
    .eq("id", dayId)
}

export async function generateDailyAISummary(dayId: string) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) return // Silent fail if no API key

  const { data: rawDay } = await supabase
    .from("trading_days")
    .select("*, trades(symbol, net_pnl, trade_return_percent, trade_mistakes(mistakes(name)))")
    .eq("id", dayId)
    .single()

  const day = rawDay as TradingDayWithRelations

  if (!day) return

  const prompt = `You are a direct, objective trading coach. Analyze this trader's day.

TRADING DAY DATA:
Date: ${day.date}
Symbol: ${day.symbol}
Market Behaviour: ${day.market_behaviour}
Plan Followed: ${day.plan_followed}
Mistake: ${day.biggest_mistake}
Achievement: ${day.biggest_achievement}
Learning: ${day.biggest_learning}
Overall Rating: ${day.overall_day_rating}/10
Reflection: ${day.reflection}
Focus for Tomorrow: ${day.tomorrow_focus}
Trades Count: ${day.trades?.length || 0}
Net PnL: ${day.trades?.reduce((sum, t) => sum + Number(t.net_pnl || 0), 0) || 0}

You MUST respond with ONLY a raw JSON object, no markdown, no code fences, no explanation. The JSON must have exactly these three keys:
{"summary": "2-3 sentences summarizing the day", "strength": "1 sentence on biggest positive", "weakness": "1 sentence on biggest area for improvement"}`

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 512,
    }),
  })

  if (!res.ok) return

  const groqData = await res.json()
  const rawContent = groqData.choices[0].message.content
  try {
    // The model may wrap JSON in markdown code fences — strip them
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    await supabase.from("daily_ai_summary").upsert({
      trading_day_id: dayId,
      user_id: user.id,
      summary: parsed.summary,
      strength: parsed.strength,
      weakness: parsed.weakness
    }, { onConflict: "trading_day_id" })
  } catch (e) {
    // Parsing error, fail silently
  }
}

