"use server"

import { getSupabaseSession } from "@/lib/supabase/session"

export async function calculateAndSaveDailyScores(dayId: string) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return

  // 1. Fetch day info, trades, mistakes, rule adherences
  const { data: rawDay } = await supabase
    .from("trading_days")
    .select("*, trades(id), daily_rule_adherence(checked)")
    .eq("id", dayId)
    .single()

  const day = rawDay as any

  if (!day) return

  const { data: rawTradeAdherences } = await supabase
    .from("trade_rule_adherence")
    .select("status, trades!inner(trading_day_id)")
    .eq("trades.trading_day_id", dayId)

  const tradeAdherences = rawTradeAdherences as any[]
  
  const { data: rawTradeMistakes } = await supabase
    .from("trade_mistakes")
    .select("id, trades!inner(trading_day_id)")
    .eq("trades.trading_day_id", dayId)

  const tradeMistakes = rawTradeMistakes as any[]

  // Planning Score
  let planningScore = 0
  if (day.pre_market_completed) {
    planningScore += 5
    const dailyRules = day.daily_rule_adherence || []
    if (dailyRules.length === 0) {
      planningScore += 5
    } else {
      const checkedRules = dailyRules.filter((r: any) => r.checked).length
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

  const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!groqKey) return // Silent fail if no API key

  const { data: rawDay } = await supabase
    .from("trading_days")
    .select("*, trades(symbol, net_pnl, trade_return_percent, trade_mistakes(mistakes(name)))")
    .eq("id", dayId)
    .single()

  const day = rawDay as any

  if (!day) return

  const prompt = `
You are a direct, objective trading coach. Analyze this trader's day and provide a structured JSON response.

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
Net PnL: ${day.trades?.reduce((sum: number, t: any) => sum + Number(t.net_pnl), 0) || 0}

OUTPUT REQUIRED (Strict JSON):
{
  "summary": "2-3 sentences summarizing the day's performance based on their reflection and PnL.",
  "strength": "1 sentence highlighting their biggest achievement or positive behaviour.",
  "weakness": "1 sentence highlighting their biggest mistake or area for improvement."
}
`

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      response_format: { type: "json_object" }
    }),
  })

  if (!res.ok) return

  const groqData = await res.json()
  const content = groqData.choices[0].message.content
  try {
    const parsed = JSON.parse(content)
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

