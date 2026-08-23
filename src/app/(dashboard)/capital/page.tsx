import { Metadata } from "next"
import { redirect } from "next/navigation"

import { getSupabaseSession } from "@/lib/supabase/session"
import { CapitalLedgerContent } from "./capital-ledger-content"

export const metadata: Metadata = {
  title: "Capital Ledger | TradeOS",
  description: "Manage your trading capital and funding.",
}

export const revalidate = 0

export default async function CapitalPage() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const { data: stats } = await supabase.rpc("get_dashboard_stats", { p_user_id: user.id })
  
  // Financial model terms — see src/lib/financial-model.ts
  const statsData = stats as Record<string, any> | null
  const equity = statsData?.equity || 0
  const netContributions = statsData?.net_contributions || 0

  const { data: capitalTxs } = await supabase
    .from("capital_transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white">Capital Ledger</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your funding, deposits, and withdrawals.</p>
      </div>

      <CapitalLedgerContent 
        equity={equity}
        netContributions={netContributions} 
        transactions={(capitalTxs as any as import("@/lib/dashboard-data").AppCapitalTransaction[]) || []} 
      />
    </div>
  )
}
