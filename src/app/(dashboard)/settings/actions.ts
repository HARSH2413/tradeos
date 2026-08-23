"use server"

import { revalidatePath } from "next/cache"

import { getSupabaseSession } from "@/lib/supabase/session"

type ActionState = { success: boolean; error?: string; message?: string } | null;

export async function updateSettings(prevState: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase, user } = await getSupabaseSession()
  if (!user) return { success: false, error: "Not authorized" }

  const fullName = formData.get("full_name")?.toString() || ""
  const defaultBrokerage = Number(formData.get("default_brokerage") || 0)
  const defaultTax = Number(formData.get("default_tax") || 0)

  let errorMsg = ""

  try {
    const { error: profileError } = await supabase
      .from("users")
      .update({ full_name: fullName })
      .eq("id", user.id)
    if (profileError) errorMsg += profileError.message + " "
  } catch {
    throw new Error("Failed to update profile name")
  }

  try {
    const { error: settingsError } = await supabase
      .from("settings")
      .upsert({
        user_id: user.id,
        default_brokerage: defaultBrokerage,
        default_tax: defaultTax,
      }, { onConflict: 'user_id' })
    if (settingsError) errorMsg += settingsError.message
  } catch (err: unknown) {
    errorMsg += ((err as Error).message || "Unknown settings error")
  }

  revalidatePath("/settings")
  revalidatePath("/dashboard")

  if (errorMsg.trim()) {
    return { success: false, error: errorMsg.trim() }
  }

  return { success: true, message: "Settings saved successfully." }
}

export async function exportAccountData() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) throw new Error("Not authorized")

  const [trades, strategies, rules, mistakes, capitalTxs, tradingDays] = await Promise.all([
    supabase.from("trades").select("*").eq("user_id", user.id),
    supabase.from("strategies").select("*").eq("user_id", user.id),
    supabase.from("rules").select("*").eq("user_id", user.id),
    supabase.from("mistakes").select("*"),
    supabase.from("capital_transactions").select("*").eq("user_id", user.id),
    supabase.from("trading_days").select("*").eq("user_id", user.id),
  ])

  return {
    trades: trades.data || [],
    strategies: strategies.data || [],
    rules: rules.data || [],
    mistakes: mistakes.data || [],
    capital_transactions: capitalTxs.data || [],
    trading_days: tradingDays.data || [],
  }
}

export async function resetAccountData() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) throw new Error("Not authorized")

  await Promise.all([
    supabase.from("trades").delete().eq("user_id", user.id),
    supabase.from("strategies").delete().eq("user_id", user.id),
    supabase.from("rules").delete().eq("user_id", user.id),
    supabase.from("capital_transactions").delete().eq("user_id", user.id),
    supabase.from("settings").update({
      default_brokerage: 0,
      default_tax: 0,
    }).eq("user_id", user.id),
  ])

  revalidatePath("/settings")
  revalidatePath("/dashboard")
}
