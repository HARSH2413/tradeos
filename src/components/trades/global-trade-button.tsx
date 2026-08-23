import { Plus } from "lucide-react"
import { getSupabaseSession } from "@/lib/supabase/session"
import { TradeForm } from "@/components/trades/trade-form"
import { getEquityAtDate } from "@/lib/finance/equity"
import { format } from "date-fns"

export async function GlobalTradeButton() {
  const { supabase, user } = await getSupabaseSession()
  
  if (!user) return null

  const [settingsResult, strategiesResult, mistakesResult, rulesResult, currentEquity] = await Promise.all([
    supabase
      .from("settings")
      .select("default_brokerage,default_tax")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("strategies")
      .select("id,name")
      .eq("user_id", user.id)
      .order("name", { ascending: true }),
    supabase.from("mistakes").select("id,name").order("name", { ascending: true }),
    supabase.from("rules").select("id,title,category").eq("user_id", user.id).order("created_at", { ascending: false }),
    getEquityAtDate(supabase, user.id, format(new Date(), "yyyy-MM-dd"))
  ])

  const settings = (settingsResult.data as { default_brokerage: number; default_tax: number } | null) || { default_brokerage: 0, default_tax: 0 }
  const strategies = (strategiesResult.data as { id: string; name: string }[] | null) || []
  const mistakes = (mistakesResult.data as { id: string; name: string }[] | null) || []
  const rules = (rulesResult.data as { id: string; title: string; category: string }[] | null) || []

  return (
    <TradeForm
      equityForPreview={currentEquity}
      defaultBrokerage={settings.default_brokerage}
      defaultTax={settings.default_tax}
      strategies={strategies}
      mistakes={mistakes}
      rules={rules}
      trigger={
        <button className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-medium text-slate-950 transition hover:bg-emerald-400">
          <Plus className="size-4" />
          <span className="hidden sm:inline">Log Trade</span>
        </button>
      }
    />
  )
}
