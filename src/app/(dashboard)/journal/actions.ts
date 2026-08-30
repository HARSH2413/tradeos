"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSupabaseSession } from "@/lib/supabase/session"
import { calculateAndSaveDailyScores, generateDailyAISummary } from "./ai-actions"

type FormType = 'create' | 'pre_market' | 'post_market';

export interface UpsertTradingDayInput {
  date: string;           // 'YYYY-MM-DD'
  formType: FormType;
  fields?: Record<string, unknown>;
}

export async function upsertTradingDay(input: UpsertTradingDayInput) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const patch: Record<string, unknown> = { ...input.fields, updated_at: new Date().toISOString() };

  if (input.formType === 'pre_market') {
    patch.pre_market_completed = true;
  }
  if (input.formType === 'post_market') {
    patch.post_market_completed = true;
  }

  const { data, error } = await supabase
    .from("trading_days")
    .upsert(
      {
        user_id: user.id,
        date: input.date,
        ...patch,
      },
      { onConflict: "user_id,date" }
    )
    .select()
    .single();

  if (error) {
    throw new Error(error.message)
  }

  let aiError = null;
  // Phase 4: Run Post-Market scoring and AI summary if this is a post_market submission
  if (input.formType === 'post_market') {
    const dayData = data as { id: string }
    await calculateAndSaveDailyScores(dayData.id)
    const result = await generateDailyAISummary(dayData.id)
    if (result && !result.success) {
      aiError = result.error
    }
  }

  revalidatePath("/journal")
  revalidatePath("/dashboard")
  revalidatePath("/calendar")

  return { data, aiError };
}

export async function toggleDailyRuleAdherence(date: string, ruleId: string, checked: boolean) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const { error } = await supabase
    .from("daily_rule_adherence")
    .upsert(
      {
        user_id: user.id,
        date: date,
        rule_id: ruleId,
        checked: checked,
      },
      { onConflict: "user_id,date,rule_id" }
    )

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/journal")
}
