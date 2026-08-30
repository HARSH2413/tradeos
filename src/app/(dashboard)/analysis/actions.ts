"use server"

import { getSupabaseSession } from "@/lib/supabase/session"
import { getLatestMarketContext } from "@/lib/market-data"

export async function generateAIAnalysis(systemPrompt: string, userPrompt: string) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) throw new Error("Not authorized")

  const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  if (!groqKey) {
    throw new Error("Groq API key is not configured on the server")
  }

  // Rate limiting logic: 1 request per minute
  const { data } = await supabase
    .from("ai_analysis")
    .select("created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const lastAnalysis = data as { created_at: string } | null

  if (lastAnalysis?.created_at) {
    const lastRun = new Date(lastAnalysis.created_at).getTime()
    const now = Date.now()
    const diffSeconds = (now - lastRun) / 1000
    if (diffSeconds < 60) {
      throw new Error(`Please wait ${Math.ceil(60 - diffSeconds)} seconds before generating another analysis.`)
    }
  }

  const marketContext = await getLatestMarketContext()
  const augmentedUserPrompt = `${userPrompt}\n\nLATEST MARKET CONTEXT (For your awareness):\n${marketContext}`

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${groqKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: augmentedUserPrompt },
      ],
      temperature: 0.4,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody?.error?.message ?? `Groq API error: ${res.status}`)
  }

  const jsonResponse = await res.json()
  return jsonResponse.choices[0].message.content
}

export async function checkGroqKey() {
  const groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY
  return !!groqKey
}
