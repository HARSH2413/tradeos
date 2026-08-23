"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { getSupabaseSession } from "@/lib/supabase/session"

export async function createRule(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const { error } = await supabase.from("rules").insert({
    user_id: user.id,
    category: String(formData.get("category") ?? "entry"),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
  })
  if (error) throw new Error(error.message)
  revalidatePath("/rules")
}

export async function deleteRule(formData: FormData) {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const { error } = await supabase.from("rules").delete().eq("id", String(formData.get("id"))).eq("user_id", user.id)
  if (error) throw new Error(error.message)
  revalidatePath("/rules")
}
