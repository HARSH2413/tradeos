import { cache } from "react"

import { asAppSupabase } from "@/lib/dashboard-data"
import { createClient } from "@/lib/supabase/server"

export const getSupabaseSession = cache(async () => {
  const supabase = asAppSupabase(await createClient())
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
})