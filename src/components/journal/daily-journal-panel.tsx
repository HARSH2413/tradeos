"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Lock, Plus } from "lucide-react"

import { PreMarketForm } from "@/components/journal/pre-market-form"
import { PostMarketForm } from "@/components/journal/post-market-form"
import { JournalTradesList, type JournalTrade } from "@/components/journal/journal-trades-list"
import { TradeForm } from "@/components/trades/trade-form"
import { computeStatus } from "@/lib/journal/computeStatus"
import type { AppTradingDay } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

function CollapsibleSection({
  title,
  defaultOpen,
  locked,
  disabled,
  disabledReason,
  children,
}: {
  title: string
  defaultOpen: boolean
  locked?: boolean
  disabled?: boolean
  disabledReason?: string
  children: React.ReactNode
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.035] overflow-hidden">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          "flex w-full items-center justify-between p-4 text-left transition-colors",
          disabled ? "cursor-not-allowed opacity-50" : "hover:bg-white/5"
        )}
      >
        <div className="flex items-center gap-3">
          {isOpen ? <ChevronDown className="size-5 text-slate-400" /> : <ChevronRight className="size-5 text-slate-400" />}
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          {locked && <Lock className="size-4 text-slate-500" />}
        </div>
        {disabled && disabledReason && (
          <span className="text-sm text-amber-400/80">{disabledReason}</span>
        )}
      </button>
      {isOpen && !disabled && (
        <div className="p-4 border-t border-white/10">
          {children}
        </div>
      )}
    </div>
  )
}

export function DailyJournalPanel({
  day,
  trades,
  tradesCount,
  netPnl,
  mistakes,
  strategies,
  rules,
  dailyAdherences,
  aiSummary,
  settings,
  currentEquity,
}: {
  day: AppTradingDay
  trades: JournalTrade[]
  tradesCount: number
  netPnl: number
  mistakes: { id: string; name: string }[]
  strategies: { id: string; name: string }[]
  rules: { id: string; title: string; category: string }[]
  dailyAdherences: { rule_id: string; checked: boolean }[]
  aiSummary: { summary: string, strength: string, weakness: string } | null
  settings: { default_brokerage: number; default_tax: number }
  currentEquity: number
}) {
  const status = computeStatus({
    pre_market_completed: day.pre_market_completed,
    post_market_completed: day.post_market_completed,
    hasTrades: tradesCount > 0,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="text-xl font-semibold text-white">Daily Journal</h2>
        <span className="rounded-full border border-white/10 bg-slate-900 px-3 py-1 text-xs font-medium uppercase tracking-wider text-slate-300">
          {status}
        </span>
      </div>

      <CollapsibleSection
        title="1. Pre-Market Plan"
        defaultOpen={!day.pre_market_completed}
      >
        <PreMarketForm day={day} />
      </CollapsibleSection>

      <div className="rounded-xl border border-white/10 bg-white/[0.035] p-6">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-300">2. Trade Execution</h2>
          <TradeForm
            equityForPreview={currentEquity}
            defaultBrokerage={settings.default_brokerage}
            defaultTax={settings.default_tax}
            strategies={strategies}
            mistakes={mistakes}
            rules={rules}
            defaultDate={day.date}
            trigger={
              <button className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-emerald-400 transition hover:bg-white/10">
                <Plus className="size-3.5" /> Log Trade
              </button>
            }
          />
        </div>
        <JournalTradesList trades={trades} />
      </div>

      <CollapsibleSection
        title="3. Post-Market Review"
        defaultOpen={status === "reviewing"}
        disabled={tradesCount === 0}
        disabledReason="Log at least one trade today to unlock the review section"
      >
        <PostMarketForm 
          day={day} 
          trades={trades}
          rules={rules}
          mistakes={mistakes} 
          tradesCount={tradesCount} 
          netPnl={netPnl} 
        />
      </CollapsibleSection>

      {day.post_market_completed && (
        <div className="grid gap-6">
          {/* AI Analyst Review */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] p-6 flex flex-col relative overflow-hidden">
            <div className="absolute top-0 right-0 p-32 bg-emerald-500/10 blur-[100px] pointer-events-none rounded-full" />
            
            <div className="flex items-center gap-2 mb-6">
              <div className="rounded-md bg-emerald-500/20 p-2 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
              </div>
              <h2 className="font-semibold text-emerald-400">AI Analyst Review</h2>
            </div>
            
            {aiSummary ? (
              <div className="space-y-4 text-sm relative z-10 flex-1 flex flex-col justify-between">
                <p className="text-slate-300 leading-relaxed italic border-l-2 border-emerald-500/30 pl-4">{aiSummary.summary}</p>
                <div className="grid gap-3 sm:grid-cols-2 mt-4">
                  <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                    <p className="text-xs font-semibold text-emerald-400 mb-1 uppercase tracking-wider">Top Strength</p>
                    <p className="text-emerald-100/70">{aiSummary.strength}</p>
                  </div>
                  <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                    <p className="text-xs font-semibold text-rose-400 mb-1 uppercase tracking-wider">Top Weakness</p>
                    <p className="text-rose-100/70">{aiSummary.weakness}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-center relative z-10 text-slate-400">
                <svg className="size-8 mb-3 opacity-50" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <p>No AI analysis generated for this day.</p>
                <p className="text-xs mt-1">Make sure you have logged trades before finishing your review.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
