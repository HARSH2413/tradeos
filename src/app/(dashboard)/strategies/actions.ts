"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSupabaseSession } from "@/lib/supabase/session"

export async function createStrategy(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const { error } = await supabase.from("strategies").insert({
    user_id: user.id,
    name: String(formData.get("name") ?? ""),
    market: String(formData.get("market") ?? ""),
    conditions: String(formData.get("conditions") ?? ""),
    entry_rules: String(formData.get("entry_rules") ?? ""),
    stop_loss_rules: String(formData.get("stop_loss_rules") ?? ""),
    target_rules: String(formData.get("target_rules") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  })
  if (error) throw new Error(error.message)
  revalidatePath("/strategies")
}

export async function deleteStrategy(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const { error } = await supabase.from("strategies").delete().eq("id", String(formData.get("id"))).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/strategies")
}
