import { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { format, parseISO, addDays, subDays, isWeekend } from "date-fns"


import { getSupabaseSession } from "@/lib/supabase/session"
import { getEquityAtDate } from "@/lib/finance/equity"
import { upsertTradingDay } from "./actions"
import { SubmitButton } from "@/components/submit-button"
import { DailyJournalPanel } from "@/components/journal/daily-journal-panel"
import type { AppTradingDay } from "@/lib/dashboard-data"


export const metadata: Metadata = {
  title: "Trading Journal | Dashboard",
  description: "Your daily trading journal and AI review.",
}

export const revalidate = 0

export default async function JournalPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const params = (await searchParams) ?? {}
  const { supabase, user } = await getSupabaseSession()
  if (!user) redirect("/login")

  const selectedDateStr = params.date || format(new Date(), "yyyy-MM-dd")
  const selectedDate = parseISO(selectedDateStr)
  
  const prevDateStr = format(subDays(selectedDate, 1), "yyyy-MM-dd")
  const nextDateStr = format(addDays(selectedDate, 1), "yyyy-MM-dd")

  const { data: tradingDayData } = await supabase
    .from("trading_days")
    .select("*")
    .eq("user_id", user.id)
    .eq("date", selectedDateStr)
    .maybeSingle()

  const activeTradingDay = tradingDayData as AppTradingDay | null

  let tradesCount = 0
  let netPnl = 0
  let dayTrades: any[] = []

  if (activeTradingDay) {
    // Fetch all trades for this date
    const { data: tradesData } = await supabase
      .from("trades")
      .select(`
        id, symbol, net_pnl, created_at, trade_type,
        trade_rule_adherence ( rule_id, status ),
        trade_mistakes ( mistakes ( name ) )
      `)
      .eq("user_id", user.id)
      .eq("date", selectedDateStr)
      .order("created_at", { ascending: true })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dayTrades = (tradesData as any[])?.map((t: any) => ({
      ...t,
      result: Number(t.net_pnl) > 0 ? "WIN" : Number(t.net_pnl) < 0 ? "LOSS" : "BREAK EVEN",
      trade_mistakes: t.trade_mistakes || [],
      trade_rule_adherence: t.trade_rule_adherence || []
    })) ?? []
    tradesCount = dayTrades.length
    netPnl = (dayTrades as any[]).reduce((sum, t) => sum + Number(t.net_pnl), 0)
  }

  // Fetch TradeForm requirements
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
    getEquityAtDate(supabase, user.id, selectedDateStr)
  ])

  let aiSummary = null
  if (activeTradingDay) {
    const { data } = await supabase
      .from("daily_ai_summary")
      .select("*")
      .eq("trading_day_id", activeTradingDay.id)
      .maybeSingle()
    aiSummary = data
  }

  const settings = settingsResult.data || { default_brokerage: 0, default_tax: 0 }
  const strategies = strategiesResult.data || []
  const mistakes = mistakesResult.data || []
  const rules = rulesResult.data || []


  const isPastDate = selectedDateStr < format(new Date(), "yyyy-MM-dd")
  const isWeekendDay = isWeekend(selectedDate)
  const isLocked = isPastDate || isWeekendDay

  return (
    <div className="space-y-6">
      <DateHeader selectedDate={selectedDate} prevDateStr={prevDateStr} nextDateStr={nextDateStr} />
      
      {!activeTradingDay ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.035] py-20 text-center">
          <div className="rounded-full bg-slate-900 p-4">
            <svg
              className="size-8 text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          {isLocked ? (
            <>
              <h2 className="mt-4 text-xl font-semibold text-white">Journal Locked</h2>
              <p className="mt-2 text-sm text-slate-400 mb-6">
                {isWeekendDay 
                  ? "This date is a weekend (Market Holiday). Journal entries are locked."
                  : "This date is in the past. You can only create new journals for today or the future."
                }
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-4 text-xl font-semibold text-white">No Journal Started</h2>
              <p className="mt-2 text-sm text-slate-400 mb-6">
                Start your trading day by initiating your pre-market plan.
              </p>
              <form action={async () => {
                "use server"
                await upsertTradingDay({ date: selectedDateStr, formType: "create" })
              }}>
                <SubmitButton>Start Journal for {format(selectedDate, "d MMM")}</SubmitButton>
              </form>
            </>
          )}
        </div>
      ) : (
        <DailyJournalPanel 
          day={activeTradingDay} 
          isLocked={isLocked}
          trades={dayTrades}
          tradesCount={tradesCount} 
          netPnl={netPnl} 
          mistakes={mistakes as { id: string; name: string }[]} 
          strategies={strategies as { id: string; name: string }[]}
          rules={rules as { id: string; title: string; category: string }[]}
          settings={settings as { default_brokerage: number; default_tax: number }}
          currentEquity={currentEquity}
          aiSummary={aiSummary as { summary: string, strength: string, weakness: string } | null}
        />
      )}
    </div>
  )
}

function DateHeader({ 
  selectedDate, 
  prevDateStr, 
  nextDateStr
}: { 
  selectedDate: Date, 
  prevDateStr: string, 
  nextDateStr: string
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            {format(selectedDate, "d MMMM yyyy")}
          </h1>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Link 
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5" 
          href={`/journal?date=${prevDateStr}`}
        >
          ← Yesterday
        </Link>
        <Link 
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5" 
          href={`/journal?date=${format(new Date(), "yyyy-MM-dd")}`}
        >
          Today
        </Link>
        <Link 
          className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5" 
          href={`/journal?date=${nextDateStr}`}
        >
          Tomorrow →
        </Link>
      </div>
    </div>
  )
}
