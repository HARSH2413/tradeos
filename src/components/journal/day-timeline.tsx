import { CheckCircle2, Circle, Clock } from "lucide-react"

import type { AppTradingDay } from "@/lib/dashboard-data"
import { cn } from "@/lib/utils"

export function DayTimeline({ day, tradesCount, netPnl }: { day: AppTradingDay, tradesCount: number, netPnl: number }) {
  
  const steps = [
    {
      label: "Pre-Market Planned",
      status: day.pre_market_completed ? "done" : "pending",
      detail: day.pre_market_completed ? "Completed" : "Action required",
    },
    {
      label: "Trades Executed",
      status: tradesCount > 0 ? "done" : "pending",
      detail: tradesCount > 0 ? `${tradesCount} trades logged` : "No trades logged",
      extra: tradesCount > 0 ? `Net: ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(netPnl)}` : undefined,
    },
    {
      label: "Post-Market Reviewed",
      status: day.post_market_completed ? "done" : tradesCount > 0 ? "pending" : "upcoming",
      detail: day.post_market_completed ? "Completed" : tradesCount > 0 ? "Action required" : "Waiting for trades",
    },
    {
      label: "AI Summary",
      status: "upcoming", // Fixed for now until Phase 5
      detail: "Not generated",
    }
  ]

  return (
    <div className="flex flex-col space-y-4">
      {steps.map((step, idx) => {
        const isLast = idx === steps.length - 1
        
        return (
          <div key={idx} className="relative flex gap-4">
            {!isLast && (
              <div className="absolute left-2.5 top-6 h-full w-px -translate-x-1/2 bg-white/10" />
            )}
            
            <div className="relative z-10 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-950">
              {step.status === "done" ? (
                <CheckCircle2 className="size-5 text-emerald-500" />
              ) : step.status === "pending" ? (
                <Clock className="size-5 text-amber-500" />
              ) : (
                <Circle className="size-5 text-slate-700" />
              )}
            </div>
            
            <div className="pb-4">
              <p className={cn(
                "text-sm font-medium",
                step.status === "done" ? "text-slate-200" :
                step.status === "pending" ? "text-amber-200" : "text-slate-500"
              )}>
                {step.label}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="text-xs text-slate-400">{step.detail}</p>
                {step.extra && (
                  <>
                    <span className="text-slate-600">·</span>
                    <p className={cn("text-xs font-medium", netPnl >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {step.extra}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
