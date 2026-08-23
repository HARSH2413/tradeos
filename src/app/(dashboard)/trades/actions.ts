"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { calculateTradeFields, toNumber, type TradeType } from "@/lib/calculations"
import { getSupabaseSession } from "@/lib/supabase/session"
import { getEquityAtDate } from "@/lib/finance/equity"
import type { Json } from "@/lib/supabase/types"

export async function createTrade(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()

  if (!user) {
    redirect("/login")
  }

  const dateStr = String(formData.get("date"))
  
  // Equity = Net Contributions + accumulated P&L at this date
  const equity = await getEquityAtDate(supabase, user.id, dateStr)
  
  const tradeType = String(formData.get("trade_type") ?? "buy") as TradeType
  const entryPrice = toNumber(formData.get("entry_price"))
  const exitPrice = toNumber(formData.get("exit_price"))
  const quantity = toNumber(formData.get("quantity"))

  if (entryPrice <= 0 || exitPrice <= 0 || quantity <= 0) {
    throw new Error("Entry price, exit price, and quantity must be greater than zero")
  }
  const brokerage = toNumber(formData.get("brokerage"))
  const taxes = toNumber(formData.get("taxes"))
  const strategyId = String(formData.get("strategy_id") ?? "")
  const reviewScore = toNumber(formData.get("trade_review_score"))
  const rawCapitalUsed = formData.get("capital_used")
  const capitalUsedOverride = rawCapitalUsed ? toNumber(rawCapitalUsed) : undefined

  const calculated = calculateTradeFields({
    tradeType,
    entryPrice,
    exitPrice,
    quantity,
    brokerage,
    taxes,
    equity,
    capitalUsedOverride,
  })

  const tradeData = {
    user_id: user.id,
    strategy_id: strategyId || null,
    date: dateStr,
    symbol: String(formData.get("symbol") ?? "").trim().toUpperCase(),
    trade_type: tradeType,
    entry_price: entryPrice,
    exit_price: exitPrice,
    quantity,
    notional_value: calculated.notionalValue,
    brokerage,
    taxes,
    capital_used: calculated.capitalUsed,
    capital_used_percent: calculated.capitalUsedPercent,
    gross_pnl: calculated.grossPnl,
    net_pnl: calculated.netPnl,
    trade_return_percent: calculated.tradeReturnPercent,
    trade_review_score: reviewScore || null,
    notes: String(formData.get("notes") ?? ""),
  }

  const mistakeIds = formData
    .getAll("mistake_ids")
    .map(String)
    .filter(Boolean)

  const ruleAdherenceInserts: { rule_id: string; status: "followed" | "broken" }[] = []
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("rule_adherence_") && (value === "followed" || value === "broken")) {
      ruleAdherenceInserts.push({
        rule_id: key.replace("rule_adherence_", ""),
        status: value as "followed" | "broken",
      })
    }
  }

  // Check for an existing journal — do NOT auto-create it
  const { data: existingDay } = await supabase
    .from("trading_days")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", tradeData.date)
    .maybeSingle()

  if (!existingDay) {
    // Return a flag instead of silently creating a row.
    return { needsJournal: true, trade: null }
  }

  const { data: tradeId, error } = await supabase.rpc("insert_trade_atomic", {
    p_trade_data: tradeData as unknown as Json,
    p_mistake_ids: mistakeIds,
    p_rule_adherences: ruleAdherenceInserts as unknown as Json,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (tradeId) {
    const dayId = (existingDay as { id: string }).id
    await supabase.from("trades").update({ trading_day_id: dayId }).eq("id", tradeId)
  }

  revalidatePath("/dashboard")
  revalidatePath("/trades")
  revalidatePath("/calendar")
  revalidatePath("/journal")

  return { needsJournal: false, trade: tradeId }
}

export async function deleteTrade(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()

  if (!user) {
    redirect("/login")
  }

  const id = String(formData.get("id") ?? "")
  const { error } = await supabase
    .from("trades")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath("/dashboard")
  revalidatePath("/trades")
  revalidatePath("/calendar")
  revalidatePath("/journal")
}

export async function updateTrade(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()

  if (!user) {
    redirect("/login")
  }

  const id = String(formData.get("id"))
  if (!id) throw new Error("Missing trade ID")

  const dateStr = String(formData.get("date"))

  // Equity = Net Contributions + accumulated P&L at this date
  const equity = await getEquityAtDate(supabase, user.id, dateStr)
  
  const tradeType = String(formData.get("trade_type") ?? "buy") as TradeType
  const entryPrice = toNumber(formData.get("entry_price"))
  const exitPrice = toNumber(formData.get("exit_price"))
  const quantity = toNumber(formData.get("quantity"))

  if (entryPrice <= 0 || exitPrice <= 0 || quantity <= 0) {
    throw new Error("Entry price, exit price, and quantity must be greater than zero")
  }
  const brokerage = toNumber(formData.get("brokerage"))
  const taxes = toNumber(formData.get("taxes"))
  const strategyId = String(formData.get("strategy_id") ?? "")
  const reviewScore = toNumber(formData.get("trade_review_score"))
  const rawCapitalUsed = formData.get("capital_used")
  const capitalUsedOverride = rawCapitalUsed ? toNumber(rawCapitalUsed) : undefined

  const calculated = calculateTradeFields({
    tradeType,
    entryPrice,
    exitPrice,
    quantity,
    brokerage,
    taxes,
    equity,
    capitalUsedOverride,
  })

  const tradeData = {
    user_id: user.id,
    strategy_id: strategyId || null,
    date: dateStr,
    symbol: String(formData.get("symbol") ?? "").trim().toUpperCase(),
    trade_type: tradeType,
    entry_price: entryPrice,
    exit_price: exitPrice,
    quantity,
    notional_value: calculated.notionalValue,
    brokerage,
    taxes,
    capital_used: calculated.capitalUsed,
    capital_used_percent: calculated.capitalUsedPercent,
    gross_pnl: calculated.grossPnl,
    net_pnl: calculated.netPnl,
    trade_return_percent: calculated.tradeReturnPercent,
    trade_review_score: reviewScore || null,
    notes: String(formData.get("notes") ?? ""),
  }

  const mistakeIds = formData
    .getAll("mistake_ids")
    .map(String)
    .filter(Boolean)

  const ruleAdherenceInserts: { rule_id: string; status: "followed" | "broken" }[] = []
  
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("rule_adherence_") && (value === "followed" || value === "broken")) {
      ruleAdherenceInserts.push({
        rule_id: key.replace("rule_adherence_", ""),
        status: value as "followed" | "broken",
      })
    }
  }

  // Check for an existing journal — do NOT auto-create it
  const { data: existingDay } = await supabase
    .from("trading_days")
    .select("id")
    .eq("user_id", user.id)
    .eq("date", tradeData.date)
    .maybeSingle()

  if (!existingDay) {
    // Return a flag instead of silently creating a row.
    return { needsJournal: true, trade: null }
  }

  const { error } = await supabase.rpc("update_trade_atomic", {
    p_trade_id: id,
    p_trade_data: tradeData as unknown as Json,
    p_mistake_ids: mistakeIds,
    p_rule_adherences: ruleAdherenceInserts as unknown as Json,
  })

  if (error) {
    throw new Error(error.message)
  }

  if (existingDay) {
    const dayId = (existingDay as { id: string }).id
    await supabase.from("trades").update({ trading_day_id: dayId }).eq("id", id)
  }

  revalidatePath("/dashboard")
  revalidatePath("/trades")
  revalidatePath("/calendar")
  revalidatePath("/journal")

  return { needsJournal: false, trade: id }
}
