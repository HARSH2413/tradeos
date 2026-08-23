import { Trash2 } from "lucide-react"
import { Metadata } from "next"
import { redirect } from "next/navigation"

import { createStrategy, deleteStrategy } from "@/app/(dashboard)/strategies/actions"
import { SubmitButton } from "@/components/submit-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { type AppStrategy, type AppTrade } from "@/lib/dashboard-data"
import { formatCurrency, formatPercentage } from "@/lib/formatters"
import { calculateWinRate } from "@/lib/calculations"
import { getSupabaseSession } from "@/lib/supabase/session"

export const metadata: Metadata = {
  title: "Strategies | Dashboard",
  description: "Manage your trading strategies and track their performance.",
}

export const revalidate = 30

export default async function StrategiesPage() {
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const [{ data: strategiesData }, { data: tradesData }] = await Promise.all([
    supabase.from("strategies").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("trades").select("*").eq("user_id", user.id),
  ])
  const strategies = (strategiesData ?? []) as AppStrategy[]
  const trades = (tradesData ?? []) as AppTrade[]

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-white">Strategies</h1>
      <Card className="border-white/10 bg-white/[0.035]">
        <CardHeader><CardTitle className="text-white">Add Strategy</CardTitle></CardHeader>
        <CardContent>
          <form action={createStrategy} className="grid gap-3 md:grid-cols-2">
            <Input name="name" placeholder="Strategy name" required />
            <Input name="market" placeholder="Market" />
            <Textarea name="conditions" placeholder="Conditions" />
            <Textarea name="entry_rules" placeholder="Entry rules" />
            <Textarea name="stop_loss_rules" placeholder="Stop loss rules" />
            <Textarea name="target_rules" placeholder="Target rules" />
            <Textarea name="notes" placeholder="Notes" className="md:col-span-2" />
            <SubmitButton>Save Strategy</SubmitButton>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {strategies.map((strategy) => {
          const strategyTrades = trades.filter((trade) => trade.strategy_id === strategy.id)
          const pnl = strategyTrades.reduce((sum, trade) => sum + trade.net_pnl, 0)
          return (
            <Card key={strategy.id} className="border-white/10 bg-white/[0.035]">
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-white">{strategy.name}</CardTitle>
                  <p className="mt-1 text-xs text-slate-500">{strategy.market || "No market"}</p>
                </div>
                <form action={deleteStrategy}>
                  <input type="hidden" name="id" value={strategy.id} />
                  <SubmitButton size="icon-sm" variant="ghost"><Trash2 className="size-4" /></SubmitButton>
                </form>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-slate-400">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Stat label="Trades" value={String(strategyTrades.length)} />
                  <Stat label="Win Rate" value={formatPercentage(calculateWinRate(strategyTrades))} />
                  <Stat label="Net P&L" value={formatCurrency(pnl)} />
                </div>
                <p>{strategy.notes || strategy.conditions || "No notes yet."}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg bg-slate-950 p-2"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-semibold text-white">{value}</p></div>
}
