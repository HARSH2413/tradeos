"use server"

import { getSupabaseSession } from "@/lib/supabase/session"
import type { AppTradingDay } from "@/lib/dashboard-data"
import { z } from "zod"

const AISummarySchema = z.object({
  summary: z.string(),
  strength: z.string(),
  weakness: z.string()
})

type TradingDayWithRelations = AppTradingDay & {
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
      const checkedRules = dailyRules.filter((r: { checked: boolean }) => r.checked).length
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
  if (!user) return { success: false, error: "Not authorized" }

  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    console.warn("AI Analysis skipped: GROQ_API_KEY is not configured on the server.")
    return { success: false, error: "AI configuration missing. Analysis unavailable." }
  }

  const { data: rawDay, error: fetchError } = await supabase
    .from("trading_days")
    .select("*, trades(symbol, net_pnl, trade_return_percent, trade_mistakes(mistakes(name)))")
    .eq("id", dayId)
    .single()

  if (fetchError || !rawDay) {
    console.error("Failed to fetch trading day for AI:", fetchError)
    return { success: false, error: "Could not retrieve trading day data." }
  }

  const day = rawDay as TradingDayWithRelations

  const prompt = `You are a direct, objective trading coach. Analyze this trader's day.

TRADING DAY DATA:
Date: ${day.date}
Symbol: ${day.trades?.[0]?.symbol || "Multiple/None"}
Market Behaviour: ${day.market_behaviour}
Plan Followed: ${day.plan_followed}
Mistake: ${day.biggest_mistake}
Achievement: ${day.biggest_achievement}
Learning: ${day.biggest_learning}
Overall Rating: ${day.overall_day_rating}/10
Reflection: ${day.reflection}
Focus for Tomorrow: ${day.tomorrow_focus}
Trades Count: ${day.trades?.length || 0}
Net PnL: ${day.trades?.reduce((sum: number, t: { net_pnl?: number | null }) => sum + Number(t.net_pnl || 0), 0) || 0}

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

  if (!res.ok) {
    const errText = await res.text()
    console.error("Groq API error in daily summary:", errText)
    return { success: false, error: "AI service is temporarily unavailable. Please try again later." }
  }

  const groqData = await res.json()
  const rawContent = groqData.choices[0].message.content
  try {
    // The model may wrap JSON in markdown code fences — strip them
    const cleaned = rawContent.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim()
    const parsed = JSON.parse(cleaned)
    const validated = AISummarySchema.parse(parsed)
    
    const { error: dbError } = await supabase.from("daily_ai_summary").upsert({
      trading_day_id: dayId,
      user_id: user.id,
      summary: validated.summary,
      strength: validated.strength,
      weakness: validated.weakness
    }, { onConflict: "trading_day_id" })

    if (dbError) {
      console.error("Failed to save AI summary to database:", dbError)
      return { success: false, error: "Analysis generated but failed to save to database." }
    }

    return { success: true }
  } catch (e) {
    console.error("Failed to parse AI response as JSON:", e, "Raw Content:", rawContent)
    return { success: false, error: "AI generated an invalid response format. Please try again." }
  }
}

