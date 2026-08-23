import { redirect } from "next/navigation"

import { isSupabaseConfigured } from "@/lib/supabase/config"
import { getSupabaseSession } from "@/lib/supabase/session"

export default async function Home() {
  if (!isSupabaseConfigured()) {
    redirect("/login")
  }

  const { user } = await getSupabaseSession()

  redirect(user ? "/dashboard" : "/login")
}
