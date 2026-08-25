"use client"

import { useTransition, useState } from "react"
import { Check, ChevronDown, ChevronUp, Loader2 } from "lucide-react"

import type { AppTradingDay } from "@/lib/dashboard-data"
import { upsertTradingDay } from "@/app/(dashboard)/journal/actions"
import { SubmitButton } from "@/components/submit-button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export function PreMarketForm({ 
  day,
  isLocked
}: { 
  day: AppTradingDay
  isLocked?: boolean
}) {
  const [isOpen, setIsOpen] = useState(!day.pre_market_completed)
  const [isPending, startTransition] = useTransition()

  const action = async (formData: FormData) => {
    startTransition(async () => {
      const pdh = formData.get("pdh") ? Number(formData.get("pdh")) : null;
      const pdl = formData.get("pdl") ? Number(formData.get("pdl")) : null;
      const support = formData.get("support") ? Number(formData.get("support")) : null;
      const resistance = formData.get("resistance") ? Number(formData.get("resistance")) : null;

      await upsertTradingDay({
        date: day.date,
        formType: 'pre_market',
        fields: {
          market_bias: formData.get("market_bias") || null,
          pdh,
          pdl,
          support,
          resistance,
          plan_setup: formData.get("plan_setup") || null,
          plan_avoid: formData.get("plan_avoid") || null,
        }
      })
      setIsOpen(false)
    })
  }

  if (!isOpen) {
    return (
      <div 
        onClick={() => setIsOpen(true)}
        className="flex cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-emerald-500/30 hover:bg-white/[0.05]"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-semibold uppercase tracking-wider text-slate-300 text-sm">Pre-Market Plan</h2>
          {day.pre_market_completed && (
            <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
              <Check className="size-3" /> Completed
            </span>
          )}
        </div>
        <ChevronDown className="size-5 text-slate-500" />
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Pre-Market Plan</h2>
        {day.pre_market_completed && (
          <button onClick={() => setIsOpen(false)} type="button" className="text-slate-500 hover:text-slate-300">
            <ChevronUp className="size-5" />
          </button>
        )}
      </div>

      <form action={action} className="space-y-8">
        
        {/* Section 1: Market Bias */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-slate-500">Market Bias</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            {["bullish", "bearish", "neutral"].map((bias) => (
              <label 
                key={bias} 
                className={cn("flex-1", isLocked ? "cursor-not-allowed opacity-70" : "cursor-pointer")}
              >
                <input 
                  type="radio" 
                  name="market_bias" 
                  value={bias} 
                  defaultChecked={day.market_bias === bias} 
                  disabled={isLocked}
                  className="peer sr-only" 
                />
                <div className="rounded-lg border border-white/10 bg-slate-950 p-4 text-center text-sm font-medium text-slate-400 uppercase tracking-wider transition peer-checked:border-emerald-500/50 peer-checked:bg-emerald-500/10 peer-checked:text-emerald-400">
                  {bias}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Section 2: Key Levels */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-slate-500">Key Levels</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">PDH (Previous Day High)</label>
              <Input type="number" step="0.05" name="pdh" defaultValue={day.pdh ?? ""} placeholder="e.g. 24500.50" disabled={isLocked} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">PDL (Previous Day Low)</label>
              <Input type="number" step="0.05" name="pdl" defaultValue={day.pdl ?? ""} placeholder="e.g. 24200.00" disabled={isLocked} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Support</label>
              <Input type="number" step="0.05" name="support" defaultValue={day.support ?? ""} placeholder="e.g. 24350" disabled={isLocked} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-400">Resistance</label>
              <Input type="number" step="0.05" name="resistance" defaultValue={day.resistance ?? ""} placeholder="e.g. 24600" disabled={isLocked} />
            </div>
          </div>
        </div>

        {/* Section 3: Setup */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-slate-500">What setup am I waiting for?</h3>
          <Textarea 
            name="plan_setup" 
            defaultValue={day.plan_setup || ""} 
            placeholder="NIFTY pullback to demand + confirmation..." 
            className="min-h-[80px]" 
            disabled={isLocked}
          />
        </div>

        {/* Section 4: Avoid */}
        <div className="space-y-4">
          <h3 className="text-xs font-medium text-slate-500">What am I refusing to do today?</h3>
          <Textarea 
            name="plan_avoid" 
            defaultValue={day.plan_avoid || ""} 
            placeholder="No FOMO. No revenge trade. Max 2 trades." 
            className="min-h-[80px]" 
            disabled={isLocked}
          />
        </div>

        {!isLocked && (
          <div className="flex justify-end pt-4 border-t border-white/5">
            <SubmitButton className="w-full sm:w-auto">
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
              {day.pre_market_completed ? "Update Pre-Market Plan" : "Save Plan"}
            </SubmitButton>
          </div>
        )}

      </form>
    </div>
  )
}
