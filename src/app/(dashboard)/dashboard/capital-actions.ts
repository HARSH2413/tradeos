"use server"

import { revalidatePath } from "next/cache"
import { getSupabaseSession } from "@/lib/supabase/session"
import { toNumber } from "@/lib/calculations"

export async function addCapitalTransaction(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) throw new Error("Not authorized")

  const transactionType = String(formData.get("transaction_type")) as "deposit" | "withdrawal"
  const amount = toNumber(formData.get("amount"))
  const dateStr = String(formData.get("date"))
  const notes = String(formData.get("notes") ?? "")

  if (amount <= 0) {
    throw new Error("Amount must be greater than zero")
  }

  // Insert the new transaction with a dummy balance_after for now
  const { error: insertError } = await supabase
    .from("capital_transactions")
    .insert({
      user_id: user.id,
      transaction_type: transactionType,
      amount,
      balance_after: 0,
      date: dateStr,
      notes: notes || null,
    })
    .select("id")
    .single()

  if (insertError) throw new Error(insertError.message)

  // Recompute all balance_after
  await recomputeCapitalBalances(user.id, supabase)

  revalidatePath("/dashboard")
}

export async function deleteCapitalTransaction(id: string) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) throw new Error("Not authorized")

  const { error } = await supabase
    .from("capital_transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) throw new Error(error.message)

  await recomputeCapitalBalances(user.id, supabase)

  revalidatePath("/dashboard")
}

import type { AppSupabase, AppCapitalTransaction } from "@/lib/dashboard-data"

/**
 * Recomputes the `balance_after` for all capital transactions.
 * Note: `balance_after` conceptually represents "Net External Contributions After Transaction".
 * It is purely deposits minus withdrawals and does NOT include trading P&L.
 * See: src/lib/financial-model.ts for definitions.
 */
async function recomputeCapitalBalances(userId: string, supabase: AppSupabase) {
  const { data } = await supabase
    .from("capital_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .order("created_at", { ascending: true })

  const transactions = (data || []) as AppCapitalTransaction[]

  if (!transactions) return

  let currentBalance = 0
  const updates = []

  for (const tx of transactions) {
    if (tx.transaction_type === "deposit") {
      currentBalance += Number(tx.amount)
    } else {
      currentBalance -= Number(tx.amount)
    }
    
    if (tx.balance_after !== currentBalance) {
      updates.push(
        supabase
          .from("capital_transactions")
          .update({ balance_after: currentBalance })
          .eq("id", tx.id)
      )
    }
  }

  if (updates.length > 0) {
    await Promise.all(updates)
  }
}
