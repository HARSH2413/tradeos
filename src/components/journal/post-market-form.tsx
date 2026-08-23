"use client"

import { useTransition } from "react"
import { Check, X, Loader2 } from "lucide-react"

import type { AppTradingDay } from "@/lib/dashboard-data"
import type { JournalTrade } from "@/components/journal/journal-trades-list"
import { upsertTradingDay } from "@/app/(dashboard)/journal/actions"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

function calculateDailyRuleAdherence(
  trades: JournalTrade[],
  rules: { id: string; title: string; category: string }[]
) {
  const evaluatedRules = new Map<string, { title: string, status: "followed" | "broken" }>()

  for (const trade of trades) {
    if (!trade.trade_rule_adherence) continue
    for (const ad of trade.trade_rule_adherence) {
      const rule = rules.find(r => r.id === ad.rule_id)
      if (!rule) continue

      if (!evaluatedRules.has(ad.rule_id)) {
        evaluatedRules.set(ad.rule_id, { title: rule.title, status: ad.status })
      } else {
        if (ad.status === "broken") {
          evaluatedRules.get(ad.rule_id)!.status = "broken"
        }
      }
    }
  }

  const rulesList = Array.from(evaluatedRules.values())
  const evaluatedCount = rulesList.length
  const followedCount = rulesList.filter(r => r.status === "followed").length
  const adherencePercent = evaluatedCount > 0 ? (followedCount / evaluatedCount) * 100 : 0

  return { rulesList, evaluatedCount, followedCount, adherencePercent }
}

