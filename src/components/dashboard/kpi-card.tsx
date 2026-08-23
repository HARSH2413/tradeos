import type { LucideIcon } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { KpiTooltip } from "./kpi-tooltip"

export function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "neutral",
  info,
  subtext,
}: {
  title: string
  value: string
  icon: LucideIcon
  tone?: "profit" | "loss" | "neutral"
  info?: string
  subtext?: React.ReactNode
}) {
  return (
    <Card className="border-white/10 bg-white/[0.035]">
      <CardContent className="flex min-h-28 items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
              {title}
            </p>
            {info && <KpiTooltip info={info} />}
          </div>
          <p
            className={cn(
              "mt-3 break-words text-2xl font-semibold tracking-tight text-white",
              tone === "profit" && "text-emerald-300",
              tone === "loss" && "text-red-300"
            )}
          >
            {value}
          </p>
          {subtext && (
            <div className="mt-2 text-sm">
              {subtext}
            </div>
          )}
        </div>
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg border bg-white/[0.03]",
            tone === "profit" && "border-emerald-400/20 text-emerald-300",
            tone === "loss" && "border-red-400/20 text-red-300",
            tone === "neutral" && "border-white/10 text-slate-300"
          )}
        >
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  )
}