export function PostMarketForm({ 
  day,
  trades,
  rules,
  mistakes,
  tradesCount,
  netPnl
}: { 
  day: AppTradingDay
  trades: JournalTrade[]
  rules: { id: string; title: string; category: string }[]
  mistakes: { id: string; name: string }[]
  tradesCount: number
  netPnl: number
}) {
  const [isPending, startTransition] = useTransition()

  const action = async (formData: FormData) => {
    startTransition(async () => {
      await upsertTradingDay({
        date: day.date,
        formType: 'post_market',
        fields: {
          plan_followed: formData.get("plan_followed") || null,
          biggest_mistake: formData.get("biggest_mistake") || null,
          biggest_achievement: formData.get("biggest_achievement") || null,
          biggest_learning: formData.get("biggest_learning") || null,
          tomorrow_focus: formData.get("tomorrow_focus") || null,
        }
      })
    })
  }

  const adherenceData = calculateDailyRuleAdherence(trades, rules)

  if (day.post_market_completed) {
    const mistakeName = mistakes.find(m => m.id === day.biggest_mistake)?.name || "None"
    const formattedPnl = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(netPnl)
    
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-emerald-500/10 bg-emerald-500/5 p-6 text-center">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-6">TODAY</h3>
          
          <div className="flex flex-col items-center justify-center gap-2 mb-8">
            <span className="text-xl font-medium text-white">{tradesCount} Trade{tradesCount !== 1 ? 's' : ''}</span>
            <span className={cn(
              "text-2xl font-semibold tabular-nums",
              netPnl > 0 ? "text-emerald-400" : netPnl < 0 ? "text-red-400" : "text-slate-300"
            )}>
              {netPnl > 0 ? "+" : ""}{formattedPnl} Net P&L
            </span>
          </div>

          <div className="flex flex-col gap-2 text-sm text-slate-300">
            <p>Plan: <span className="font-medium capitalize text-white">{day.plan_followed || "Not answered"}</span></p>
            <p>Mistake: <span className="font-medium text-white">{mistakeName}</span></p>
          </div>
          
          <div className="mt-8 pt-6 border-t border-emerald-500/10 flex flex-col gap-4 text-left">
            <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rule Adherence</h3>
            {adherenceData.evaluatedCount === 0 ? (
              <p className="text-sm text-slate-500 italic">No rule data for today</p>
            ) : (
              <div className="space-y-3">
                {adherenceData.rulesList.map((rule, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    {rule.status === "followed" ? (
                      <Check className="size-4 text-emerald-400 shrink-0" />
                    ) : (
                      <X className="size-4 text-red-400 shrink-0" />
                    )}
                    <span className={cn(
                      "font-medium",
                      rule.status === "followed" ? "text-slate-300" : "text-red-400"
                    )}>{rule.title}</span>
                  </div>
                ))}
                <div className="pt-2 text-sm font-medium text-slate-400 border-t border-white/5">
                  Rules Followed: {adherenceData.followedCount}/{adherenceData.evaluatedCount} &middot; {adherenceData.adherencePercent.toFixed(0)}%
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 pt-6 border-t border-emerald-500/10 flex items-center justify-center gap-2 text-emerald-400">
            <Check className="size-5" />
            <span className="font-medium">Review completed</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-8">
      
      {/* 1. Did I follow my plan? */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-slate-500">Did I follow my plan?</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          {["yes", "partially", "no"].map((val) => (
            <label key={val} className="flex-1 cursor-pointer">
              <input 
                type="radio" 
                name="plan_followed" 
                value={val} 
                defaultChecked={day.plan_followed === val} 
                className="peer sr-only" 
              />
              <div className="rounded-lg border border-white/10 bg-slate-950 p-4 text-center text-sm font-medium text-slate-400 uppercase tracking-wider transition hover:bg-white/5 peer-checked:border-emerald-500/50 peer-checked:bg-emerald-500/10 peer-checked:text-emerald-400">
                {val}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 2. Rule Adherence (Read-Only) */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-slate-500">Rule Adherence</h3>
        <div className="rounded-xl border border-white/10 bg-slate-950 p-6">
          {adherenceData.evaluatedCount === 0 ? (
            <p className="text-sm text-slate-500 italic">No rule data for today</p>
          ) : (
            <div className="space-y-3">
              {adherenceData.rulesList.map((rule, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  {rule.status === "followed" ? (
                    <Check className="size-4 text-emerald-400 shrink-0" />
                  ) : (
                    <X className="size-4 text-red-400 shrink-0" />
                  )}
                  <span className={cn(
                    "font-medium",
                    rule.status === "followed" ? "text-slate-300" : "text-red-400"
                  )}>{rule.title}</span>
                </div>
              ))}
              <div className="pt-3 mt-3 border-t border-white/5 text-sm font-medium text-slate-400">
                Rules Followed: {adherenceData.followedCount}/{adherenceData.evaluatedCount} &middot; {adherenceData.adherencePercent.toFixed(0)}%
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Biggest Mistake */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-slate-500">What was my biggest mistake today?</h3>
        <select
          name="biggest_mistake"
          defaultValue={day.biggest_mistake || ""}
          className="w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        >
          <option value="">None (No mistake)</option>
          {mistakes.map((mistake) => (
            <option key={mistake.id} value={mistake.id}>
              {mistake.name}
            </option>
          ))}
        </select>
      </div>

      {/* 4. Best thing I did */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-slate-500">Best thing I did</h3>
        <Input 
          name="biggest_achievement" 
          defaultValue={day.biggest_achievement || ""} 
          placeholder="I waited for confirmation before entering..." 
        />
      </div>

      {/* 5. Biggest lesson */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-slate-500">Biggest lesson</h3>
        <Input 
          name="biggest_learning" 
          defaultValue={day.biggest_learning || ""} 
          placeholder="Don't enter before the pullback confirms." 
        />
      </div>

      {/* 6. Tomorrow's focus */}
      <div className="space-y-4">
        <h3 className="text-xs font-medium text-slate-500">Tomorrow's focus</h3>
        <Input 
          name="tomorrow_focus" 
          defaultValue={day.tomorrow_focus || ""} 
          placeholder="Only take A+ setups." 
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-white/5">
        <SubmitButton className="w-full sm:w-auto">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Complete Review
        </SubmitButton>
      </div>
    </form>
  )
}
